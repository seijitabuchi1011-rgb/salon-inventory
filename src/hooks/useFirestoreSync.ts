import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, subscribeToFirestore } from '../lib/firestore'
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

export function flushToFirestoreNow(): Promise<void> {
  return _immediateFlush?.() ?? Promise.resolve()
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

    return () => { _immediateFlush = null }
  }, [])

  useEffect(() => {
    const myId = deviceId.current
    let isFirstSnapshot = true

    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        const firestoreDeviceId = (data as typeof data & { lastModifiedBy?: string }).lastModifiedBy

        if (isFirstSnapshot) {
          isFirstSnapshot = false
          // 起動時は常にmergeFromFirestoreでローカルの変更を保護する
          // ※ isMergingRefをtrueにしてdebounceを一時ブロックし、マージ完了後に
          //   syncReadyRef = trueにすることで、最新stateRefを使った書き込みが走る
          isMergingRef.current = true
          useAppStore.getState().mergeFromFirestore(data)
          isMergingRef.current = false
          syncReadyRef.current = true
          // マージ済みの最新状態をFirestoreに書き戻す（ローカルの未同期変更を反映）
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            pushToFirestore(stateRef.current, myId).catch((e) =>
              console.error('[Firestore init sync]', e)
            )
          }, 300)
          return
        }

        // 別端末の書き込みのみマージ（自分の書き込みはskip）
        // isMergingRefでdebounceをブロックしてピンポンループを防止
        if (firestoreDeviceId !== myId) {
          isMergingRef.current = true
          useAppStore.getState().mergeFromFirestore(data)
          isMergingRef.current = false
        }
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
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (!syncReadyRef.current) return
      pushToFirestore(useAppStore.getState(), deviceId.current).catch((e) =>
        console.error('[Firestore backup on hide]', e)
      )
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [])
}
