import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { useAppStore } from '../store'

const CATEGORIES = [
  'すべて',
  'カラー剤', 'ブリーチ剤', 'カラーオキシ',
  'パーマ剤', 'プレックス剤', '髪ドラ',
  'oggi otto', 'H2', '処理剤', '小物類',
  'シャンプー', 'トリートメント', 'スタイリング', 'オイル',
]

function stockStatus(current: number, min: number): { label: string; variant: 'danger' | 'warn' | 'ok' } {
  if (current <= min) return { label: '不足', variant: 'danger' }
  if (current <= min * 1.5) return { label: '少', variant: 'warn' }
  return { label: '十分', variant: 'ok' }
}

export function Products() {
  const navigate = useNavigate()
  const { products, stocks } = useAppStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('すべて')

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
    const matchCat = category === 'すべて' || p.category === category
    return matchSearch && matchCat
  })

  function getStock(productId: string, storeId: 'flag' | 'lien') {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar
        title="商品一覧"
        right={<Btn variant="primary" size="sm" onClick={() => navigate('/products/new')}>＋ 新規登録</Btn>}
      />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          {/* フィルタ行 */}
          <div className="px-6 pt-4 pb-3 bg-surface border-b border-border flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="商品名・バーコードで検索"
                  className="w-full h-10 pl-8 pr-4 border border-border rounded-md text-sm bg-surface focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    category === cat ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <span className="ml-auto text-xs text-faint flex-shrink-0">全 {filtered.length} 商品</span>
            </div>
          </div>

          {/* テーブル */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-bg border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-12"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">カテゴリ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">flag</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">Lien</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">合計</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-24">状態</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const flagStock = getStock(p.id, 'flag')
                  const lienStock = getStock(p.id, 'lien')
                  const total = (flagStock?.currentStock ?? 0) + (lienStock?.currentStock ?? 0)
                  const totalMin = (flagStock?.minStock ?? 0) + (lienStock?.minStock ?? 0)
                  const status = stockStatus(total, totalMin)

                  const flagLow = flagStock && flagStock.currentStock <= flagStock.minStock
                  const lienLow = lienStock && lienStock.currentStock <= lienStock.minStock

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border hover:bg-bg cursor-pointer transition-colors"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="w-10 h-10 rounded flex-shrink-0"
                          style={{ background: 'repeating-linear-gradient(45deg, #F1F1EE 0 4px, #E8E8E4 4px 8px)' }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text truncate max-w-xs">{p.name}</div>
                        <div className="text-2xs text-faint font-mono mt-0.5">{p.barcode}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{p.category}</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${flagLow ? 'text-danger' : 'text-text'}`}>
                        {flagStock?.currentStock ?? '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${lienLow ? 'text-danger' : 'text-text'}`}>
                        {lienStock?.currentStock ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{total}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
