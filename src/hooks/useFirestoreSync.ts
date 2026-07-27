import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, subscribeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

const DEVICE_ID_KEY = 'salon-inventory-device-id'

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

async function pushToFirestore(
  state: ReturnType<typeof useAppStore.getState>,
  deviceId: string,
) {
  await writeToFirestore(state, deviceId)
}

// 保存ボタンなど「即時書き込みが必要なタイミング」からコールできるモジュールレベル関数
let _immediateFlush: (() => Promise<void>) | null = null
// isMergingRef への参照（forceSyncNow で write-back を防ぐために使用）
let _isMergingRef: { current: boolean } | null = null

export function flushToFirestoreNow(): Promise<void> {
  return _immediateFlush?.() ?? Promise.resolve()
}

// Firestoreから強制再読み込みしてマージ（write-backを起こさずに最新データを反映）
export function forceSyncFromFirestore(): Promise<void> {
  return readFromFirestore().then((data) => {
    if (!data) return
    if (_isMergingRef) _isMergingRef.current = true
    useAppStore.getState().mergeFromFirestore(data)
    if (_isMergingRef) _isMergingRef.current = false
  }).catch((e) => console.error('[Firestore force sync]', e))
}

export function useFirestoreSync() {
  const { setProductImages } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(useAppStore.getState())
  const syncReadyRef = useRef(false)
  const deviceId = useRef(getOrCreateDeviceId())
  // mergeFromFirestore実行中はdebounceを起動しない（ピンポンループ防止）
  const isMergingRef = useRef(false)

  useEffect(() => {
    const myId = deviceId.current

    // 保存ボタン等からの即時書き込み
    _immediateFlush = () => {
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
      return pushToFirestore(useAppStore.getState(), myId)
        .then(() => console.log('[Firestore] immediate flush: success'))
        .catch((e) => console.error('[Firestore] immediate flush: FAILED', e))
    }
    // forceSyncFromFirestore が isMergingRef にアクセスできるよう登録
    _isMergingRef = isMergingRef

    return () => { _immediateFlush = null; _isMergingRef = null }
  }, [])

  useEffect(() => {
    const myId = deviceId.current
    let isFirstSnapshot = true

    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        if (isFirstSnapshot) {
          isFirstSnapshot = false
          // 起動時は常にmergeFromFirestoreでローカルの変更を保護する
          // isMergingRef=trueでdebounceをブロックし、ピンポンを防止
          // ※ 起動時のwrite-backは廃止: persistentLocalCacheにより最初のonDataが
          //   IndexedDBキャッシュ（古いデータ）から来ることがあり、古いデータを
          //   Firestoreに書き戻すとPCの新しい変更が上書きされてしまうため。
          //   オフライン中の変更はFirestoreのオフラインキューが自動的にサーバーに送信する。
          isMergingRef.current = true
          useAppStore.getState().mergeFromFirestore(data)
          isMergingRef.current = false
          syncReadyRef.current = true
          return
        }

        // 常にmergeFromFirestoreでデータを統合する（自分の書き込みも含む）
        // isMergingRef=trueの間はdebounce（write-back）をブロックしてピンポンを防止
        // ※ firestoreDeviceId === myIdのスキップを廃止: 起動時のwrite-back確認が
        //   PC側スナップショットより後に届くと lastModifiedBy がiPad自身のIDになり
        //   PCの変更が永遠にskipされるレースコンディションが発生するため
        isMergingRef.current = true
        useAppStore.getState().mergeFromFirestore(data)
        isMergingRef.current = false
      },
      onEmpty: () => {
        isFirstSnapshot = false
        pushToFirestore(useAppStore.getState(), myId)
          .catch((e) => console.error('[Firestore init push empty]', e))
        syncReadyRef.current = true
      },
      onError: () => {
        isFirstSnapshot = false
        syncReadyRef.current = true
      },
    })

    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stateRef.current = useAppStore.getState()
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      if (!syncReadyRef.current) return
      if (isMergingRef.current) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        // stateRef.current を使う: タイマー設定後に mergeFromFirestore で状態が変わっても
        // 常に最新状態を書き込む（クロージャの state は古い可能性がある）
        pushToFirestore(stateRef.current, deviceId.current).catch((e) =>
          console.error('[Firestore backup]', e)
        )
      }, 300)
    })
  }, [])

  useEffect(() => {
    return subscribeToProductImages(setProductImages)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const myId = deviceId.current
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (!syncReadyRef.current) return
      pushToFirestore(useAppStore.getState(), myId).catch((e) =>
        console.error('[Firestore backup on hide]', e)
      )
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      } else {
        // フォアグラウンド復帰時にFirestoreを強制再読み込み
        // iOS Safariはバックグラウンド中にonSnapshotリスナーが停止する場合があるため
        if (!syncReadyRef.current) return
        readFromFirestore().then((data) => {
          if (!data) return
          isMergingRef.current = true
          useAppStore.getState().mergeFromFirestore(data)
          isMergingRef.current = false
        }).catch((e) => console.error('[Firestore resume read]', e))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [])
}
