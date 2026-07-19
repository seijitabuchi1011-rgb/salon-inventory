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
  // Strip product images before writing — they can be large (base64)
  // and would quickly exceed Firestore's 1 MB document limit.
  // Images are kept in localStorage per device.
  const products = data.products.map(({ image: _img, ...rest }) => rest)
  await setDoc(STORE_DOC, { ...data, products })
}
