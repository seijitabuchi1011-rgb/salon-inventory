import { useEffect, useRef, useState } from 'react'
import { subscribeToFirestore, subscribeToProductImages, writeToFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

export function useFirestoreSync() {
  const {
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots,
    categories, makers, dealers, dealerReps,
    setProductImages,
    loadFromFirestore,
  } = useAppStore()

  const [firestoreConfirmed, setFirestoreConfirmed] = useState(false)
  // ローカル変更がある場合にFirestoreの上書きをブロックする期限
  const localDirtyUntil = useRef(0)
  // Firestoreの読み込み直後の書き込みブロック期限
  const writeBlockedUntil = useRef(0)

  useEffect(() => {
    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        // ローカルに未保存の変更がある間はFirestoreの古いデータで上書きしない
        if (Date.now() < localDirtyUntil.current) {
          setFirestoreConfirmed(true)
          return
        }
        writeBlockedUntil.current = Date.now() + 2000
        loadFromFirestore(data)
        setFirestoreConfirmed(true)
      },
      onEmpty: () => {
        setFirestoreConfirmed(true)
      },
      onError: () => {
        // エラー時は書き込みしない
      },
    })

    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = subscribeToProductImages(setProductImages)
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化を検知して「ローカル変更あり」フラグを立てる
  // firestoreConfirmed 後の変化のみ対象（初期ロード除外）
  const confirmedRef = useRef(false)
  useEffect(() => {
    if (!firestoreConfirmed) return
    if (!confirmedRef.current) {
      // 最初の confirmed 時点はスキップ（初期ロード）
      confirmedRef.current = true
      return
    }
    // ユーザー操作による変更 → ローカルをdirtyとしてマーク（5秒間）
    localDirtyUntil.current = Date.now() + 5000
  }, [
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  // Firestore へ書き込む（ブロック中なら終了後に自動リトライ）
  useEffect(() => {
    if (!firestoreConfirmed) return

    const remaining = writeBlockedUntil.current - Date.now()
    // ブロック中なら解除後に書き込む、そうでなければ 1500ms デバウンス
    const delay = remaining > 0 ? remaining + 200 : 1500

    const timer = setTimeout(() => {
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
        stocktakeSnapshots,
        categories, makers, dealers, dealerReps,
      }).catch((e) => console.error('[Firestore write]', e))
    }, delay)

    return () => clearTimeout(timer)
  }, [
    firestoreConfirmed,
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots,
    categories, makers, dealers, dealerReps,
  ])
}
