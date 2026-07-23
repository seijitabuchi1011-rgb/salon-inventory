import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

export function useFirestoreSync() {
  const { setProductImages } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // useEffectが実行される時点ではZustand persistの水和が完了しているため
  // 初期値はここではなくsubscribeのeffect内で設定する
  const stateRef = useRef(useAppStore.getState())

  // useSyncExternalStoreのiOS Safari問題を回避: vanillaのsubscribeで直接監視
  useEffect(() => {
    // この時点でpersist水和が完了しているため正確なローカル状態を取得
    stateRef.current = useAppStore.getState()
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        writeToFirestore(state).catch((e) => console.error('[Firestore backup]', e))
      }, 1000)
    })
  }, [])

  // 起動時: localStorageにデータがあればFirestoreへ同期
  // localStorageが空（初回 or ストレージクリア後）の場合はFirestoreから復元する
  useEffect(() => {
    const hasLocal = localStorage.getItem('salon-inventory-store') !== null
    if (hasLocal) {
      writeToFirestore(useAppStore.getState())
        .catch((e) => console.error('[Firestore init push]', e))
    } else {
      readFromFirestore()
        .then((data) => {
          if (data) useAppStore.getState().loadFromFirestore(data)
        })
        .catch((e) => console.error('[Firestore init read]', e))
    }
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
      writeToFirestore(stateRef.current).catch((e) =>
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
