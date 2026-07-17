import { create } from 'zustand'
import type { StoreFilter, Product, StoreStock } from '../types'

interface AppState {
  currentStore: StoreFilter
  setCurrentStore: (store: StoreFilter) => void
  products: Product[]
  stocks: StoreStock[]
}

export const useAppStore = create<AppState>((set) => ({
  currentStore: 'all',
  setCurrentStore: (store) => set({ currentStore: store }),
  products: [
    { id: '1', name: 'ミルボン ジェミールフラン シャンプー 500ml', category: 'シャンプー', maker: 'ミルボン', barcode: '4901234567890', purchasePrice: 1400, sellPrice: 2800 },
    { id: '2', name: 'ケラスターゼ ソワン オレオ', category: 'トリートメント', maker: 'ケラスターゼ', barcode: '4901234567891', purchasePrice: 2600, sellPrice: 5200 },
    { id: '3', name: 'OWAY カラーマスク ヘナ', category: 'カラー剤', maker: 'OWAY', barcode: '4901234567892', purchasePrice: 1800, sellPrice: 4500 },
    { id: '4', name: 'デミ アドミオオイル', category: 'スタイリング', maker: 'デミ', barcode: '4901234567893', purchasePrice: 850, sellPrice: 1700 },
    { id: '5', name: 'ナプラ ケアテクトHB', category: 'シャンプー', maker: 'ナプラ', barcode: '4901234567894', purchasePrice: 1100, sellPrice: 2200 },
    { id: '6', name: 'アジュバン コンポジオ EX', category: 'トリートメント', maker: 'アジュバン', barcode: '4901234567895', purchasePrice: 3200, sellPrice: 6400 },
  ],
  stocks: [
    { productId: '1', storeId: 'flag', currentStock: 8, minStock: 5, active: true },
    { productId: '1', storeId: 'lien', currentStock: 3, minStock: 4, active: true },
    { productId: '2', storeId: 'flag', currentStock: 12, minStock: 3, active: true },
    { productId: '2', storeId: 'lien', currentStock: 6, minStock: 3, active: true },
    { productId: '3', storeId: 'flag', currentStock: 2, minStock: 5, active: true },
    { productId: '3', storeId: 'lien', currentStock: 1, minStock: 3, active: true },
    { productId: '4', storeId: 'flag', currentStock: 15, minStock: 5, active: true },
    { productId: '4', storeId: 'lien', currentStock: 9, minStock: 5, active: true },
    { productId: '5', storeId: 'flag', currentStock: 4, minStock: 6, active: true },
    { productId: '5', storeId: 'lien', currentStock: 7, minStock: 4, active: true },
    { productId: '6', storeId: 'flag', currentStock: 5, minStock: 3, active: true },
    { productId: '6', storeId: 'lien', currentStock: 2, minStock: 4, active: true },
  ],
}))
