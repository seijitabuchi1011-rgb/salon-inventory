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
    let isFirstSnapshot = true

    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        const firestoreDeviceId = (data as typeof data & { lastModifiedBy?: string }).lastModifiedBy

        if (isFirstSnapshot) {
          isFirstSnapshot = false

          if (firestoreDeviceId === 'upload-script' || !firestoreDeviceId) {
            // バックアップ直後または初期データ → Firestoreで完全上書き
            useAppStore.getState().loadFromFirestore(data)
            syncReadyRef.current = true
          } else {
            // 通常の端末データ → syncReadyをセットしてからマージ
            // ローカルの未保存変更（localStorage）をタイムスタンプで保護しつつ
            // Firestoreの新しい変更もマージする。マージ後にdebounceで
            // ローカルの未保存分をFirestoreへ書き戻す。
            syncReadyRef.current = true
            useAppStore.getState().mergeFromFirestore(data)
          }
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
      // マージ中でも stateRef は更新（次のdebounce書き込みで最新状態を使うため）
      stateRef.current = state
      if (!syncReadyRef.current) return
      // マージによる状態変化はdebounceを起動しない（ピンポンループ防止）
      // ユーザー自身の変更による既存debounceは維持されるため、
      // mergeされた最新stateが次のdebounce書き込みに反映される
      if (isMergingRef.current) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pushToFirestore(state, deviceId.current).catch((e) =>
          console.error('[Firestore backup]', e)
        )
      }, 1000)
    })
  }, [])

  // 商品画像は別コレクションのため常に同期
  useEffect(() => {
    return subscribeToProductImages(setProductImages)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // アプリがバックグラウンド/非表示になったとき即座にFirestoreへ保存
  useEffect(() => {
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (!syncReadyRef.current) return
      pushToFirestore(stateRef.current, deviceId.current).catch((e) =>
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
