import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

export function useFirestoreSync() {
  const { setProductImages, loadFromFirestore } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 最新のstoreをrefで保持（visibilitychange用）
  const stateRef = useRef(useAppStore.getState())

  // useSyncExternalStore（iOS Safari + Zustand v5で不安定）を回避し、
  // vanilla subscribeでstoreの変更を直接監視してFirestoreにバックアップ
  useEffect(() => {
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        writeToFirestore(state).catch((e) => console.error('[Firestore backup]', e))
      }, 1000)
    })
  }, [])

  // 起動時に必ずFirestoreから読み込む（localStorage依存を排除）
  // localStorageが壊れていても正しいデータが表示される
  useEffect(() => {
    readFromFirestore()
      .then((data) => {
        if (data) {
          loadFromFirestore(data)
        }
      })
      .catch((e) => console.error('[Firestore init]', e))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 商品画像は別コレクションのため常に同期
  useEffect(() => {
    return subscribeToProductImages(setProductImages)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // アプリがバックグラウンドになったとき即座にFirestoreへ保存
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
          debounceRef.current = null
        }
        writeToFirestore(stateRef.current).catch((e) =>
          console.error('[Firestore backup on hide]', e)
        )
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
