import { useEffect, useRef, useState } from 'react'
import { subscribeToFirestore, subscribeToProductImages, writeToFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

// localStorage に最後の成功した書き込み時刻を保存するキー
const LAST_WRITE_KEY = 'salon-inventory-last-write'

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

  useEffect(() => {
    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        if (!initialLoadDone.current) {
          initialLoadDone.current = true

          const localProducts = useAppStore.getState().products
          const lastWrite = parseInt(localStorage.getItem(LAST_WRITE_KEY) ?? '0')
          const recentlySynced = Date.now() - lastWrite < 5 * 60 * 1000 // 5分以内に書き込み成功

          if (localProducts.length === 0) {
            // ローカルにデータなし → Firestoreから初期化
            loadFromFirestore(data)
          } else if (!recentlySynced) {
            // 5分以上書き込みが成功していない → Firestoreが最新の可能性
            // Firestoreのデータ量が多い場合のみ上書き（他デバイスで追加された可能性）
            const firestoreCount = (data.products ?? []).length
            if (firestoreCount > localProducts.length) {
              loadFromFirestore(data)
            }
          }
          // recentlySynced かつ localProducts あり → ローカルが最新、上書きしない
        }
        // 2回目以降のスナップショット（自分の書き込みエコー等）は無視
        setFirestoreReady(true)
      },
      onEmpty: () => {
        initialLoadDone.current = true
        setFirestoreReady(true)
      },
      onError: () => {
        initialLoadDone.current = true
        // エラーでも書き込みは続行（オフライン対応）
        setFirestoreReady(true)
      },
    })
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = subscribeToProductImages(setProductImages)
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化を Firestore に書き込む（1秒デバウンス）
  useEffect(() => {
    if (!firestoreReady) return

    const timer = setTimeout(() => {
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
        stocktakeSnapshots,
        categories, makers, dealers, dealerReps,
      })
        .then(() => {
          // 書き込み成功時刻を記録
          localStorage.setItem(LAST_WRITE_KEY, Date.now().toString())
        })
        .catch((e) => console.error('[Firestore write]', e))
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
