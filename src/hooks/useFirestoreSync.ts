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
  // 起動時の初期同期が完了するまでデバウンス書き込みをブロック
  const syncReadyRef = useRef(false)
  const deviceId = useRef(getOrCreateDeviceId())

  // Firestoreをリアルタイム監視:
  // - 起動時(初回): 別端末の書き込みならFirestoreから読み込む、自分の書き込みならローカルをプッシュ
  // - 起動後(以降): 別端末からの変更を即座に反映
  useEffect(() => {
    const myId = deviceId.current
    const hasLocal = localStorage.getItem('salon-inventory-store') !== null
    let isFirstSnapshot = true

    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        const firestoreDeviceId = (data as typeof data & { lastModifiedBy?: string }).lastModifiedBy

        if (isFirstSnapshot) {
          isFirstSnapshot = false
          if (!hasLocal || (firestoreDeviceId && firestoreDeviceId !== myId)) {
            // ローカルなし、または別端末の書き込み → Firestoreから読み込む
            useAppStore.getState().loadFromFirestore(data)
          } else {
            // 自分の書き込み(またはdeviceIdなし) → ローカルをFirestoreへ書き込む
            pushToFirestore(useAppStore.getState(), myId)
              .catch((e) => console.error('[Firestore init push]', e))
          }
          syncReadyRef.current = true
          return
        }

        // 2回目以降: 別端末からのリアルタイム更新のみ反映
        if (firestoreDeviceId && firestoreDeviceId !== myId) {
          useAppStore.getState().loadFromFirestore(data)
        }
      },
      onEmpty: () => {
        isFirstSnapshot = false
        // Firestoreにデータなし → ローカルをアップロード
        if (hasLocal) {
          pushToFirestore(useAppStore.getState(), myId)
            .catch((e) => console.error('[Firestore init push empty]', e))
        }
        syncReadyRef.current = true
      },
      onError: () => {
        isFirstSnapshot = false
        syncReadyRef.current = true
      },
    })

    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化を監視してFirestoreへデバウンス書き込み
  useEffect(() => {
    stateRef.current = useAppStore.getState()
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      if (!syncReadyRef.current) return
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
