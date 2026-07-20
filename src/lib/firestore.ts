import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { FirestoreData } from '../store'

const STORE_DOC = doc(db, 'salon-data', 'main')

type Callbacks = {
  onData: (data: FirestoreData) => void
  onEmpty: () => void
  onError?: (e: Error) => void
}

export function subscribeToFirestore({ onData, onEmpty, onError }: Callbacks) {
  let firstSnapshot = true

  return onSnapshot(
    STORE_DOC,
    { includeMetadataChanges: true },
    (snapshot) => {
      // Skip snapshots caused by our own writes (pending local write)
      if (snapshot.metadata.hasPendingWrites) return

      if (firstSnapshot) {
        firstSnapshot = false
        if (snapshot.exists()) {
          onData(snapshot.data() as FirestoreData)
        } else {
          onEmpty()
        }
        return
      }

      // Real-time update from another device
      if (snapshot.exists()) {
        onData(snapshot.data() as FirestoreData)
      }
    },
    (error) => {
      console.error('[Firestore]', error)
      if (firstSnapshot) {
        firstSnapshot = false
        onEmpty() // Treat error as "no data" so the app still works offline
      }
      onError?.(error)
    }
  )
}

export async function writeToFirestore(data: FirestoreData): Promise<void> {
  // base64 画像 (data: URI) は除外 — Firestore の 1MB 制限を超えるため
  // Firebase Storage にアップロード済みの URL はそのまま保存する
  const products = data.products.map((p) => ({
    ...p,
    image: p.image?.startsWith('data:') ? undefined : p.image,
  }))
  await setDoc(STORE_DOC, { ...data, products })
}
