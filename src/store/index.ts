import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StoreFilter, Product, StoreStock } from '../types'

interface AppState {
  currentStore: StoreFilter
  setCurrentStore: (store: StoreFilter) => void
  products: Product[]
  stocks: StoreStock[]
  upsertProduct: (product: Product) => void
  upsertStock: (stock: StoreStock) => void
  deleteProduct: (id: string) => void
}

const initialProducts: Product[] = [
  // ブリーチ剤
  { id: '26', name: 'アクセスフリー',      category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 2030, sellPrice: 2900 },
  { id: '27', name: 'ヴィーガンブリーチ',  category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 2713, sellPrice:    0 },
  { id: '28', name: 'クレイブリーチ',      category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 2800, sellPrice: 3800 },
  { id: '29', name: 'アリミノ１２０',      category: 'ブリーチ剤', maker: 'アリミノ', barcode: '', purchasePrice: 2660, sellPrice: 3800 },
  { id: '30', name: 'ティントエスケープ',  category: 'ブリーチ剤', maker: '',         barcode: '', purchasePrice: 1400, sellPrice: 2000 },
  // カラー剤
  { id: '7',  name: 'キャラデコ',                                         category: 'カラー剤',      maker: 'ホーユー',       barcode: '', purchasePrice:  300, sellPrice:  600 },
  { id: '8',  name: 'ライトニングブースター',                              category: 'カラー剤',      maker: 'シュワルツコフ',  barcode: '', purchasePrice: 1760, sellPrice:    0 },
  { id: '9',  name: 'マテリア',                                           category: 'カラー剤',      maker: 'ミルボン',       barcode: '', purchasePrice:  455, sellPrice:  650 },
  { id: '10', name: 'ピクサムPYR',                                        category: 'カラー剤',      maker: 'ウエラ',         barcode: '', purchasePrice:  508, sellPrice:    0 },
  { id: '11', name: 'イゴラ ロイヤル ピクサム-F ピラミンゴ カラー',       category: 'カラー剤',      maker: 'シュワルツコフ',  barcode: '', purchasePrice:  508, sellPrice:    0 },
  { id: '12', name: 'イゴラペンタ',                                       category: 'カラー剤',      maker: 'シュワルツコフ',  barcode: '', purchasePrice:  508, sellPrice:  700 },
  { id: '13', name: 'イルミナ',                                           category: 'カラー剤',      maker: 'ウエラ',         barcode: '', purchasePrice:  680, sellPrice:  800 },
  { id: '14', name: 'サスティノ',                                         category: 'カラー剤',      maker: 'デミ',           barcode: '', purchasePrice:  422, sellPrice:  650 },
  { id: '15', name: 'アディクシー',                                       category: 'カラー剤',      maker: 'ミルボン',       barcode: '', purchasePrice:  508, sellPrice:  700 },
  { id: '16', name: 'カラーミューズ',                                     category: 'カラー剤',      maker: 'ウエラ',         barcode: '', purchasePrice: 1705, sellPrice: 2200 },
  { id: '17', name: 'アジアン',                                           category: 'カラー剤',      maker: 'ナプラ',         barcode: '', purchasePrice:  455, sellPrice:  650 },
  { id: '18', name: 'コレストン',                                         category: 'カラー剤',      maker: 'ウエラ',         barcode: '', purchasePrice:  581, sellPrice:  750 },
  { id: '19', name: 'フィヨーレ',                                         category: 'カラー剤',      maker: 'フィヨーレ',     barcode: '', purchasePrice:  418, sellPrice:  870 },
  { id: '20', name: 'アルティスト',                                       category: 'カラー剤',      maker: 'ミルボン',       barcode: '', purchasePrice:  543, sellPrice:  700 },
  { id: '21', name: 'エドル',                                             category: 'カラー剤',      maker: 'ミルボン',       barcode: '', purchasePrice:  490, sellPrice:    0 },
  { id: '22', name: 'アルーリア',                                         category: 'カラー剤',      maker: 'ロレアル',       barcode: '', purchasePrice:  605, sellPrice:    0 },
  { id: '23', name: 'Nドットルフレ',                                      category: 'カラー剤',      maker: 'ナプラ',         barcode: '', purchasePrice:  390, sellPrice:  650 },
  { id: '24', name: 'パイモアスペクトラムカラーズ',                        category: 'カラー剤',      maker: 'パイモア',       barcode: '', purchasePrice: 1404, sellPrice: 1755 },
  { id: '25', name: 'クリエイティブフェリエネオ',                          category: 'カラー剤',      maker: 'ロレアル',       barcode: '', purchasePrice:  503, sellPrice:    0 },
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
    }),
    {
      name: 'salon-inventory-store',
      version: 1,
      partialize: (state) => ({
        products: state.products,
        stocks: state.stocks,
      }),
      // version 0 → 1: ブリーチ剤5種など initialProducts にある未保存商品を追加
      migrate: (persistedState, fromVersion) => {
        const saved = persistedState as { products?: Product[]; stocks?: StoreStock[] }
        const products = saved.products ?? []
        const stocks = saved.stocks ?? []

        if (fromVersion < 1) {
          const newProducts = initialProducts.filter((ip) => !products.some((p) => p.id === ip.id))
          const newStocks = initialStocks.filter(
            (is) => !stocks.some((ss) => ss.productId === is.productId && ss.storeId === is.storeId)
          )
          return { products: [...products, ...newProducts], stocks: [...stocks, ...newStocks] }
        }

        return { products, stocks }
      },
    }
  )
)
