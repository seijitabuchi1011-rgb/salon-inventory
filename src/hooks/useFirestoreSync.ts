import { useEffect, useRef } from 'react'
import { subscribeToProductImages, writeToFirestore, readFromFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

// このキーが localStorage に存在する = 初回 Firestore 読み込み済み
const INIT_KEY = 'salon-inventory-firestore-init-v1'

export function useFirestoreSync() {
  const {
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
    setProductImages, loadFromFirestore,
  } = useAppStore()

  // 最新の状態を ref で保持（visibilitychange ハンドラからアクセスするため）
  const stateRef = useRef({
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
  })
  useEffect(() => {
    stateRef.current = {
      products, stocks, transactions, transfers,
      staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
      stocktakeSnapshots, categories, makers, dealers, dealerReps,
    }
  }, [
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
  ])

  // 初回のみ: Firestore から読み込む（localStorageが空のとき）
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

  // 商品画像は別コレクションのため常に同期
  useEffect(() => {
    const unsubscribe = subscribeToProductImages(setProductImages)
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // アプリがバックグラウンドになったとき即座にFirestoreへ保存
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        writeToFirestore(stateRef.current).catch((e) =>
          console.error('[Firestore backup on hide]', e)
        )
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // 状態変化を Firestore にバックアップ（500ms デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
        stocktakeSnapshots, categories, makers, dealers, dealerReps,
      }).catch((e) => console.error('[Firestore backup]', e))
    }, 500)
    return () => clearTimeout(timer)
  }, [
    products, stocks, transactions, transfers,
    staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
    stocktakeSnapshots, categories, makers, dealers, dealerReps,
  ])
}
