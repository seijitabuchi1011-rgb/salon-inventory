import { useEffect, useRef, useState } from 'react'
import { subscribeToFirestore, writeToFirestore } from '../lib/firestore'
import { useAppStore } from '../store'

export function useFirestoreSync() {
  const {
    products, stocks, transactions, transfers,
    staffPurchases, staffMembers, storeInfo, appSettings,
    loadFromFirestore,
  } = useAppStore()

  // true になったら Firestore への書き込みを開始する
  const [syncReady, setSyncReady] = useState(false)
  // Firestore からデータを受け取った直後は一定時間書き戻しを抑制する
  const writeBlockedUntil = useRef(0)

  useEffect(() => {
    const unsubscribe = subscribeToFirestore({
      onData: (data) => {
        // 他のデバイスからの更新 — ローカルに反映
        writeBlockedUntil.current = Date.now() + 3000
        loadFromFirestore(data)
        setSyncReady(true)
      },
      onEmpty: () => {
        // Firestore がまだ空 (初回デバイス) — ローカルデータを書き込む
        setSyncReady(true)
      },
    })

    // 5 秒以内に応答がない場合もオフラインとして syncReady にする
    const timeout = setTimeout(() => setSyncReady(true), 5000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ローカル状態が変化したら Firestore に書き込む (1.5 秒デバウンス)
  useEffect(() => {
    if (!syncReady) return

    const timer = setTimeout(() => {
      // Firestore から受け取った直後は書き戻しをスキップ (ループ防止)
      if (Date.now() < writeBlockedUntil.current) return
      writeToFirestore({
        products, stocks, transactions, transfers,
        staffPurchases, staffMembers, storeInfo, appSettings,
      }).catch((e) => console.error('[Firestore write]', e))
    }, 1500)

    return () => clearTimeout(timer)
  }, [
    syncReady,
    products, stocks, transactions, transfers,
    staffPurchases, staffMembers, storeInfo, appSettings,
  ])
}
