import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

const LOCAL_TS_KEY = 'salon-inventory-last-write'

function getLocalTs(): number {
  return parseInt(localStorage.getItem(LOCAL_TS_KEY) || '0', 10)
}

function setLocalTs(ts: number) {
  localStorage.setItem(LOCAL_TS_KEY, ts.toString())
}

async function pushToFirestore(state: ReturnType<typeof useAppStore.getState>) {
  await writeToFirestore(state)
  setLocalTs(Date.now())
}

export function useFirestoreSync() {
  const { setProductImages } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(useAppStore.getState())

  // 状態変化を監視してFirestoreへデバウンス書き込み
  useEffect(() => {
    stateRef.current = useAppStore.getState()
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pushToFirestore(state).catch((e) => console.error('[Firestore backup]', e))
      }, 1000)
    })
  }, [])

  // 起動時: タイムスタンプ比較でどちらのデータが新しいか判定してから同期
  // - Firestoreが新しい → 別端末で更新されているためFirestoreから読み込み
  // - ローカルが新しい（または同じ）→ ローカルをFirestoreへ書き込み
  // - ローカルにデータなし → Firestoreから復元
  useEffect(() => {
    const hasLocal = localStorage.getItem('salon-inventory-store') !== null
    const localTs = getLocalTs()

    readFromFirestore()
      .then((firestoreData) => {
        const firestoreTs = firestoreData?.lastModified ?? 0

        if (!hasLocal) {
          // ローカルデータなし → Firestoreから復元
          if (firestoreData) useAppStore.getState().loadFromFirestore(firestoreData)
          return
        }

        if (firestoreTs > localTs + 3000) {
          // Firestoreが3秒以上新しい → 別端末で更新されている
          if (firestoreData) {
            useAppStore.getState().loadFromFirestore(firestoreData)
            setLocalTs(firestoreTs)
          }
        } else {
          // ローカルが新しい（またはほぼ同時） → ローカルをFirestoreへ書き込み
          pushToFirestore(useAppStore.getState()).catch((e) =>
            console.error('[Firestore init push]', e)
          )
        }
      })
      .catch((e) => {
        console.error('[Firestore init read]', e)
        // 読み込みエラー時はローカルデータをFirestoreへ書き込み
        if (hasLocal) {
          pushToFirestore(useAppStore.getState()).catch((e2) =>
            console.error('[Firestore fallback push]', e2)
          )
        }
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
      pushToFirestore(stateRef.current).catch((e) =>
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
