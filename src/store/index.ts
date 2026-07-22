import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StoreFilter, StoreId, Product, StoreStock, Transaction, Transfer, TransferStatus, StaffPurchase, StocktakeSnapshot, StaffPayment } from '../types'

export interface StoreInfo {
  name: string
  phone: string
  address: string
  color: string
}

export interface AppSettings {
  minStockByStore: Record<string, number>
  notifyLowStock: boolean
  notifyLowStockByStore: Record<string, boolean>
  notifyOrder: boolean
  notifyTransfer: boolean
  notifyStocktake: boolean
  pin: string
}

const DEFAULT_STORE_INFO: Record<string, StoreInfo> = {
  flag: { name: 'flag 美容室', phone: '03-1234-5678', address: '東京都渋谷区...', color: '#2B5FA7' },
  lien: { name: 'Lien 美容室', phone: '03-8765-4321', address: '東京都新宿区...', color: '#8A4AA6' },
}
const DEFAULT_STORE_ORDER: string[] = ['flag', 'lien']

const DEFAULT_CATEGORIES = [
  'カラー剤', 'ブリーチ剤', 'カラーオキシ', 'パーマ剤', 'プレックス剤',
  '髪ドラ', 'oggi otto', 'H2', '処理剤', '小物類',
  'シャンプー', 'トリートメント', 'アウトバスTR', 'スタイリング', 'オイル',
]

const DEFAULT_MAKERS = [
  'ナカノ', 'フィヨーレ', 'テクノエイト', 'ルベル', '資生堂',
  'シュワルツコフ', 'ウェラ', 'ミルボン', 'アリミノ', 'ロレアル',
  'ナプラ', '田村治照堂', 'デミコスメティック', 'タマリス', 'b-ex',
  'ナンバースリー', 'ワイマック', 'ホーユー', 'ピュアセラボ', 'パイモア',
  'ミアン', 'ハホニコ', 'MADENA', 'アンダー７', 'STRI',
  'MTG', 'STELLA', 'アマトラ', 'マーキュリー', 'TIME',
  'サンコール', 'GO-ON', 'LOA', '髪ドラ',
]

const DEFAULT_APP_SETTINGS: AppSettings = {
  minStockByStore: { flag: 5, lien: 3 },
  notifyLowStock: true,
  notifyLowStockByStore: { flag: true, lien: true },
  notifyOrder: true,
  notifyTransfer: false,
  notifyStocktake: true,
  pin: '',
}

// Firestore に保存するデータ型（画像は除外）
export interface FirestoreData {
  products: Product[]
  stocks: StoreStock[]
  transactions: Transaction[]
  transfers: Transfer[]
  staffPurchases: StaffPurchase[]
  staffPayments: StaffPayment[]
  staffMembers: string[]
  storeInfo: Record<string, StoreInfo>
  storeOrder: string[]
  appSettings: AppSettings
  stocktakeSnapshots: StocktakeSnapshot[]
  categories: string[]
  makers: string[]
  dealers: string[]
  dealerReps: string[]
}

interface AppState {
  currentStore: StoreFilter
  setCurrentStore: (store: StoreFilter) => void
  storeInfo: Record<string, StoreInfo>
  storeOrder: string[]
  setStoreInfo: (storeId: string, info: StoreInfo) => void
  addStore: (name: string, color: string) => void
  removeStore: (id: string) => void
  appSettings: AppSettings
  setAppSettings: (s: Partial<AppSettings>) => void
  products: Product[]
  stocks: StoreStock[]
  upsertProduct: (product: Product) => void
  upsertStock: (stock: StoreStock) => void
  deleteProduct: (id: string) => void
  bulkDeleteProducts: (ids: string[]) => void
  reorderProducts: (activeId: string, overId: string) => void
  bulkUpdateCategory: (ids: string[], category: string) => void
  bulkUpdateStocks: (
    ids: string[],
    flagPatch: Partial<Pick<StoreStock, 'active' | 'minStock'>> | null,
    lienPatch: Partial<Pick<StoreStock, 'active' | 'minStock'>> | null,
  ) => void
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id' | 'timestamp'> & { timestamp?: number }) => void
  deleteTransaction: (id: string) => void
  transfers: Transfer[]
  addTransfer: (t: Omit<Transfer, 'id' | 'createdAt' | 'status'>) => void
  approveTransfer: (id: string) => void
  rejectTransfer: (id: string) => void
  directTransfer: (fromStore: StoreId, toStore: StoreId, productId: string, quantity: number, memo?: string) => void
  deleteTransfer: (id: string) => void
  staffPurchases: StaffPurchase[]
  addStaffPurchase: (p: Omit<StaffPurchase, 'id' | 'timestamp'>) => void
  deleteStaffPurchase: (id: string) => void
  staffPayments: StaffPayment[]
  addStaffPayment: (p: Omit<StaffPayment, 'id' | 'timestamp'>) => void
  deleteStaffPayment: (id: string) => void
  staffMembers: string[]
  addStaffMember: (name: string) => void
  removeStaffMember: (name: string) => void
  stocktakeSnapshots: StocktakeSnapshot[]
  addStocktakeSnapshot: (s: Omit<StocktakeSnapshot, 'id'>) => void
  deleteStocktakeSnapshot: (id: string) => void
  categories: string[]
  addCategory: (name: string) => void
  removeCategory: (name: string) => void
  makers: string[]
  addMaker: (name: string) => void
  removeMaker: (name: string) => void
  dealers: string[]
  addDealer: (name: string) => void
  removeDealer: (name: string) => void
  dealerReps: string[]
  addDealerRep: (name: string) => void
  removeDealerRep: (name: string) => void
  setProductImages: (images: Record<string, string>) => void
  loadFromFirestore: (data: FirestoreData) => void
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

const initialProducts: Product[] = [
  // ブリーチ剤
  { id: '26', name: 'アクセスフリー',      category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 2030, sellPrice: 2900 },
  { id: '27', name: 'ヴィーガンブリーチ',  category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 2713, sellPrice:    0 },
  { id: '28', name: 'クレイブリーチ',      category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 2800, sellPrice: 3800 },
  { id: '29', name: 'アリミノ１２０',      category: 'ブリーチ剤', maker: 'アリミノ', barcode: '', purchasePrice: 2660, sellPrice: 3800 },
  { id: '30', name: 'ティントエスケープ',  category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 1400, sellPrice: 2000 },
  // カラーオキシ
  { id: '31', name: 'イルミナディベロッパー 1.5%',  category: 'カラーオキシ', maker: 'ウエラ',     barcode: '', purchasePrice:  960, sellPrice: 1200 },
  { id: '32', name: 'イルミナディベロッパー 6%',    category: 'カラーオキシ', maker: 'ウエラ',     barcode: '', purchasePrice:  960, sellPrice: 1200 },
  { id: '33', name: 'サスティノ 6%',               category: 'カラーオキシ', maker: 'デミ',       barcode: '', purchasePrice: 1040, sellPrice: 1600 },
  { id: '34', name: 'オキシプレックス 6%',          category: 'カラーオキシ', maker: '',           barcode: '', purchasePrice:  600, sellPrice:  600 },
  { id: '35', name: 'オキシプレックス 3%',          category: 'カラーオキシ', maker: '',           barcode: '', purchasePrice:  600, sellPrice:  600 },
  { id: '36', name: 'フィヨーレオキシ 3%',          category: 'カラーオキシ', maker: 'フィヨーレ', barcode: '', purchasePrice:  828, sellPrice:    0 },
  { id: '37', name: 'フィォーレ OX1.5% 2Lパウチ',  category: 'カラーオキシ', maker: 'フィヨーレ', barcode: '', purchasePrice:  828, sellPrice: 1500 },
  { id: '38', name: 'ナカノオキシ 2%',              category: 'カラーオキシ', maker: 'ナカノ',     barcode: '', purchasePrice:  840, sellPrice: 1200 },
  { id: '39', name: 'アジアンフェスオキシ 6%',      category: 'カラーオキシ', maker: 'ナプラ',     barcode: '', purchasePrice:  910, sellPrice:    0 },
  { id: '40', name: 'アジアンフェスオキシ 2.8%',    category: 'カラーオキシ', maker: 'ナプラ',     barcode: '', purchasePrice:  910, sellPrice:    0 },
  { id: '41', name: 'フィヨーレカラーオキシ AC 6%', category: 'カラーオキシ', maker: 'フィヨーレ', barcode: '', purchasePrice: 1380, sellPrice: 2000 },
  { id: '42', name: 'フィヨーレカラーオキシ AC3%',  category: 'カラーオキシ', maker: 'フィヨーレ', barcode: '', purchasePrice: 1380, sellPrice: 2000 },
  { id: '43', name: 'フィヨーレクリームオキシ 6%',  category: 'カラーオキシ', maker: 'フィヨーレ', barcode: '', purchasePrice: 1870, sellPrice: 2200 },
  { id: '44', name: 'フィヨーレクリームオキシ 3%',  category: 'カラーオキシ', maker: 'フィヨーレ', barcode: '', purchasePrice: 1870, sellPrice: 2200 },
  { id: '45', name: 'H2パウダー', category: 'H2', maker: '', barcode: '', purchasePrice: 9970, sellPrice: 0 },
  { id: '46', name: 'Wエフェクト', category: 'H2', maker: '', barcode: '', purchasePrice: 2100, sellPrice: 3500 },
  { id: '47', name: 'Wエフェクト　1000ml', category: 'H2', maker: '', barcode: '', purchasePrice: 5700, sellPrice: 9500 },
  { id: '48', name: 'アシッドウォーター', category: 'H2', maker: '', barcode: '', purchasePrice: 5000, sellPrice: 5000 },
  { id: '49', name: 'シナジーザパウダートリートメント 1000g', category: 'H2', maker: '', barcode: '', purchasePrice: 12000, sellPrice: 12000 },
  { id: '50', name: 'パウダートリートメント 100g', category: 'H2', maker: '', barcode: '', purchasePrice: 15000, sellPrice: 15000 },
  { id: '51', name: 'Exchange H2シャンプー レフィル', category: 'H2', maker: '', barcode: '', purchasePrice: 6300, sellPrice: 10500 },
  { id: '52', name: 'Exchange H2トリートメント レフィル', category: 'H2', maker: '', barcode: '', purchasePrice: 6300, sellPrice: 10500 },
  { id: '53', name: 'Exchange H2 カプセル', category: 'H2', maker: '', barcode: '', purchasePrice: 3240, sellPrice: 5400 },
  { id: '54', name: 'Exchange+ H2 プレミアムヘアミルク 100ml', category: 'H2', maker: '', barcode: '', purchasePrice: 2400, sellPrice: 4000 },
  { id: '55', name: 'Exchange+H2 ヘアマスク 250ml', category: 'H2', maker: '', barcode: '', purchasePrice: 3000, sellPrice: 5000 },
  { id: '56', name: 'Exchange H2シャンプー', category: 'H2', maker: '', barcode: '', purchasePrice: 2880, sellPrice: 4800 },
  { id: '57', name: 'Exchange H2トリートメント', category: 'H2', maker: '', barcode: '', purchasePrice: 2880, sellPrice: 4800 },
  { id: '58', name: 'ｵｯｼﾞｨｵｯﾄｽｷｬﾙﾌﾟｹｱｼﾞｪﾙ 130g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1056, sellPrice: 2200 },
  { id: '59', name: 'ｵｯｼﾞｨｵｯﾄﾎﾞﾀﾆｶﾙﾘｯﾁﾊﾞｰﾑ 50g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1478, sellPrice: 3080 },
  { id: '60', name: 'ｵｯｼﾞｨｵｯﾄCMCﾄﾗｲｱﾙｾｯﾄ', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1626, sellPrice: 3388 },
  { id: '61', name: 'ｵｯｼﾞｨｵｯﾄDrsｲﾝﾌﾟﾚｯｼﾌﾞｾﾗﾑﾌﾞﾗｯｸ 700ml', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4910, sellPrice: 10230 },
  { id: '62', name: 'ｵｯｼﾞｨｵｯﾄDrsｲﾝﾌﾟﾚｯｼﾌﾞｾﾗﾑﾏｽｸﾌﾞﾗｯｸ 700g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 8184, sellPrice: 17050 },
  { id: '63', name: 'oggi Sh250g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1848, sellPrice: 3850 },
  { id: '64', name: 'oggi ムータグランドセラムSh300ml', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 3360, sellPrice: 7000 },
  { id: '65', name: 'oggi ムータグランドセラムSh レフィル', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 6240, sellPrice: 13000 },
  { id: '66', name: 'oggi ボトル', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 408, sellPrice: 850 },
  { id: '67', name: 'oggi otto シャンプー レフィル700ml', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4118, sellPrice: 8580 },
  { id: '68', name: 'oggi otto トリートメント レフィル700g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 5702, sellPrice: 11880 },
  { id: '69', name: 'oggi otto トリートメント 180g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1848, sellPrice: 3850 },
  { id: '70', name: 'oggi otto ムータトリートメント 210g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 3360, sellPrice: 7000 },
  { id: '71', name: 'oggi otto ムータトリートメント レフィル', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 8928, sellPrice: 18600 },
  { id: '72', name: 'CMCミルキィ', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1848, sellPrice: 3850 },
  { id: '73', name: 'CMCオイル', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1901, sellPrice: 3960 },
  { id: '74', name: 'oggi オイルスプレー', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1478, sellPrice: 3080 },
  { id: '75', name: 'ムータグランドミスト', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2400, sellPrice: 5000 },
  { id: '76', name: 'ムータグランドエマルジョン150g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2544, sellPrice: 5300 },
  { id: '77', name: 'ムータグランドオイル', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2640, sellPrice: 5500 },
  { id: '78', name: 'スキャルプエッセンス100ml', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4224, sellPrice: 8800 },
  { id: '79', name: 'Drs セラムマスク130g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1584, sellPrice: 3300 },
  { id: '80', name: 'Drsインプレッシブセラム　300', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2640, sellPrice: 5500 },
  { id: '81', name: 'Drsインプレッシブセラムマスク180g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2640, sellPrice: 5500 },
  { id: '82', name: 'Drsトライアルセット', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1320, sellPrice: 2750 },
  { id: '83', name: 'CMCミルキィ 450g', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 3360, sellPrice: 7000 },
  { id: '84', name: 'Drsスキャルプマスク1000ml', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4224, sellPrice: 8800 },
  { id: '85', name: 'Drsスキャルプジェル1000ml', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 1440, sellPrice: 3000 },
  { id: '86', name: 'RL', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2352, sellPrice: 4900 },
  { id: '87', name: 'BCC', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2496, sellPrice: 5200 },
  { id: '88', name: 'SCO', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 5760, sellPrice: 12000 },
  { id: '89', name: 'VCM', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2736, sellPrice: 5700 },
  { id: '90', name: 'MCM', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 3360, sellPrice: 7000 },
  { id: '91', name: 'PU', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4435, sellPrice: 9240 },
  { id: '92', name: 'BC', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4435, sellPrice: 9240 },
  { id: '93', name: 'HP', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 2640, sellPrice: 5500 },
  { id: '94', name: 'CH', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4032, sellPrice: 8400 },
  { id: '95', name: 'BM', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 4032, sellPrice: 8400 },
  { id: '96', name: 'AA', category: 'oggi otto', maker: '', barcode: '', purchasePrice: 3456, sellPrice: 7200 },
  { id: '97', name: 'フレディカトゥーコスメ パーマ剤', category: 'パーマ剤', maker: '', barcode: '', purchasePrice: 960, sellPrice: 1200 },
  { id: '98', name: 'ｸｵﾗｲﾝCA', category: 'パーマ剤', maker: '', barcode: '', purchasePrice: 1260, sellPrice: 1800 },
  { id: '99', name: 'ｸｵﾗｲﾝT', category: 'パーマ剤', maker: '', barcode: '', purchasePrice: 1050, sellPrice: 1500 },
  { id: '100', name: 'ｱｼﾞｬｽﾄ0', category: 'パーマ剤', maker: '', barcode: '', purchasePrice: 1400, sellPrice: 2000 },
  { id: '101', name: 'カールマイン加水・ブロム', category: 'パーマ剤', maker: '', barcode: '', purchasePrice: 930, sellPrice: 930 },
  { id: '102', name: 'デジキュア プレミアム02 400ｍｌ', category: 'パーマ剤', maker: '', barcode: '', purchasePrice: 1500, sellPrice: 0 },
  { id: '103', name: 'ケミア　アルカリ１００g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 4800, sellPrice: 4800 },
  { id: '104', name: 'ケラフェクト500g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 14000, sellPrice: 14000 },
  { id: '105', name: 'Xブースター', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 8000, sellPrice: 8000 },
  { id: '106', name: 'GEL PLEX', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 5148, sellPrice: 5720 },
  { id: '107', name: 'トステア', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 22000, sellPrice: 22000 },
  { id: '108', name: 'POWDER PLEX WHITE150g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 10670, sellPrice: 12100 },
  { id: '109', name: 'POWDER PLEX CMC Refill330g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 2100, sellPrice: 26400 },
  { id: '110', name: 'POWDER PLEX G/R/Y/B/Refill 1035g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 42000, sellPrice: 52800 },
  { id: '111', name: 'POWDER PLEX G/R/Y/B/Refill 495g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 21000, sellPrice: 26400 },
  { id: '112', name: 'ｸﾞﾘｯﾀｰﾎﾞﾝﾄﾞKC', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 7000, sellPrice: 7000 },
  { id: '113', name: 'ｸﾞﾘｯﾀｰCBｱｼｯﾄﾞ', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 8500, sellPrice: 8500 },
  { id: '114', name: 'POWDER PLEX G/R/Y/B/Refill 150g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 7700, sellPrice: 8800 },
  { id: '115', name: 'POWDER PLEX WHITE495g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 29100, sellPrice: 36300 },
  { id: '116', name: 'POWDER PLEX WHITE1035g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 58200, sellPrice: 72600 },
  { id: '117', name: 'POWDER PLEX SUPERRED 150g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 7800, sellPrice: 9680 },
  { id: '118', name: 'POWDER PLEX SUPERRED 495g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 23400, sellPrice: 29040 },
  { id: '119', name: 'POWDER PLEX SUPERRED 1035g', category: 'プレックス剤', maker: '', barcode: '', purchasePrice: 46800, sellPrice: 58080 },
  { id: '120', name: 'シェルパ クローズキープマスク', category: '処理剤', maker: '', barcode: '', purchasePrice: 2352, sellPrice: 3360 },
  { id: '121', name: 'シェルパ コアプロテクトミルク', category: '処理剤', maker: '', barcode: '', purchasePrice: 4340, sellPrice: 6200 },
  { id: '122', name: 'シェルパ ボンド メモリアリキッド', category: '処理剤', maker: '', barcode: '', purchasePrice: 2940, sellPrice: 4200 },
  { id: '123', name: 'シェルパ ベースエイドミスト', category: '処理剤', maker: '', barcode: '', purchasePrice: 1470, sellPrice: 2100 },
  { id: '124', name: 'X TREATMENT 3', category: '処理剤', maker: '', barcode: '', purchasePrice: 8000, sellPrice: 8000 },
  { id: '125', name: 'X TREATMENT 4', category: '処理剤', maker: '', barcode: '', purchasePrice: 4000, sellPrice: 4000 },
  { id: '126', name: 'X TREATMENT 1、2', category: '処理剤', maker: '', barcode: '', purchasePrice: 10000, sellPrice: 10000 },
  { id: '127', name: 'KATSUO', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2800, sellPrice: 2800 },
  { id: '128', name: 'WAKAME', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2700, sellPrice: 2700 },
  { id: '129', name: 'グッピー', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2000, sellPrice: 2000 },
  { id: '130', name: 'シャケ', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2500, sellPrice: 2500 },
  { id: '131', name: 'BBQ', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 3300, sellPrice: 3300 },
  { id: '132', name: 'ANa-5', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 5400, sellPrice: 5400 },
  { id: '133', name: 'HIKarin', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 4400, sellPrice: 4400 },
  { id: '134', name: 'NUmerin', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 6200, sellPrice: 6200 },
  { id: '135', name: 'MAS-o', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 4800, sellPrice: 4800 },
  { id: '136', name: 'トドメOX', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 1300, sellPrice: 1300 },
  { id: '137', name: 'GMT', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 3100, sellPrice: 3100 },
  { id: '138', name: 'KAPPA', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2500, sellPrice: 2500 },
  { id: '139', name: 'リセットシャンプー', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 4600, sellPrice: 4600 },
  { id: '140', name: 'レシーブ', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 6800, sellPrice: 6800 },
  { id: '141', name: 'つるりんちょ。ブースターシャンプー', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2280, sellPrice: 3800 },
  { id: '142', name: 'つるりんちょ。SARARITO レフィル', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 5040, sellPrice: 8400 },
  { id: '143', name: 'つるりんちょ。シャンプー', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2580, sellPrice: 4300 },
  { id: '144', name: 'つるりんちょ。1Lシャンプー', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 4560, sellPrice: 7600 },
  { id: '145', name: 'つるりんちょ。トリートメント', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2760, sellPrice: 4600 },
  { id: '146', name: 'つるりんちょ。1Lトリートメント', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 5040, sellPrice: 8400 },
  { id: '147', name: 'つるりんちょ。シャンプーREPAIR', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2580, sellPrice: 4300 },
  { id: '148', name: 'つるりんちょ。1LシャンプーREPAIR', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 4560, sellPrice: 7600 },
  { id: '149', name: 'つるりんちょ。トリートメントREPAIR', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2760, sellPrice: 4600 },
  { id: '150', name: 'つるりんちょ。1LトリートメントREPAIR', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 5040, sellPrice: 8400 },
  { id: '151', name: 'いるかのせなか。フォームトリートメント', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2160, sellPrice: 3600 },
  { id: '152', name: 'いるかのせなか。オイル', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 1980, sellPrice: 3600 },
  { id: '153', name: 'いるかのせなか。ミスト', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 1800, sellPrice: 3300 },
  { id: '154', name: 'いるかのせなか。ミルク', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 2340, sellPrice: 3900 },
  { id: '155', name: 'ツインブラシ', category: '髪ドラ', maker: '', barcode: '', purchasePrice: 1450, sellPrice: 1450 },
  { id: '156', name: 'トエル1', category: '小物類', maker: '', barcode: '', purchasePrice: 2325, sellPrice: 0 },
  { id: '157', name: 'トエル2', category: '小物類', maker: '', barcode: '', purchasePrice: 2325, sellPrice: 0 },
  { id: '158', name: 'ヒトヨニ', category: '小物類', maker: '', barcode: '', purchasePrice: 1260, sellPrice: 1800 },
  { id: '159', name: 'ﾓﾃﾞﾆｶﾅﾁｭﾗﾙM 150', category: '小物類', maker: '', barcode: '', purchasePrice: 1416, sellPrice: 2530 },
  { id: '160', name: 'ﾓﾃﾞﾆｶﾅﾁｭﾗﾙF 200', category: '小物類', maker: '', barcode: '', purchasePrice: 1416, sellPrice: 2530 },
  { id: '161', name: 'UVスプレー', category: '小物類', maker: '', barcode: '', purchasePrice: 585, sellPrice: 1200 },
  { id: '162', name: 'モロッカンオイル200ml', category: '小物類', maker: '', barcode: '', purchasePrice: 4300, sellPrice: 0 },
  { id: '163', name: 'リファ ロックオイル', category: '小物類', maker: '', barcode: '', purchasePrice: 1440, sellPrice: 2400 },
  { id: '164', name: 'リファ ミルク', category: '小物類', maker: '', barcode: '', purchasePrice: 1440, sellPrice: 2400 },
  { id: '165', name: 'リファ OIL BLOOM', category: '小物類', maker: '', barcode: '', purchasePrice: 1527, sellPrice: 2545 },
  { id: '166', name: 'モデニカナチュラルJ', category: '小物類', maker: '', barcode: '', purchasePrice: 1108, sellPrice: 1980 },
  { id: '167', name: 'ロアザオイル(LOA) ブルークレール 100ml', category: '小物類', maker: '', barcode: '', purchasePrice: 1108, sellPrice: 5000 },
  { id: '168', name: 'ロアザオイル(LOA) ペアブランシュ 100ml', category: '小物類', maker: '', barcode: '', purchasePrice: 1108, sellPrice: 5000 },
  { id: '169', name: 'ロアザオイル(LOA) ノワール 100ml', category: '小物類', maker: '', barcode: '', purchasePrice: 1108, sellPrice: 5000 },
  { id: '170', name: 'ジェイドJロアザオイル ブロンシュ', category: '小物類', maker: '', barcode: '', purchasePrice: 3500, sellPrice: 5000 },
  { id: '171', name: 'ジェイドJロアザオイル シトラスヴェール', category: '小物類', maker: '', barcode: '', purchasePrice: 3500, sellPrice: 5000 },
  { id: '172', name: 'ジェイドJロアザオイル ジャスミンドア', category: '小物類', maker: '', barcode: '', purchasePrice: 3500, sellPrice: 5000 },
  { id: '173', name: 'ジェイドJネロリスモークティー', category: '小物類', maker: '', barcode: '', purchasePrice: 3500, sellPrice: 5000 },
  { id: '174', name: 'ジェイドJミスティックウッド', category: '小物類', maker: '', barcode: '', purchasePrice: 3500, sellPrice: 5000 },
  { id: '175', name: 'ジェイドJミスティックウッド(バーム）', category: '小物類', maker: '', barcode: '', purchasePrice: 3150, sellPrice: 4500 },
  { id: '176', name: 'ジェイドJシトラスヴェール(バーム）', category: '小物類', maker: '', barcode: '', purchasePrice: 3150, sellPrice: 4500 },
  { id: '177', name: 'ジェイドJブロンシュ(バーム）', category: '小物類', maker: '', barcode: '', purchasePrice: 3150, sellPrice: 4500 },
  { id: '178', name: 'ジェイドJジェイドJロアザオイル ビーチクラブ', category: '小物類', maker: '', barcode: '', purchasePrice: 4200, sellPrice: 6000 },
  { id: '179', name: 'ロアザオイル(LOA) UVスプレーブルークレール', category: '小物類', maker: '', barcode: '', purchasePrice: 2800, sellPrice: 4000 },
  { id: '180', name: 'エレベート10F', category: '小物類', maker: '', barcode: '', purchasePrice: 1170, sellPrice: 1800 },
  { id: '181', name: 'NEW tackオイル', category: '小物類', maker: '', barcode: '', purchasePrice: 2660, sellPrice: 3800 },
  { id: '182', name: 'track バーム', category: '小物類', maker: '', barcode: '', purchasePrice: 1300, sellPrice: 2000 },
  { id: '183', name: 'tackオイル No１?３', category: '小物類', maker: '', barcode: '', purchasePrice: 2660, sellPrice: 3800 },
  { id: '184', name: 'アルタイム　リペア　ミスト', category: '小物類', maker: '', barcode: '', purchasePrice: 1900, sellPrice: 3800 },
  { id: '185', name: 'アルタイム　リペア　ミルク', category: '小物類', maker: '', barcode: '', purchasePrice: 1900, sellPrice: 3800 },
  { id: '186', name: 'アルタイム　リペア　オイル', category: '小物類', maker: '', barcode: '', purchasePrice: 1900, sellPrice: 3800 },
  { id: '187', name: 'モロッカンオイル100ml', category: '小物類', maker: '', barcode: '', purchasePrice: 2580, sellPrice: 4500 },
  { id: '188', name: 'ｼﾙｷｰｽﾌﾟﾚｰ 180g', category: '小物類', maker: '', barcode: '', purchasePrice: 700, sellPrice: 1500 },
  { id: '189', name: 'ツクヨミ100g', category: '小物類', maker: '', barcode: '', purchasePrice: 1300, sellPrice: 2700 },
  { id: '190', name: 'ツクヨミ300g', category: '小物類', maker: '', barcode: '', purchasePrice: 2320, sellPrice: 5800 },
  { id: '191', name: 'アマテラス', category: '小物類', maker: '', barcode: '', purchasePrice: 4500, sellPrice: 0 },
  { id: '192', name: 'ｻﾛﾝｵﾝﾘｰ ｺﾝﾃﾞｨｼｮﾅｰ', category: '小物類', maker: '', barcode: '', purchasePrice: 1085, sellPrice: 0 },
  { id: '193', name: 'トキオ プレシャンプー', category: '小物類', maker: '', barcode: '', purchasePrice: 2800, sellPrice: 0 },
  { id: '194', name: 'クオリシアSh 250', category: '小物類', maker: '', barcode: '', purchasePrice: 1064, sellPrice: 1700 },
  { id: '195', name: 'ブリーチキャンセルBL', category: '小物類', maker: '', barcode: '', purchasePrice: 1680, sellPrice: 0 },
  { id: '196', name: 'ハロー　グッバイ', category: '小物類', maker: '', barcode: '', purchasePrice: 840, sellPrice: 1600 },
  { id: '197', name: 'サロンオンリーシャンプー', category: '小物類', maker: '', barcode: '', purchasePrice: 1085, sellPrice: 0 },
  { id: '198', name: 'セルバイウェイト　sh tr', category: '小物類', maker: '', barcode: '', purchasePrice: 11840, sellPrice: 14800 },
  { id: '199', name: 'ecoシャンプー5L', category: '小物類', maker: '', barcode: '', purchasePrice: 6080, sellPrice: 7600 },
  { id: '200', name: 'TOKIO IE インカラミシャンプー 700mlレフィル', category: '小物類', maker: '', barcode: '', purchasePrice: 4200, sellPrice: 6600 },
  { id: '201', name: 'TOKIO IE インカラミシャンプー400ポンプ', category: '小物類', maker: '', barcode: '', purchasePrice: 2800, sellPrice: 4400 },
  { id: '202', name: 'TOKIO IE インカラミトリートメント400ポンプ', category: '小物類', maker: '', barcode: '', purchasePrice: 2940, sellPrice: 4620 },
  { id: '203', name: 'TOKIO IE インカラミトリートメント700レフィル', category: '小物類', maker: '', barcode: '', purchasePrice: 4340, sellPrice: 6820 },
  { id: '204', name: 'TOKIO IE アウトカラミオイル', category: '小物類', maker: '', barcode: '', purchasePrice: 2240, sellPrice: 3520 },
  { id: '205', name: 'AMASIA HOME', category: '小物類', maker: '', barcode: '', purchasePrice: 1050, sellPrice: 1050 },
  { id: '206', name: 'アフィア コネクト 5N', category: '小物類', maker: '', barcode: '', purchasePrice: 784, sellPrice: 1400 },
  { id: '207', name: 'ｱﾏﾄﾗ 　ﾋﾟｭｱ 250ml　SH', category: '小物類', maker: '', barcode: '', purchasePrice: 1904, sellPrice: 3400 },
  { id: '208', name: 'ｱﾏﾄﾗ 　ﾋﾟｭｱ 詰替 500ml　SH', category: '小物類', maker: '', barcode: '', purchasePrice: 3136, sellPrice: 5600 },
  { id: '209', name: 'ｱﾏﾄﾗ 　ﾃﾞｨｰﾌﾟ 250ml　SH', category: '小物類', maker: '', barcode: '', purchasePrice: 2016, sellPrice: 3600 },
  { id: '210', name: 'ｱﾏﾄﾗ 　ﾃﾞｨｰﾌﾟ 詰替 500ml　SH', category: '小物類', maker: '', barcode: '', purchasePrice: 3416, sellPrice: 6100 },
  { id: '211', name: 'ｱﾏﾄﾗ 　ﾋﾟｭｱ 200g　　　TR', category: '小物類', maker: '', barcode: '', purchasePrice: 2128, sellPrice: 3800 },
  { id: '212', name: 'ｱﾏﾄﾗ 　ﾋﾟｭｱ 詰替 500g　TR', category: '小物類', maker: '', barcode: '', purchasePrice: 3920, sellPrice: 7000 },
  { id: '213', name: 'ｱﾏﾄﾗ 　ﾃﾞｨｰﾌﾟ 200g　　TR', category: '小物類', maker: '', barcode: '', purchasePrice: 2240, sellPrice: 4000 },
  { id: '214', name: 'ｱﾏﾄﾗ　ﾃﾞｨｰﾌﾟ 詰替 500g　TR', category: '小物類', maker: '', barcode: '', purchasePrice: 4088, sellPrice: 7300 },
  { id: '215', name: 'ｱﾏﾄﾗ ｱﾌｨｱ ｶｼﾐﾔｻﾎﾞﾝ ﾋﾟｭｱ ﾎﾞﾄﾙｾｯﾄ詰替 500ml', category: '小物類', maker: '', barcode: '', purchasePrice: 3808, sellPrice: 6800 },
  { id: '216', name: 'ｱﾏﾄﾗ ｱﾌｨｱ ｶｼﾐﾔｻﾎﾞﾝ ﾃﾞｨｰﾌﾟ ﾎﾞﾄﾙｾｯﾄ 詰替 500ml', category: '小物類', maker: '', barcode: '', purchasePrice: 4088, sellPrice: 7300 },
  { id: '217', name: 'ｱﾏﾄﾗ ｱﾌｨｱ ｶｼﾐﾔﾏｽｸ ﾃﾞｨｰﾌﾟ ﾎﾞﾄﾙｾｯﾄ 詰替 500g', category: '小物類', maker: '', barcode: '', purchasePrice: 4760, sellPrice: 8500 },
  { id: '218', name: 'ｱﾏﾄﾗ ｱﾌｨｱ ｶｼﾐﾔﾏｽｸ ﾋﾟｭｱ ﾎﾞﾄﾙｾｯﾄ 詰替 500g', category: '小物類', maker: '', barcode: '', purchasePrice: 3808, sellPrice: 8200 },
  { id: '219', name: 'ｱﾏﾄﾗ ｱﾌｨｱ ﾆｭｱﾝｽﾊﾞﾀｰ N 50g', category: '小物類', maker: '', barcode: '', purchasePrice: 2016, sellPrice: 3600 },
  { id: '220', name: 'ｱﾏﾄﾗ ｱﾌｨｱ ﾃｸｽﾁｬｰｵｲﾙ N 50ml', category: '小物類', maker: '', barcode: '', purchasePrice: 2016, sellPrice: 3600 },
  { id: '221', name: 'ｱﾌｨｱ ｺﾈｸﾄ 1N 詰替 500ml', category: '小物類', maker: '', barcode: '', purchasePrice: 3040, sellPrice: 3800 },
  { id: '222', name: 'ｱﾌｨｱ ｺﾈｸﾄ 2N 詰替 500ml', category: '小物類', maker: '', barcode: '', purchasePrice: 3040, sellPrice: 3800 },
  { id: '223', name: 'ｱﾌｨｱ ｺﾈｸﾄ 3N 詰替 500g', category: '小物類', maker: '', barcode: '', purchasePrice: 3600, sellPrice: 4500 },
  { id: '224', name: 'ｱﾌｨｱ ｺﾈｸﾄ 4α 詰替 450g', category: '小物類', maker: '', barcode: '', purchasePrice: 3360, sellPrice: 4200 },
  { id: '225', name: 'ｱﾌｨｱ ｺﾈｸﾄ 4β 詰替 450g', category: '小物類', maker: '', barcode: '', purchasePrice: 3360, sellPrice: 4200 },
  { id: '226', name: 'ｱﾌｨｱ ｺﾈｸﾄ +N 詰替 130g', category: '小物類', maker: '', barcode: '', purchasePrice: 1440, sellPrice: 1800 },
  { id: '227', name: 'ESTANDARD シャンプー 2000ml', category: '小物類', maker: '', barcode: '', purchasePrice: 10360, sellPrice: 14800 },
  { id: '228', name: 'ESTANDARD キューティクル 2000ml', category: '小物類', maker: '', barcode: '', purchasePrice: 10360, sellPrice: 14800 },
  { id: '229', name: 'ESTANDARD シャンプー600ml', category: '小物類', maker: '', barcode: '', purchasePrice: 4060, sellPrice: 5800 },
  { id: '230', name: 'ESTANDARD キューティクル 600ml', category: '小物類', maker: '', barcode: '', purchasePrice: 4060, sellPrice: 5800 },
  { id: '231', name: 'NOTTO T-1', category: '小物類', maker: '', barcode: '', purchasePrice: 4760, sellPrice: 4760 },
  { id: '232', name: 'NOTTO T-2', category: '小物類', maker: '', barcode: '', purchasePrice: 1200, sellPrice: 12000 },
  { id: '233', name: 'NOTTO T-3', category: '小物類', maker: '', barcode: '', purchasePrice: 5000, sellPrice: 5000 },
  { id: '234', name: 'ポンプウォーマー', category: '小物類', maker: '', barcode: '', purchasePrice: 800, sellPrice: 800 },
  { id: '235', name: 'T-2空容器', category: '小物類', maker: '', barcode: '', purchasePrice: 500, sellPrice: 500 },
  { id: '236', name: 'T-3空容器', category: '小物類', maker: '', barcode: '', purchasePrice: 500, sellPrice: 500 },
  { id: '237', name: 'ﾊﾂﾓｰﾙDNAｽｶｰﾌｿｰﾌﾟ350', category: '小物類', maker: '', barcode: '', purchasePrice: 1456, sellPrice: 2600 },
  { id: '238', name: 'ラップ', category: '小物類', maker: '', barcode: '', purchasePrice: 298, sellPrice: 0 },
  { id: '239', name: 'フェイスガーゼ 150枚入り', category: '小物類', maker: '', barcode: '', purchasePrice: 450, sellPrice: 0 },
  { id: '240', name: 'キスキメッシュLL', category: '小物類', maker: '', barcode: '', purchasePrice: 468, sellPrice: 0 },
  { id: '241', name: 'シャンプークロス', category: '小物類', maker: '', barcode: '', purchasePrice: 240, sellPrice: 0 },
  { id: '242', name: 'V3ｼｬｲﾆﾝｸﾞﾌｧﾝﾃﾞｰｼｮﾝ15', category: '小物類', maker: '', barcode: '', purchasePrice: 4250, sellPrice: 8500 },
  { id: '243', name: 'V3ﾌﾞﾘﾘｱﾝﾄﾌｧﾝﾃﾞｰｼｮﾝ15（レフィル）', category: '小物類', maker: '', barcode: '', purchasePrice: 3750, sellPrice: 7500 },
  { id: '244', name: 'ﾋﾟｯｸｱｯﾌﾟ ﾃﾞｽｸﾍﾟｰﾊﾟｰ LL', category: '小物類', maker: '', barcode: '', purchasePrice: 513, sellPrice: 570 },
  { id: '245', name: 'スローコンシーラーブラウン', category: '小物類', maker: '', barcode: '', purchasePrice: 1568, sellPrice: 2800 },
  { id: '246', name: 'スローコンシーラーライトブラウン', category: '小物類', maker: '', barcode: '', purchasePrice: 1568, sellPrice: 2800 },
  { id: '247', name: 'ハウス用スペアペーパーL', category: '小物類', maker: '', barcode: '', purchasePrice: 2277, sellPrice: 2530 },
  { id: '248', name: 'オカモトブラックグローブ５０枚入', category: '小物類', maker: '', barcode: '', purchasePrice: 3060, sellPrice: 4500 },
  { id: '249', name: 'コールドペーパーXL', category: '小物類', maker: '', barcode: '', purchasePrice: 687, sellPrice: 0 },
  { id: '250', name: 'コールドペーパーL', category: '小物類', maker: '', barcode: '', purchasePrice: 394, sellPrice: 0 },
  { id: '251', name: 'ｻﾎﾞﾆｰｽﾞ ｽｰﾊﾟｰﾌﾟﾛﾃｸﾄ ｼﾞｪﾙ500ml頭皮ｶﾞｰﾄﾞ', category: '小物類', maker: '', barcode: '', purchasePrice: 1920, sellPrice: 2400 },
  { id: '252', name: 'ｻﾎﾞﾆｰｽﾞ ｽｰﾊﾟｰﾌﾟﾛﾃｸﾄ ｸﾘｰﾑ500g詰替ﾘﾌｨﾙ', category: '小物類', maker: '', barcode: '', purchasePrice: 2720, sellPrice: 3400 },
  { id: '253', name: 'すずらん耳キャップ１００枚入', category: '小物類', maker: '', barcode: '', purchasePrice: 792, sellPrice: 880 },
  { id: '254', name: 'ｴﾊﾞｰﾒｲﾄ ﾌﾞﾘｰﾁﾝｸﾞﾍﾟｰﾊﾟｰ 200枚入', category: '小物類', maker: '', barcode: '', purchasePrice: 600, sellPrice: 600 },
  { id: '255', name: 'アイビルエコホイルシルバー', category: '小物類', maker: '', barcode: '', purchasePrice: 0, sellPrice: 0 },
  { id: '256', name: 'ネックシャッター', category: '小物類', maker: '', barcode: '', purchasePrice: 1100, sellPrice: 0 },
  { id: '257', name: 'サンコールリムーバ', category: '小物類', maker: '', barcode: '', purchasePrice: 784, sellPrice: 980 },
  { id: '258', name: 'グローパック', category: '小物類', maker: '', barcode: '', purchasePrice: 14400, sellPrice: 18000 },
  { id: '259', name: 'グローパック（一回分）', category: '小物類', maker: '', barcode: '', purchasePrice: 1440, sellPrice: 2500 },
  { id: '260', name: 'アマトラスターター', category: '小物類', maker: '', barcode: '', purchasePrice: 28248, sellPrice: 35310 },
  { id: '261', name: 'STELLA', category: '小物類', maker: '', barcode: '', purchasePrice: 29700, sellPrice: 58000 },
  // カラー剤
  { id: '7',  name: 'キャラデコ',                                         category: 'カラー剤', maker: 'ホーユー',      barcode: '', purchasePrice:  300, sellPrice:  600 },
  { id: '8',  name: 'ライトニングブースター',                              category: 'カラー剤', maker: 'シュワルツコフ', barcode: '', purchasePrice: 1760, sellPrice:    0 },
  { id: '9',  name: 'マテリア',                                           category: 'カラー剤', maker: 'ミルボン',      barcode: '', purchasePrice:  455, sellPrice:  650 },
  { id: '10', name: 'ピクサムPYR',                                        category: 'カラー剤', maker: 'ウエラ',        barcode: '', purchasePrice:  508, sellPrice:    0 },
  { id: '11', name: 'イゴラ ロイヤル ピクサム-F ピラミンゴ カラー',       category: 'カラー剤', maker: 'シュワルツコフ', barcode: '', purchasePrice:  508, sellPrice:    0 },
  { id: '12', name: 'イゴラペンタ',                                       category: 'カラー剤', maker: 'シュワルツコフ', barcode: '', purchasePrice:  508, sellPrice:  700 },
  { id: '13', name: 'イルミナ',                                           category: 'カラー剤', maker: 'ウエラ',        barcode: '', purchasePrice:  680, sellPrice:  800 },
  { id: '14', name: 'サスティノ',                                         category: 'カラー剤', maker: 'デミ',          barcode: '', purchasePrice:  422, sellPrice:  650 },
  { id: '15', name: 'アディクシー',                                       category: 'カラー剤', maker: 'ミルボン',      barcode: '', purchasePrice:  508, sellPrice:  700 },
  { id: '16', name: 'カラーミューズ',                                     category: 'カラー剤', maker: 'ウエラ',        barcode: '', purchasePrice: 1705, sellPrice: 2200 },
  { id: '17', name: 'アジアン',                                           category: 'カラー剤', maker: 'ナプラ',        barcode: '', purchasePrice:  455, sellPrice:  650 },
  { id: '18', name: 'コレストン',                                         category: 'カラー剤', maker: 'ウエラ',        barcode: '', purchasePrice:  581, sellPrice:  750 },
  { id: '19', name: 'フィヨーレ',                                         category: 'カラー剤', maker: 'フィヨーレ',    barcode: '', purchasePrice:  418, sellPrice:  870 },
  { id: '20', name: 'アルティスト',                                       category: 'カラー剤', maker: 'ミルボン',      barcode: '', purchasePrice:  543, sellPrice:  700 },
  { id: '21', name: 'エドル',                                             category: 'カラー剤', maker: 'ミルボン',      barcode: '', purchasePrice:  490, sellPrice:    0 },
  { id: '22', name: 'アルーリア',                                         category: 'カラー剤', maker: 'ロレアル',      barcode: '', purchasePrice:  605, sellPrice:    0 },
  { id: '23', name: 'Nドットルフレ',                                      category: 'カラー剤', maker: 'ナプラ',        barcode: '', purchasePrice:  390, sellPrice:  650 },
  { id: '24', name: 'パイモアスペクトラムカラーズ',                        category: 'カラー剤', maker: 'パイモア',      barcode: '', purchasePrice: 1404, sellPrice: 1755 },
  { id: '25', name: 'クリエイティブフェリエネオ',                          category: 'カラー剤', maker: 'ロレアル',      barcode: '', purchasePrice:  503, sellPrice:    0 },
]

const initialStocks: StoreStock[] = [
  // ブリーチ剤
  { productId: '26', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '26', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '27', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '27', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '28', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '28', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '29', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '29', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '30', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '30', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  // カラーオキシ
  { productId: '31', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '31', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '32', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '32', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '33', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '33', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '34', storeId: 'flag', currentStock: 6, minStock: 3, active: true },
  { productId: '34', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '35', storeId: 'flag', currentStock: 3, minStock: 2, active: true },
  { productId: '35', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '36', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '36', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '37', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '37', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '38', storeId: 'flag', currentStock: 3, minStock: 2, active: true },
  { productId: '38', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '39', storeId: 'flag', currentStock: 4, minStock: 2, active: true },
  { productId: '39', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '40', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '40', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '41', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '41', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '42', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '42', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '43', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '43', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '44', storeId: 'flag', currentStock: 2, minStock: 2, active: true },
  { productId: '44', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '45', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '45', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '46', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '46', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '47', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '47', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '48', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '48', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '49', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '49', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '50', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '50', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '51', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '51', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '52', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '52', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '53', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '53', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '54', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '54', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '55', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '55', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '56', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '56', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '57', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '57', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '58', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '58', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '59', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '59', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '60', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '60', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '61', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '61', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '62', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '62', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '63', storeId: 'flag', currentStock: 18, minStock: 1, active: true },
  { productId: '63', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '64', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '64', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '65', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '65', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '66', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '66', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '67', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '67', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '68', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '68', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '69', storeId: 'flag', currentStock: 6, minStock: 1, active: true },
  { productId: '69', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '70', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '70', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '71', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '71', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '72', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '72', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '73', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '73', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '74', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '74', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '75', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '75', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '76', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '76', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '77', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '77', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '78', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '78', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '79', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '79', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '80', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '80', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '81', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '81', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '82', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '82', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '83', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '83', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '84', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '84', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '85', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '85', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '86', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '86', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '87', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '87', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '88', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '88', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '89', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '89', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '90', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '90', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '91', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '91', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '92', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '92', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '93', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '93', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '94', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '94', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '95', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '95', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '96', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '96', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '97', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '97', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '98', storeId: 'flag', currentStock: 11, minStock: 1, active: true },
  { productId: '98', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '99', storeId: 'flag', currentStock: 11, minStock: 1, active: true },
  { productId: '99', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '100', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '100', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '101', storeId: 'flag', currentStock: 8, minStock: 1, active: true },
  { productId: '101', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '102', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '102', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '103', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '103', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '104', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '104', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '105', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '105', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '106', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '106', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '107', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '107', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '108', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '108', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '109', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '109', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '110', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '110', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '111', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '111', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '112', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '112', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '113', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '113', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '114', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '114', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '115', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '115', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '116', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '116', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '117', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '117', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '118', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '118', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '119', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '119', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '120', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '120', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '121', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '121', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '122', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '122', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '123', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '123', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '124', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '124', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '125', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '125', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '126', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '126', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '127', storeId: 'flag', currentStock: 5, minStock: 1, active: true },
  { productId: '127', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '128', storeId: 'flag', currentStock: 6, minStock: 1, active: true },
  { productId: '128', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '129', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '129', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '130', storeId: 'flag', currentStock: 5, minStock: 1, active: true },
  { productId: '130', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '131', storeId: 'flag', currentStock: 4, minStock: 1, active: true },
  { productId: '131', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '132', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '132', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '133', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '133', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '134', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '134', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '135', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '135', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '136', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '136', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '137', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '137', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '138', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '138', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '139', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '139', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '140', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '140', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '141', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '141', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '142', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '142', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '143', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '143', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '144', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '144', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '145', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '145', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '146', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '146', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '147', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '147', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '148', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '148', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '149', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '149', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '150', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '150', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '151', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '151', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '152', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '152', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '153', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '153', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '154', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '154', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '155', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '155', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '156', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '156', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '157', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '157', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '158', storeId: 'flag', currentStock: 8, minStock: 1, active: true },
  { productId: '158', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '159', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '159', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '160', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '160', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '161', storeId: 'flag', currentStock: 4, minStock: 1, active: true },
  { productId: '161', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '162', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '162', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '163', storeId: 'flag', currentStock: 4, minStock: 1, active: true },
  { productId: '163', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '164', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '164', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '165', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '165', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '166', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '166', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '167', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '167', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '168', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '168', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '169', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '169', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '170', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '170', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '171', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '171', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '172', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '172', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '173', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '173', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '174', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '174', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '175', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '175', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '176', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '176', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '177', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '177', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '178', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '178', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '179', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '179', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '180', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '180', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '181', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '181', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '182', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '182', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '183', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '183', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '184', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '184', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '185', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '185', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '186', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '186', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '187', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '187', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '188', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '188', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '189', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '189', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '190', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '190', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '191', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '191', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '192', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '192', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '193', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '193', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '194', storeId: 'flag', currentStock: 4, minStock: 1, active: true },
  { productId: '194', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '195', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '195', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '196', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '196', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '197', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '197', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '198', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '198', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '199', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '199', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '200', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '200', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '201', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '201', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '202', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '202', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '203', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '203', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '204', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '204', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '205', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '205', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '206', storeId: 'flag', currentStock: 4, minStock: 1, active: true },
  { productId: '206', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '207', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '207', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '208', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '208', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '209', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '209', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '210', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '210', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '211', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '211', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '212', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '212', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '213', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '213', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '214', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '214', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '215', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '215', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '216', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '216', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '217', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '217', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '218', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '218', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '219', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '219', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '220', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '220', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '221', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '221', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '222', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '222', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '223', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '223', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '224', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '224', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '225', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '225', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '226', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '226', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '227', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '227', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '228', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '228', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '229', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '229', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '230', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '230', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '231', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '231', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '232', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '232', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '233', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '233', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '234', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '234', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '235', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '235', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '236', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '236', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '237', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '237', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '238', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '238', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '239', storeId: 'flag', currentStock: 6, minStock: 1, active: true },
  { productId: '239', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '240', storeId: 'flag', currentStock: 6, minStock: 1, active: true },
  { productId: '240', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '241', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '241', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '242', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '242', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '243', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '243', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '244', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '244', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '245', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '245', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '246', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '246', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '247', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '247', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '248', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '248', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '249', storeId: 'flag', currentStock: 2, minStock: 1, active: true },
  { productId: '249', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '250', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '250', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '251', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '251', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '252', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '252', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '253', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '253', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '254', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '254', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '255', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '255', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '256', storeId: 'flag', currentStock: 3, minStock: 1, active: true },
  { productId: '256', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '257', storeId: 'flag', currentStock: 1, minStock: 1, active: true },
  { productId: '257', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '258', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '258', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '259', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '259', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '260', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '260', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  { productId: '261', storeId: 'flag', currentStock: 0, minStock: 1, active: true },
  { productId: '261', storeId: 'lien', currentStock: 0, minStock: 1, active: true },
  // カラー剤
  { productId: '7',  storeId: 'flag', currentStock:  46, minStock: 10, active: true },
  { productId: '7',  storeId: 'lien', currentStock:   0, minStock:  5, active: true },
  { productId: '8',  storeId: 'flag', currentStock:   2, minStock:  2, active: true },
  { productId: '8',  storeId: 'lien', currentStock:   0, minStock:  1, active: true },
  { productId: '9',  storeId: 'flag', currentStock:   1, minStock:  3, active: true },
  { productId: '9',  storeId: 'lien', currentStock:   0, minStock:  2, active: true },
  { productId: '10', storeId: 'flag', currentStock:   4, minStock:  3, active: true },
  { productId: '10', storeId: 'lien', currentStock:   0, minStock:  2, active: true },
  { productId: '11', storeId: 'flag', currentStock:   6, minStock:  3, active: true },
  { productId: '11', storeId: 'lien', currentStock:   0, minStock:  2, active: true },
  { productId: '12', storeId: 'flag', currentStock:  10, minStock:  5, active: true },
  { productId: '12', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '13', storeId: 'flag', currentStock:  17, minStock:  5, active: true },
  { productId: '13', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '14', storeId: 'flag', currentStock:  10, minStock:  5, active: true },
  { productId: '14', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '15', storeId: 'flag', currentStock:  18, minStock:  5, active: true },
  { productId: '15', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '16', storeId: 'flag', currentStock:   9, minStock:  3, active: true },
  { productId: '16', storeId: 'lien', currentStock:   0, minStock:  2, active: true },
  { productId: '17', storeId: 'flag', currentStock:  11, minStock:  5, active: true },
  { productId: '17', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '18', storeId: 'flag', currentStock: 121, minStock: 20, active: true },
  { productId: '18', storeId: 'lien', currentStock:   0, minStock: 10, active: true },
  { productId: '19', storeId: 'flag', currentStock:  60, minStock: 10, active: true },
  { productId: '19', storeId: 'lien', currentStock:   0, minStock:  5, active: true },
  { productId: '20', storeId: 'flag', currentStock:  27, minStock:  5, active: true },
  { productId: '20', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '21', storeId: 'flag', currentStock:  20, minStock:  5, active: true },
  { productId: '21', storeId: 'lien', currentStock:   0, minStock:  3, active: true },
  { productId: '22', storeId: 'flag', currentStock:   2, minStock:  2, active: true },
  { productId: '22', storeId: 'lien', currentStock:   0, minStock:  1, active: true },
  { productId: '23', storeId: 'flag', currentStock:  94, minStock: 20, active: true },
  { productId: '23', storeId: 'lien', currentStock:   0, minStock: 10, active: true },
  { productId: '24', storeId: 'flag', currentStock:   2, minStock:  2, active: true },
  { productId: '24', storeId: 'lien', currentStock:   0, minStock:  1, active: true },
  { productId: '25', storeId: 'flag', currentStock:   3, minStock:  2, active: true },
  { productId: '25', storeId: 'lien', currentStock:   0, minStock:  1, active: true },
]

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentStore: 'all',
      setCurrentStore: (store) => set({ currentStore: store }),
      storeInfo: DEFAULT_STORE_INFO,
      storeOrder: DEFAULT_STORE_ORDER,
      setStoreInfo: (storeId, info) =>
        set((state) => ({ storeInfo: { ...state.storeInfo, [storeId]: info } })),
      addStore: (name, color) => {
        const id = `store_${Date.now()}`
        set((state) => ({
          storeInfo: { ...state.storeInfo, [id]: { name, phone: '', address: '', color } },
          storeOrder: [...state.storeOrder, id],
          appSettings: {
            ...state.appSettings,
            minStockByStore: { ...state.appSettings.minStockByStore, [id]: 3 },
            notifyLowStockByStore: { ...state.appSettings.notifyLowStockByStore, [id]: true },
          },
        }))
      },
      removeStore: (id) => {
        if (id === 'flag' || id === 'lien') return
        set((state) => {
          const { [id]: _1, ...restInfo } = state.storeInfo
          const { [id]: _2, ...restMin } = state.appSettings.minStockByStore
          const { [id]: _3, ...restNotify } = state.appSettings.notifyLowStockByStore
          return {
            storeInfo: restInfo,
            storeOrder: state.storeOrder.filter((s) => s !== id),
            appSettings: { ...state.appSettings, minStockByStore: restMin, notifyLowStockByStore: restNotify },
          }
        })
      },
      appSettings: DEFAULT_APP_SETTINGS,
      setAppSettings: (s) =>
        set((state) => ({ appSettings: { ...state.appSettings, ...s } })),
      products: initialProducts,
      stocks: initialStocks,
      upsertProduct: (product) =>
        set((state) => {
          const exists = state.products.some((p) => p.id === product.id)
          return {
            products: exists
              ? state.products.map((p) => (p.id === product.id ? product : p))
              : [...state.products, product],
          }
        }),
      upsertStock: (stock) =>
        set((state) => {
          const exists = state.stocks.some(
            (s) => s.productId === stock.productId && s.storeId === stock.storeId
          )
          return {
            stocks: exists
              ? state.stocks.map((s) =>
                  s.productId === stock.productId && s.storeId === stock.storeId ? stock : s
                )
              : [...state.stocks, stock],
          }
        }),
      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
          stocks: state.stocks.filter((s) => s.productId !== id),
        })),
      bulkDeleteProducts: (ids) =>
        set((state) => {
          const idSet = new Set(ids)
          return {
            products: state.products.filter((p) => !idSet.has(p.id)),
            stocks: state.stocks.filter((s) => !idSet.has(s.productId)),
          }
        }),
      reorderProducts: (activeId, overId) =>
        set((state) => {
          const from = state.products.findIndex((p) => p.id === activeId)
          const to = state.products.findIndex((p) => p.id === overId)
          if (from === -1 || to === -1 || from === to) return state
          return { products: moveItem(state.products, from, to) }
        }),
      bulkUpdateCategory: (ids, category) =>
        set((state) => ({
          products: state.products.map((p) =>
            ids.includes(p.id) ? { ...p, category } : p
          ),
        })),
      bulkUpdateStocks: (ids, flagPatch, lienPatch) =>
        set((state) => {
          const updated = state.stocks.map((s) => {
            if (!ids.includes(s.productId)) return s
            if (s.storeId === 'flag' && flagPatch) return { ...s, ...flagPatch }
            if (s.storeId === 'lien' && lienPatch) return { ...s, ...lienPatch }
            return s
          })
          const extra: StoreStock[] = []
          ids.forEach((id) => {
            if (flagPatch && !updated.some((s) => s.productId === id && s.storeId === 'flag')) {
              extra.push({ productId: id, storeId: 'flag', currentStock: 0, minStock: flagPatch.minStock ?? 3, active: flagPatch.active ?? true })
            }
            if (lienPatch && !updated.some((s) => s.productId === id && s.storeId === 'lien')) {
              extra.push({ productId: id, storeId: 'lien', currentStock: 0, minStock: lienPatch.minStock ?? 3, active: lienPatch.active ?? true })
            }
          })
          return { stocks: [...updated, ...extra] }
        }),
      transactions: [],
      addTransaction: (t) =>
        set((state) => ({
          transactions: [
            { ...t, id: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: t.timestamp ?? Date.now() },
            ...state.transactions,
          ],
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
      transfers: [],
      addTransfer: (t) =>
        set((state) => ({
          transfers: [
            {
              ...t,
              id: `TR-${Date.now()}`,
              createdAt: new Date().toISOString().slice(0, 10),
              status: '承認待ち' as TransferStatus,
            },
            ...state.transfers,
          ],
        })),
      approveTransfer: (id) =>
        set((state) => {
          const tr = state.transfers.find((t) => t.id === id)
          if (!tr || tr.status !== '承認待ち') return state

          let stocks = state.stocks.map((s) => {
            const item = tr.items.find((i) => i.productId === s.productId)
            if (!item) return s
            if (s.storeId === tr.fromStore) return { ...s, currentStock: Math.max(0, s.currentStock - item.quantity) }
            if (s.storeId === tr.toStore) return { ...s, currentStock: s.currentStock + item.quantity }
            return s
          })

          tr.items.forEach(({ productId, quantity }) => {
            if (!stocks.some((s) => s.productId === productId && s.storeId === tr.toStore)) {
              stocks = [...stocks, { productId, storeId: tr.toStore, currentStock: quantity, minStock: 3, active: true }]
            }
          })

          return {
            stocks,
            transfers: state.transfers.map((t) =>
              t.id === id ? { ...t, status: '承認済' as TransferStatus } : t
            ),
          }
        }),
      rejectTransfer: (id) =>
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === id ? { ...t, status: '却下' as TransferStatus } : t
          ),
        })),
      directTransfer: (fromStore, toStore, productId, quantity, memo) =>
        set((state) => {
          const id = `TR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const newTransfer: Transfer = {
            id, fromStore, toStore,
            createdAt: new Date().toISOString().slice(0, 10),
            status: '承認済',
            items: [{ productId, quantity }],
            ...(memo ? { memo } : {}),
          }
          let stocks = state.stocks.map((s) => {
            if (s.productId !== productId) return s
            if (s.storeId === fromStore) return { ...s, currentStock: Math.max(0, s.currentStock - quantity) }
            if (s.storeId === toStore) return { ...s, currentStock: s.currentStock + quantity }
            return s
          })
          if (!stocks.some((s) => s.productId === productId && s.storeId === toStore)) {
            stocks = [...stocks, { productId, storeId: toStore, currentStock: quantity, minStock: 3, active: true }]
          }
          return { transfers: [newTransfer, ...state.transfers], stocks }
        }),
      deleteTransfer: (id) =>
        set((state) => {
          const tr = state.transfers.find((t) => t.id === id)
          if (!tr) return state
          let stocks = state.stocks
          if (tr.status === '承認済') {
            stocks = state.stocks.map((s) => {
              const item = tr.items.find((i) => i.productId === s.productId)
              if (!item) return s
              if (s.storeId === tr.fromStore) return { ...s, currentStock: s.currentStock + item.quantity }
              if (s.storeId === tr.toStore) return { ...s, currentStock: Math.max(0, s.currentStock - item.quantity) }
              return s
            })
          }
          return { transfers: state.transfers.filter((t) => t.id !== id), stocks }
        }),
      staffPurchases: [],
      addStaffPurchase: (p) =>
        set((state) => ({
          staffPurchases: [
            { ...p, id: `SP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() },
            ...state.staffPurchases,
          ],
        })),
      deleteStaffPurchase: (id) =>
        set((state) => ({ staffPurchases: state.staffPurchases.filter((p) => p.id !== id) })),
      staffPayments: [],
      addStaffPayment: (p) =>
        set((state) => ({
          staffPayments: [
            { ...p, id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() },
            ...state.staffPayments,
          ],
        })),
      deleteStaffPayment: (id) =>
        set((state) => ({ staffPayments: state.staffPayments.filter((p) => p.id !== id) })),
      staffMembers: [],
      addStaffMember: (name) =>
        set((state) => ({
          staffMembers: state.staffMembers.includes(name)
            ? state.staffMembers
            : [...state.staffMembers, name],
        })),
      removeStaffMember: (name) =>
        set((state) => ({
          staffMembers: state.staffMembers.filter((m) => m !== name),
        })),
      stocktakeSnapshots: [],
      addStocktakeSnapshot: (s) =>
        set((state) => ({
          stocktakeSnapshots: [
            { ...s, id: `SS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
            ...state.stocktakeSnapshots,
          ],
        })),
      deleteStocktakeSnapshot: (id) =>
        set((state) => ({
          stocktakeSnapshots: state.stocktakeSnapshots.filter((s) => s.id !== id),
        })),
      categories: DEFAULT_CATEGORIES,
      addCategory: (name) =>
        set((state) => ({
          categories: state.categories.includes(name) ? state.categories : [...state.categories, name],
        })),
      removeCategory: (name) =>
        set((state) => ({ categories: state.categories.filter((c) => c !== name) })),
      makers: DEFAULT_MAKERS,
      addMaker: (name) =>
        set((state) => ({
          makers: state.makers.includes(name) ? state.makers : [...state.makers, name],
        })),
      removeMaker: (name) =>
        set((state) => ({ makers: state.makers.filter((m) => m !== name) })),
      dealers: [],
      addDealer: (name) =>
        set((state) => ({
          dealers: state.dealers.includes(name) ? state.dealers : [...state.dealers, name],
        })),
      removeDealer: (name) =>
        set((state) => ({ dealers: state.dealers.filter((d) => d !== name) })),
      dealerReps: [],
      addDealerRep: (name) =>
        set((state) => ({
          dealerReps: state.dealerReps.includes(name) ? state.dealerReps : [...state.dealerReps, name],
        })),
      removeDealerRep: (name) =>
        set((state) => ({ dealerReps: state.dealerReps.filter((r) => r !== name) })),
      setProductImages: (images) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id in images ? { ...p, image: images[p.id] || undefined } : p
          ),
        })),
      loadFromFirestore: (data) =>
        set((state) => {
          // 旧フォーマット（flagMinStock/notifyLowStockFlag等）からの移行を保証
          const raw = ((data.appSettings ?? {}) as unknown) as Record<string, unknown>
          const migratedSettings: AppSettings = {
            minStockByStore:
              (raw.minStockByStore as Record<string, number> | undefined) ??
              {
                flag: (raw.flagMinStock as number | undefined) ?? state.appSettings.minStockByStore?.flag ?? 5,
                lien: (raw.lienMinStock as number | undefined) ?? state.appSettings.minStockByStore?.lien ?? 3,
              },
            notifyLowStockByStore:
              (raw.notifyLowStockByStore as Record<string, boolean> | undefined) ??
              {
                flag: (raw.notifyLowStockFlag as boolean | undefined) ?? true,
                lien: (raw.notifyLowStockLien as boolean | undefined) ?? true,
              },
            notifyLowStock: (raw.notifyLowStock as boolean | undefined) ?? state.appSettings.notifyLowStock,
            notifyOrder: (raw.notifyOrder as boolean | undefined) ?? state.appSettings.notifyOrder,
            notifyTransfer: (raw.notifyTransfer as boolean | undefined) ?? state.appSettings.notifyTransfer,
            notifyStocktake: (raw.notifyStocktake as boolean | undefined) ?? state.appSettings.notifyStocktake,
            pin: (raw.pin as string | undefined) ?? state.appSettings.pin,
          }
          return {
            products: data.products.map((fp) => ({
              ...fp,
              image: state.products.find((lp) => lp.id === fp.id)?.image,
            })),
            stocks: data.stocks ?? state.stocks,
            transactions: data.transactions ?? state.transactions,
            transfers: data.transfers ?? state.transfers,
            staffPurchases: data.staffPurchases ?? state.staffPurchases,
            staffPayments: data.staffPayments ?? state.staffPayments,
            staffMembers: data.staffMembers ?? state.staffMembers,
            storeInfo: data.storeInfo ?? state.storeInfo,
            storeOrder: data.storeOrder ?? state.storeOrder,
            appSettings: data.appSettings ? migratedSettings : state.appSettings,
            stocktakeSnapshots: data.stocktakeSnapshots ?? state.stocktakeSnapshots,
            categories: data.categories ?? state.categories,
            makers: data.makers ?? state.makers,
            dealers: data.dealers ?? state.dealers,
            dealerReps: data.dealerReps ?? state.dealerReps,
          }
        }),
    }),
    {
      name: 'salon-inventory-store',
      version: 9,
      partialize: (state) => ({
        products: state.products,
        stocks: state.stocks,
        transactions: state.transactions,
        transfers: state.transfers,
        staffPurchases: state.staffPurchases,
        staffPayments: state.staffPayments,
        staffMembers: state.staffMembers,
        storeInfo: state.storeInfo,
        storeOrder: state.storeOrder,
        appSettings: state.appSettings,
        stocktakeSnapshots: state.stocktakeSnapshots,
        categories: state.categories,
        makers: state.makers,
        dealers: state.dealers,
        dealerReps: state.dealerReps,
      }),
      migrate: (persistedState, fromVersion) => {
        const saved = persistedState as Record<string, unknown>
        const products = (saved.products as Product[] | undefined) ?? []
        const stocks = (saved.stocks as StoreStock[] | undefined) ?? []
        const transactions = (saved.transactions as Transaction[] | undefined) ?? []
        const transfers = (saved.transfers as Transfer[] | undefined) ?? []
        const staffPurchases = (saved.staffPurchases as StaffPurchase[] | undefined) ?? []
        const staffPayments = (saved.staffPayments as StaffPayment[] | undefined) ?? []
        const staffMembers = (saved.staffMembers as string[] | undefined) ?? []
        const stocktakeSnapshots = (saved.stocktakeSnapshots as StocktakeSnapshot[] | undefined) ?? []
        const categories = (saved.categories as string[] | undefined) ?? DEFAULT_CATEGORIES
        const makers = (saved.makers as string[] | undefined) ?? DEFAULT_MAKERS
        const dealers = (saved.dealers as string[] | undefined) ?? []
        const dealerReps = (saved.dealerReps as string[] | undefined) ?? []

        // storeInfo: add color field if missing, support Record<string, StoreInfo> format
        const savedInfo = (saved.storeInfo ?? {}) as Record<string, Record<string, unknown>>
        const storeInfo: Record<string, StoreInfo> = {}
        const ensureStore = (id: string, def: StoreInfo, defaultColor: string) => {
          const raw = savedInfo[id]
          storeInfo[id] = {
            name: (raw?.name as string) ?? def.name,
            phone: (raw?.phone as string) ?? def.phone,
            address: (raw?.address as string) ?? def.address,
            color: (raw?.color as string) ?? defaultColor,
          }
        }
        ensureStore('flag', DEFAULT_STORE_INFO.flag, '#2B5FA7')
        ensureStore('lien', DEFAULT_STORE_INFO.lien, '#8A4AA6')
        Object.entries(savedInfo).forEach(([id, raw]) => {
          if (id === 'flag' || id === 'lien') return
          storeInfo[id] = {
            name: (raw?.name as string) ?? id,
            phone: (raw?.phone as string) ?? '',
            address: (raw?.address as string) ?? '',
            color: (raw?.color as string) ?? '#888888',
          }
        })
        const storeOrder = (saved.storeOrder as string[] | undefined) ?? Object.keys(storeInfo)

        // AppSettings: migrate flagMinStock/lienMinStock → minStockByStore etc.
        const old = (saved.appSettings ?? {}) as Record<string, unknown>
        const appSettings: AppSettings = {
          minStockByStore: (old.minStockByStore as Record<string, number> | undefined) ?? {
            flag: (old.flagMinStock as number | undefined) ?? 5,
            lien: (old.lienMinStock as number | undefined) ?? 3,
          },
          notifyLowStock: (old.notifyLowStock as boolean | undefined) ?? true,
          notifyLowStockByStore: (old.notifyLowStockByStore as Record<string, boolean> | undefined) ?? {
            flag: (old.notifyLowStockFlag as boolean | undefined) ?? true,
            lien: (old.notifyLowStockLien as boolean | undefined) ?? true,
          },
          notifyOrder: (old.notifyOrder as boolean | undefined) ?? true,
          notifyTransfer: (old.notifyTransfer as boolean | undefined) ?? false,
          notifyStocktake: (old.notifyStocktake as boolean | undefined) ?? true,
          pin: (old.pin as string | undefined) ?? '',
        }

        if (fromVersion < 3 && products.length === 0) {
          return { products: initialProducts, stocks: initialStocks, transactions: [], transfers: [], staffPurchases: [], staffPayments: [], staffMembers: [], storeInfo, storeOrder, appSettings, stocktakeSnapshots: [], categories, makers, dealers, dealerReps }
        }

        return { products, stocks, transactions, transfers, staffPurchases, staffPayments, staffMembers, storeInfo, storeOrder, appSettings, stocktakeSnapshots, categories, makers, dealers, dealerReps }
      },
    }
  )
)
