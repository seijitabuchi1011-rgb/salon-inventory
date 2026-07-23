import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
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

  // 状態変化を監視してFirestoreへデバウンス書き込み
  useEffect(() => {
    stateRef.current = useAppStore.getState()
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      if (!syncReadyRef.current) return  // 初期同期完了まで書き込み禁止
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pushToFirestore(state, deviceId.current).catch((e) =>
          console.error('[Firestore backup]', e)
        )
      }, 1000)
    })
  }, [])

  // 起動時: デバイスIDで「誰が最後に書いたか」を判定してから同期
  // - 自分以外のデバイスが書いた → 別端末の最新データをFirestoreから読み込む
  // - 自分が最後に書いた（または初回）→ ローカルをFirestoreへ書き込む
  // - ローカルデータなし → Firestoreから復元
  useEffect(() => {
    const hasLocal = localStorage.getItem('salon-inventory-store') !== null
    const myId = deviceId.current

    readFromFirestore()
      .then((firestoreData) => {
        const firestoreDeviceId = firestoreData?.lastModifiedBy

        if (!hasLocal) {
          // ローカルデータなし → Firestoreから復元
          if (firestoreData) useAppStore.getState().loadFromFirestore(firestoreData)
        } else if (firestoreDeviceId && firestoreDeviceId !== myId) {
          // 別端末が最後に書き込んでいる → Firestoreから読み込む
          if (firestoreData) useAppStore.getState().loadFromFirestore(firestoreData)
        } else {
          // 自分が最後（またはFirestoreにデバイスIDなし）→ ローカルをFirestoreへ書き込む
          pushToFirestore(useAppStore.getState(), myId).catch((e) =>
            console.error('[Firestore init push]', e)
          )
        }
      })
      .catch((e) => {
        console.error('[Firestore init read]', e)
        if (hasLocal) {
          pushToFirestore(useAppStore.getState(), myId).catch((e2) =>
            console.error('[Firestore fallback push]', e2)
          )
        }
      })
      .finally(() => {
        syncReadyRef.current = true
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
