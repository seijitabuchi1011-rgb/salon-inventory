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

  const [firestoreReady, setFirestoreReady] = useState(false)
  const initialLoadDone = useRef(false)

  // Firestoreからのリアルタイム受信
  // 【重要】ローカルにデータがある場合は絶対に上書きしない
  // Firestoreは書き込み専用バックアップとして使用する
  useEffect(() => {
    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        if (!initialLoadDone.current) {
          initialLoadDone.current = true
          const localProducts = useAppStore.getState().products
          if (localProducts.length === 0) {
            // ローカルが空の場合のみ（初回インストール・ブラウザクリア後）Firestoreから読み込む
            loadFromFirestore(data)
          }
          // ローカルにデータがある場合は何もしない（Firestoreで上書きしない）
        }
        setFirestoreReady(true)
      },
      onEmpty: () => {
        initialLoadDone.current = true
        setFirestoreReady(true)
      },
      onError: () => {
        initialLoadDone.current = true
        setFirestoreReady(true)
      },
    })
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 商品画像はFirestoreから常に同期（別コレクションのため安全）
  useEffect(() => {
    const unsubscribe = subscribeToProductImages(setProductImages)
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化をFirestoreにバックアップ（1秒デバウンス・ベストエフォート）
  useEffect(() => {
    if (!firestoreReady) return
    const timer = setTimeout(() => {
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
        stocktakeSnapshots,
        categories, makers, dealers, dealerReps,
      }).catch((e) => console.error('[Firestore backup]', e))
    }, 1000)
    return () => clearTimeout(timer)
  }, [
    firestoreReady,
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots,
    categories, makers, dealers, dealerReps,
  ])
}
