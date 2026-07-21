export type StoreId = string
export type StoreFilter = string

export interface Product {
  id: string
  name: string
  category: string
  maker: string
  barcode: string
  purchasePrice: number
  sellPrice: number
  taxRate?: 8 | 10
  image?: string
  memo?: string
  dealer?: string
  dealerRep?: string
}

export interface StaffPurchase {
  id: string
  date: string
  productId: string        // empty string for manual entries
  quantity: number
  sellPriceAtPurchase: number  // pre-tax for catalog items; tax-included for manual items
  taxRate: 8 | 10
  purchasedBy: string
  recordedBy: string
  storeId: StoreId
  timestamp: number
  manualProductName?: string  // set when productId is empty (manual free-text entry)
}

export interface StoreStock {
  productId: string
  storeId: StoreId
  currentStock: number
  minStock: number
  active: boolean
}

export type OrderStatus = '下書き' | '発注中' | '発送済' | '本日到着' | '入荷済'

export interface OrderItem {
  productId: string
  orderedQty: number
  receivedQty: number
}

export interface Order {
  id: string
  vendor: string
  orderedAt: string
  expectedAt: string
  status: OrderStatus
  items: OrderItem[]
}

export type TransferStatus = '承認待ち' | '承認済' | '却下'

export interface Transaction {
  id: string
  type: 'receive' | 'dispense' | 'transfer'
  productId: string
  storeId: StoreId
  quantity: number
  relatedStoreId?: StoreId
  timestamp: number
}

export interface TransferItem {
  productId: string
  quantity: number
}

export interface Transfer {
  id: string
  fromStore: StoreId
  toStore: StoreId
  createdAt: string
  status: TransferStatus
  items: TransferItem[]
  memo?: string
}

export interface StocktakeItem {
  productId: string
  theoreticalStock: number
  actualStock: number | null
  diff: number | null
  status: '未確認' | '確認済' | '差異'
}

export interface StocktakeSnapshot {
  id: string
  month: string       // YYYY-MM
  date: string        // YYYY-MM-DD
  storeId: StoreId
  total: number       // 在庫合計金額 (実棚数 × 仕入単価)
  confirmedCount: number
  diffCount: number
  totalItems: number
}

export interface Stocktake {
  id: string
  storeId: StoreId
  month: string
  progress: number
  items: StocktakeItem[]
}

export interface Sale {
  id: string
  storeId: StoreId
  staffId: string
  productId: string
  quantity: number
  amount: number
  soldAt: string
}

export interface Staff {
  id: string
  name: string
  role: string
  storeId: StoreId
  hireDate: string
}
