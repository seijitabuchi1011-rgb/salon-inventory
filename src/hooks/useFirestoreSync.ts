import { useEffect, useRef, useState } from 'react'
import { subscribeToFirestore, subscribeToProductImages, writeToFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

const LAST_WRITE_KEY = 'salon-inventory-last-write'
const LAST_MODIFIED_KEY = 'salon-inventory-last-modified'

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
          const lastModified = parseInt(localStorage.getItem(LAST_MODIFIED_KEY) ?? '0')
          const lastWrite = parseInt(localStorage.getItem(LAST_WRITE_KEY) ?? '0')

          // ローカルにデータがない場合のみFirestoreから初期化
          // ローカルデータがある場合は「未同期の変更がある可能性」があるため上書きしない
          // （削除した商品がFirestoreに残っていても復元させない）
          if (localProducts.length === 0) {
            loadFromFirestore(data)
          } else if (lastWrite > 0 && lastWrite >= lastModified) {
            // 直近の書き込みが成功済み（Firestoreと同期済み）→ Firestoreが最新の可能性あり
            // 他デバイスでの追加のみ受け入れ（削除は無視）
            const firestoreProducts = (data.products ?? []) as { id: string }[]
            const localIds = new Set(localProducts.map((p) => p.id))
            const hasNewFromOtherDevice = firestoreProducts.some((fp) => !localIds.has(fp.id))
            if (hasNewFromOtherDevice) {
              loadFromFirestore(data)
            }
          }
          // 未同期の変更がある場合 (lastWrite < lastModified) → ローカルを優先
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

  useEffect(() => {
    const unsubscribe = subscribeToProductImages(setProductImages)
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化を Firestore に書き込む（1秒デバウンス）
  useEffect(() => {
    if (!firestoreReady) return

    const modifiedAt = Date.now()
    // 書き込み試行時刻を記録（書き込みが失敗しても記録され、lastWrite < lastModified になる）
    localStorage.setItem(LAST_MODIFIED_KEY, modifiedAt.toString())

    const timer = setTimeout(() => {
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings,
        stocktakeSnapshots,
        categories, makers, dealers, dealerReps,
      })
        .then(() => {
          // 書き込み成功時刻を記録（lastWrite >= lastModified になる）
          localStorage.setItem(LAST_WRITE_KEY, modifiedAt.toString())
        })
        .catch((e) => {
          console.error('[Firestore write error]', e)
          // lastWrite は更新しない → 次回ロード時に「未同期」と判断してローカルを優先
        })
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
