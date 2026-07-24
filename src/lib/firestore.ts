import { doc, collection, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { FirestoreData } from '../store'

// ─── ドキュメント参照 ────────────────────────────────────────────────────────
// 増え続けるデータを別ドキュメントに分離して 1MB 上限を回避
const MAIN_DOC      = doc(db, 'salon-data', 'main')
const TX_DOC        = doc(db, 'salon-data', 'transactions')
const TRANSFERS_DOC = doc(db, 'salon-data', 'transfers')
const SP_DOC        = doc(db, 'salon-data', 'staffPurchases')
const SPAY_DOC      = doc(db, 'salon-data', 'staffPayments')

type Callbacks = {
  onData: (data: FirestoreData) => void
  onEmpty: () => void
  onError?: (e: Error) => void
}

export function subscribeToFirestore({ onData, onEmpty, onError }: Callbacks) {
  type MainShape = Omit<FirestoreData, 'transactions' | 'transfers' | 'staffPurchases' | 'staffPayments'>

  let mainSnap: MainShape | null = null
  let transactions: FirestoreData['transactions'] = []
  let transfers: FirestoreData['transfers'] = []
  let staffPurchases: FirestoreData['staffPurchases'] = []
  let staffPayments: FirestoreData['staffPayments'] = []

  // 旧フォーマット（main doc に全配列が埋め込まれていた）の移行用フォールバック
  let legacyTx: FirestoreData['transactions'] = []
  let legacyTr: FirestoreData['transfers'] = []
  let legacySp: FirestoreData['staffPurchases'] = []
  let legacySpay: FirestoreData['staffPayments'] = []

  // 各ドキュメントの初回スナップショット完了フラグ
  let mainReady = false, txReady = false, trReady = false, spReady = false, spayReady = false
  let txExists = false, trExists = false, spExists = false, spayExists = false
  let allReadyFired = false

  function buildFull(): FirestoreData {
    return { ...mainSnap!, transactions, transfers, staffPurchases, staffPayments }
  }

  // 全ドキュメントの初回ロードが揃ったら一度だけ呼ぶ
  function checkAllReady() {
    if (allReadyFired || !mainReady || !txReady || !trReady || !spReady || !spayReady) return
    allReadyFired = true
    if (!mainSnap) { onEmpty(); return }
    // 移行: 新ドキュメントがまだ存在しない場合は旧 main doc の配列を使用
    if (!txExists)   transactions   = legacyTx
    if (!trExists)   transfers      = legacyTr
    if (!spExists)   staffPurchases = legacySp
    if (!spayExists) staffPayments  = legacySpay
    onData(buildFull())
  }

  function onLaterUpdate() {
    if (!allReadyFired || !mainSnap) return
    onData(buildFull())
  }

  // main ドキュメント（商品・在庫・設定など）
  const unsubMain = onSnapshot(MAIN_DOC, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.hasPendingWrites) return
    const isFirst = !mainReady
    mainReady = true
    if (snap.exists()) {
      const d = snap.data() as Record<string, unknown>
      mainSnap = {
        products:           (d.products           as FirestoreData['products'])           ?? [],
        stocks:             (d.stocks             as FirestoreData['stocks'])             ?? [],
        staffMembers:       (d.staffMembers        as string[])                           ?? [],
        storeInfo:          (d.storeInfo           as FirestoreData['storeInfo'])          ?? {},
        storeOrder:         (d.storeOrder          as string[])                           ?? [],
        appSettings:         d.appSettings          as FirestoreData['appSettings'],
        stocktakeSnapshots: (d.stocktakeSnapshots  as FirestoreData['stocktakeSnapshots']) ?? [],
        categories:         (d.categories          as string[])                           ?? [],
        makers:             (d.makers              as string[])                           ?? [],
        dealers:            (d.dealers             as string[])                           ?? [],
        dealerReps:         (d.dealerReps          as string[])                           ?? [],
        lastModified:        d.lastModified          as number | undefined,
        lastModifiedBy:      d.lastModifiedBy        as string | undefined,
      }
      // 旧フォーマット移行用にキャッシュ
      legacyTx   = (d.transactions   as FirestoreData['transactions'])   ?? []
      legacyTr   = (d.transfers      as FirestoreData['transfers'])      ?? []
      legacySp   = (d.staffPurchases as FirestoreData['staffPurchases']) ?? []
      legacySpay = (d.staffPayments  as FirestoreData['staffPayments'])  ?? []
    } else {
      mainSnap = null
    }
    if (isFirst) checkAllReady(); else onLaterUpdate()
  }, (e) => {
    console.error('[Firestore main]', e)
    if (!mainReady) { mainReady = true; checkAllReady() }
    onError?.(e)
  })

  // 取引履歴ドキュメント
  const unsubTx = onSnapshot(TX_DOC, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.hasPendingWrites) return
    const isFirst = !txReady
    txReady = true; txExists = snap.exists()
    if (snap.exists()) transactions = (snap.data().items as FirestoreData['transactions']) ?? []
    if (isFirst) checkAllReady(); else onLaterUpdate()
  }, (e) => {
    console.error('[Firestore tx]', e)
    if (!txReady) { txReady = true; checkAllReady() }
  })

  // 移動履歴ドキュメント
  const unsubTr = onSnapshot(TRANSFERS_DOC, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.hasPendingWrites) return
    const isFirst = !trReady
    trReady = true; trExists = snap.exists()
    if (snap.exists()) transfers = (snap.data().items as FirestoreData['transfers']) ?? []
    if (isFirst) checkAllReady(); else onLaterUpdate()
  }, (e) => {
    console.error('[Firestore tr]', e)
    if (!trReady) { trReady = true; checkAllReady() }
  })

  // スタッフ購入ドキュメント
  const unsubSp = onSnapshot(SP_DOC, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.hasPendingWrites) return
    const isFirst = !spReady
    spReady = true; spExists = snap.exists()
    if (snap.exists()) staffPurchases = (snap.data().items as FirestoreData['staffPurchases']) ?? []
    if (isFirst) checkAllReady(); else onLaterUpdate()
  }, (e) => {
    console.error('[Firestore sp]', e)
    if (!spReady) { spReady = true; checkAllReady() }
  })

  // スタッフ支払ドキュメント
  const unsubSpay = onSnapshot(SPAY_DOC, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.hasPendingWrites) return
    const isFirst = !spayReady
    spayReady = true; spayExists = snap.exists()
    if (snap.exists()) staffPayments = (snap.data().items as FirestoreData['staffPayments']) ?? []
    if (isFirst) checkAllReady(); else onLaterUpdate()
  }, (e) => {
    console.error('[Firestore spay]', e)
    if (!spayReady) { spayReady = true; checkAllReady() }
  })

  return () => { unsubMain(); unsubTx(); unsubTr(); unsubSp(); unsubSpay() }
}

export async function readFromFirestore(): Promise<FirestoreData | null> {
  const [mainSnap, txSnap, trSnap, spSnap, spaySnap] = await Promise.all([
    getDoc(MAIN_DOC),
    getDoc(TX_DOC),
    getDoc(TRANSFERS_DOC),
    getDoc(SP_DOC),
    getDoc(SPAY_DOC),
  ])
  if (!mainSnap.exists()) return null
  const d = mainSnap.data() as Record<string, unknown>
  return {
    products:           (d.products           as FirestoreData['products'])           ?? [],
    stocks:             (d.stocks             as FirestoreData['stocks'])             ?? [],
    staffMembers:       (d.staffMembers        as string[])                           ?? [],
    storeInfo:          (d.storeInfo           as FirestoreData['storeInfo'])          ?? {},
    storeOrder:         (d.storeOrder          as string[])                           ?? [],
    appSettings:         d.appSettings          as FirestoreData['appSettings'],
    stocktakeSnapshots: (d.stocktakeSnapshots  as FirestoreData['stocktakeSnapshots']) ?? [],
    categories:         (d.categories          as string[])                           ?? [],
    makers:             (d.makers              as string[])                           ?? [],
    dealers:            (d.dealers             as string[])                           ?? [],
    dealerReps:         (d.dealerReps          as string[])                           ?? [],
    lastModified:        d.lastModified          as number | undefined,
    lastModifiedBy:      d.lastModifiedBy        as string | undefined,
    // 新ドキュメントがあればそちらを優先、なければ旧 main doc の配列で移行
    transactions: txSnap.exists()
      ? ((txSnap.data().items   as FirestoreData['transactions'])   ?? [])
      : ((d.transactions        as FirestoreData['transactions'])   ?? []),
    transfers: trSnap.exists()
      ? ((trSnap.data().items   as FirestoreData['transfers'])      ?? [])
      : ((d.transfers           as FirestoreData['transfers'])      ?? []),
    staffPurchases: spSnap.exists()
      ? ((spSnap.data().items   as FirestoreData['staffPurchases']) ?? [])
      : ((d.staffPurchases      as FirestoreData['staffPurchases']) ?? []),
    staffPayments: spaySnap.exists()
      ? ((spaySnap.data().items as FirestoreData['staffPayments'])  ?? [])
      : ((d.staffPayments       as FirestoreData['staffPayments'])  ?? []),
  }
}

export async function writeToFirestore(data: FirestoreData, deviceId?: string): Promise<void> {
  const products = data.products.map(({ image: _img, ...rest }) => rest)
  const now = Date.now()
  await Promise.all([
    setDoc(MAIN_DOC, {
      products,
      stocks:             data.stocks,
      staffMembers:       data.staffMembers,
      storeInfo:          data.storeInfo,
      storeOrder:         data.storeOrder,
      appSettings:        data.appSettings,
      stocktakeSnapshots: data.stocktakeSnapshots,
      categories:         data.categories  ?? [],
      makers:             data.makers      ?? [],
      dealers:            data.dealers     ?? [],
      dealerReps:         data.dealerReps  ?? [],
      lastModified:       now,
      lastModifiedBy:     deviceId ?? null,
    }),
    setDoc(TX_DOC,        { items: data.transactions,   lastModified: now }),
    setDoc(TRANSFERS_DOC, { items: data.transfers,       lastModified: now }),
    setDoc(SP_DOC,        { items: data.staffPurchases,  lastModified: now }),
    setDoc(SPAY_DOC,      { items: data.staffPayments,   lastModified: now }),
  ])
}

// ─── product-images コレクション（変更なし） ──────────────────────────────────

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
