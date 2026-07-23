import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore } from '../lib/firestore'
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

  // 起動時: ローカルの状態をFirestoreに書き込む
  // （前回リロード時の書き込みが未完了だった場合の保護）
  // ※ Firestoreから読み込むとlocalStorageの新しいデータを上書きするため読み込みは行わない
  // ※ 別端末から最新データを取得したい場合は設定画面の「クラウドから読み込み」ボタンを使用
  useEffect(() => {
    writeToFirestore(useAppStore.getState())
      .catch((e) => console.error('[Firestore init push]', e))
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
