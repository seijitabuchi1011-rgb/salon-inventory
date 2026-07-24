import { doc, collection, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
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

export async function readFromFirestore(): Promise<FirestoreData | null> {
  const snapshot = await getDoc(STORE_DOC)
  return snapshot.exists() ? (snapshot.data() as FirestoreData) : null
}

export async function writeToFirestore(data: FirestoreData, deviceId?: string): Promise<void> {
  // 画像は product-images コレクションで管理するため、メインドキュメントからは除外
  // Zustand state を直接渡された場合でも action 関数を含めないよう明示的に列挙する
  // (spread { ...data } だと Zustand の action 関数が混入し Firestore が拒否する)
  const products = data.products.map(({ image: _img, ...rest }) => rest)
  await setDoc(STORE_DOC, {
    products,
    stocks: data.stocks,
    transactions: data.transactions,
    transfers: data.transfers,
    staffPurchases: data.staffPurchases,
    staffPayments: data.staffPayments,
    staffMembers: data.staffMembers,
    storeInfo: data.storeInfo,
    storeOrder: data.storeOrder,
    appSettings: data.appSettings,
    stocktakeSnapshots: data.stocktakeSnapshots,
    categories: data.categories ?? [],
    makers: data.makers ?? [],
    dealers: data.dealers ?? [],
    dealerReps: data.dealerReps ?? [],
    lastModified: Date.now(),
    lastModifiedBy: deviceId ?? null,
  })
}

// --- product-images コレクション ---
// 各商品の画像を独立ドキュメントとして保存することで Firestore の 1MB 制限を回避

export async function writeProductImage(productId: string, imageData: string): Promise<void> {
  await setDoc(doc(db, 'product-images', productId), { image: imageData })
}

export async function deleteProductImage(productId: string): Promise<void> {
  await deleteDoc(doc(db, 'product-images', productId))
}

export function subscribeToProductImages(
  onUpdate: (images: Record<string, string>) => void
) {
  return onSnapshot(collection(db, 'product-images'), (snapshot) => {
    const images: Record<string, string> = {}
    snapshot.forEach((d) => {
      const data = d.data()
      if (data.image) images[d.id] = data.image as string
    })
    onUpdate(images)
  })
}
