import { useEffect, useRef, useState } from 'react'
import { subscribeToFirestore, writeToFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

export function useFirestoreSync() {
  const {
    products, stocks, transactions, transfers,
    staffPurchases, staffMembers, storeInfo, appSettings,
    loadFromFirestore,
  } = useAppStore()

  // Firestore の状態を確認してから書き込みを許可する
  // タイムアウトでは書き込みを許可しない（実データを上書きするリスクを防ぐ）
  const [firestoreConfirmed, setFirestoreConfirmed] = useState(false)
  const writeBlockedUntil = useRef(0)

  useEffect(() => {
    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        // 他デバイスからの更新 — ローカルに反映してから書き込みブロック
        writeBlockedUntil.current = Date.now() + 3000
        loadFromFirestore(data)
        setFirestoreConfirmed(true)
      },
      onEmpty: () => {
        // Firestore が空 (初回) — ローカルデータで初期化してよい
        setFirestoreConfirmed(true)
      },
      onError: () => {
        // エラー時は書き込みしない（実データ保護）
        // firestoreConfirmed を true にしない
      },
    })

    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Firestore 確認後のみ書き込む (1.5 秒デバウンス)
  useEffect(() => {
    if (!firestoreConfirmed) return

    const timer = setTimeout(() => {
      if (Date.now() < writeBlockedUntil.current) return
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffMembers, storeInfo, appSettings,
      }).catch((e) => console.error('[Firestore write]', e))
    }, 1500)

    return () => clearTimeout(timer)
  }, [
    firestoreConfirmed,
    products, stocks, transactions, transfers,
    staffPurchases, staffMembers, storeInfo, appSettings,
  ])
}
