import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { useAppStore } from '../store'
import type { Product, StoreStock } from '../types'

const CATEGORIES = [
  'すべて',
  'カラー剤', 'ブリーチ剤', 'カラーオキシ',
  'パーマ剤', 'プレックス剤', '髪ドラ',
  'oggi otto', 'H2', '処理剤', '小物類',
  'シャンプー', 'トリートメント', 'アウトバスTR', 'スタイリング', 'オイル',
]

function stockStatus(current: number, min: number): { label: string; variant: 'danger' | 'warn' | 'ok' } {
  if (current <= min) return { label: '不足', variant: 'danger' }
  if (current <= min * 1.5) return { label: '少', variant: 'warn' }
  return { label: '十分', variant: 'ok' }
}

function SortableRow({
  p,
  flagStock,
  lienStock,
  onNavigate,
  onDelete,
}: {
  p: Product
  flagStock: StoreStock | undefined
  lienStock: StoreStock | undefined
  onNavigate: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id })

  const total = (flagStock?.currentStock ?? 0) + (lienStock?.currentStock ?? 0)
  const totalMin = (flagStock?.minStock ?? 0) + (lienStock?.minStock ?? 0)
  const status = stockStatus(total, totalMin)
  const flagLow = flagStock && flagStock.currentStock <= flagStock.minStock
  const lienLow = lienStock && lienStock.currentStock <= lienStock.minStock

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? '#F0F0EE' : undefined,
      }}
      className="border-b border-border hover:bg-bg transition-colors"
    >
      {/* ドラッグハンドル */}
      <td className="px-2 py-3 w-8 text-center">
        <button
          {...attributes}
          {...listeners}
          className="text-faint hover:text-muted cursor-grab active:cursor-grabbing touch-manipulation select-none"
          style={{ touchAction: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>
      </td>
      <td className="px-3 py-3 cursor-pointer" onClick={onNavigate}>
        <div
          className="w-10 h-10 rounded flex-shrink-0"
          style={{ background: 'repeating-linear-gradient(45deg, #F1F1EE 0 4px, #E8E8E4 4px 8px)' }}
        />
      </td>
      <td className="px-4 py-3 cursor-pointer" onClick={onNavigate}>
        <div className="font-semibold text-text truncate max-w-xs">{p.name}</div>
        <div className="text-2xs text-faint font-mono mt-0.5">{p.barcode}</div>
      </td>
      <td className="px-4 py-3 text-xs text-muted cursor-pointer" onClick={onNavigate}>{p.category}</td>
      <td className={`px-4 py-3 text-right font-bold tabular-nums cursor-pointer ${flagLow ? 'text-danger' : 'text-text'}`} onClick={onNavigate}>
        {flagStock?.currentStock ?? '—'}
      </td>
      <td className={`px-4 py-3 text-right font-bold tabular-nums cursor-pointer ${lienLow ? 'text-danger' : 'text-text'}`} onClick={onNavigate}>
        {lienStock?.currentStock ?? '—'}
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums cursor-pointer" onClick={onNavigate}>{total}</td>
      <td className="px-4 py-3 text-center cursor-pointer" onClick={onNavigate}>
        <Badge variant={status.variant}>{status.label}</Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs text-danger border border-danger rounded hover:bg-danger-soft transition-colors"
        >
          削除
        </button>
      </td>
    </tr>
  )
}

export function Products() {
  const navigate = useNavigate()
  const location = useLocation()
  const { products, stocks, deleteProduct, reorderProducts } = useAppStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(
    (location.state as { category?: string } | null)?.category ?? 'すべて'
  )
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
    const matchCat = category === 'すべて' || p.category === category
    return matchSearch && matchCat
  })

  function getStock(productId: string, storeId: 'flag' | 'lien') {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderProducts(String(active.id), String(over.id))
    }
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
                  <th className="w-8"></th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted w-12"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">カテゴリ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">flag</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">Lien</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">合計</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-24">状態</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {filtered.map((p) => (
                      <SortableRow
                        key={p.id}
                        p={p}
                        flagStock={getStock(p.id, 'flag')}
                        lienStock={getStock(p.id, 'lien')}
                        onNavigate={() => navigate(`/products/${p.id}`, { state: { category } })}
                        onDelete={() => setConfirmId(p.id)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        </main>
      </div>

      {/* 削除確認ダイアログ */}
      {confirmId && (() => {
        const target = products.find((p) => p.id === confirmId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-surface rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
              <p className="text-sm font-bold text-text">商品を削除しますか？</p>
              <p className="text-sm text-muted">「{target?.name}」を削除します。この操作は元に戻せません。</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-4 py-2 text-sm rounded-md border border-border text-muted hover:bg-bg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => { deleteProduct(confirmId); setConfirmId(null) }}
                  className="px-4 py-2 text-sm rounded-md bg-danger text-white hover:bg-danger/90 transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
