import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

// ローカル変更タイムスタンプ（Firestoreに未同期の変更があるか判定に使用）
const LOCAL_TS_KEY = 'salon-local-ts'
const SYNC_TS_KEY = 'salon-sync-ts'

function getTs(key: string) {
  try { return parseInt(localStorage.getItem(key) ?? '0') } catch { return 0 }
}
function setTs(key: string, ts: number) {
  try { localStorage.setItem(key, ts.toString()) } catch {}
}

export function useFirestoreSync() {
  const { setProductImages, loadFromFirestore } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(useAppStore.getState())
  // loadFromFirestore 呼び出し中はローカルTSを更新しない
  const isApplyingFirestore = useRef(false)

  // ストア変更を監視 → Firestoreにバックアップ（デバウンス1秒）
  useEffect(() => {
    return useAppStore.subscribe((state) => {
      stateRef.current = state
      // Firestoreロード中の状態変化はローカル変更として扱わない
      if (!isApplyingFirestore.current) {
        setTs(LOCAL_TS_KEY, Date.now())
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const ts = Date.now()
        writeToFirestore(state)
          .then(() => setTs(SYNC_TS_KEY, ts))
          .catch((e) => console.error('[Firestore backup]', e))
      }, 1000)
    })
  }, [])

  // 起動時: ローカルに未同期の変更があれば Firestore へ書き込み、なければ Firestore から読み込む
  useEffect(() => {
    const localTs = getTs(LOCAL_TS_KEY)
    const syncTs = getTs(SYNC_TS_KEY)

    if (localTs > syncTs) {
      // ローカルの方が新しい（前回リロード時にFirestore書き込みが未完了だった）
      // → ローカルデータをFirestoreに書き込んで正として扱う
      writeToFirestore(stateRef.current)
        .then(() => setTs(SYNC_TS_KEY, localTs))
        .catch((e) => console.error('[Firestore init push]', e))
      return
    }

    // Firestoreが最新 → 読み込み（別端末からの変更を取得）
    isApplyingFirestore.current = true
    readFromFirestore()
      .then((data) => {
        if (data) {
          loadFromFirestore(data)
          const ts = Date.now()
          setTs(LOCAL_TS_KEY, ts)
          setTs(SYNC_TS_KEY, ts)
        }
      })
      .catch((e) => console.error('[Firestore init]', e))
      .finally(() => { isApplyingFirestore.current = false })
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
      const localTs = getTs(LOCAL_TS_KEY)
      writeToFirestore(stateRef.current)
        .then(() => setTs(SYNC_TS_KEY, localTs))
        .catch((e) => console.error('[Firestore backup on hide]', e))
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
