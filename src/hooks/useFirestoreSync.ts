import { useEffect } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

// このキーが localStorage に存在する = 初回 Firestore 読み込み済み
// 一度でも読み込んだら localStorage を正とし、Firestore から二度と上書きしない
const INIT_KEY = 'salon-inventory-firestore-init-v1'

export function useFirestoreSync() {
  const {
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
    setProductImages, loadFromFirestore,
  } = useAppStore()

  // 初回のみ: localStorage が空なら Firestore から読み込む
  useEffect(() => {
    if (localStorage.getItem(INIT_KEY)) return

    readFromFirestore()
      .then((data) => {
        const localProducts = useAppStore.getState().products
        if (data && localProducts.length === 0) {
          loadFromFirestore(data)
        }
      })
      .catch((e) => console.error('[Firestore init]', e))
      .finally(() => {
        localStorage.setItem(INIT_KEY, Date.now().toString())
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 商品画像は別コレクションのため常に同期（安全）
  useEffect(() => {
    const unsubscribe = subscribeToProductImages(setProductImages)
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化を Firestore にバックアップ（2秒デバウンス）
  // ※ Firestore は書き込み専用バックアップ。アプリは localStorage を正とする
  useEffect(() => {
    const timer = setTimeout(() => {
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
        stocktakeSnapshots, categories, makers, dealers, dealerReps,
      }).catch((e) => console.error('[Firestore backup]', e))
    }, 2000)
    return () => clearTimeout(timer)
  }, [
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
  ])
}
