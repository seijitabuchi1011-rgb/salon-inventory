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

const MOVE_CATEGORIES = CATEGORIES.filter((c) => c !== 'すべて')

function stockStatus(current: number, min: number): { label: string; variant: 'danger' | 'warn' | 'ok' } {
  if (current <= min) return { label: '不足', variant: 'danger' }
  if (current <= min * 1.5) return { label: '少', variant: 'warn' }
  return { label: '十分', variant: 'ok' }
}

function ActiveToggle({
  active,
  color,
  onToggle,
}: {
  active: boolean
  color: 'flag' | 'lien'
  onToggle: () => void
}) {
  const activeStyle =
    color === 'flag'
      ? 'bg-[#1B5EB8] text-white'
      : 'bg-[#7B2FA8] text-white'

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all mx-auto ${
        active ? activeStyle : 'bg-bg border-2 border-border text-faint'
      }`}
    >
      {active ? '✓' : '✗'}
    </button>
  )
}

function SortableRow({
  p,
  flagStock,
  lienStock,
  checked,
  onCheck,
  onNavigate,
  onDelete,
  onToggleFlagActive,
  onToggleLienActive,
}: {
  p: Product
  flagStock: StoreStock | undefined
  lienStock: StoreStock | undefined
  checked: boolean
  onCheck: (checked: boolean) => void
  onNavigate: () => void
  onDelete: () => void
  onToggleFlagActive: () => void
  onToggleLienActive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id })

  const flagActive = flagStock?.active ?? true
  const lienActive = lienStock?.active ?? true
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
        background: checked ? '#EEEEFB' : isDragging ? '#F0F0EE' : undefined,
      }}
      className="border-b border-border transition-colors"
    >
      {/* チェックボックス */}
      <td className="px-3 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onCheck(!checked)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            checked ? 'bg-accent border-accent text-white' : 'border-border-strong'
          }`}
        >
          {checked && <span className="text-xs leading-none">✓</span>}
        </button>
      </td>
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
      {/* flag 取扱トグル */}
      <td className="px-2 py-3 w-16 text-center" onClick={(e) => e.stopPropagation()}>
        <ActiveToggle active={flagActive} color="flag" onToggle={onToggleFlagActive} />
      </td>
      {/* Lien 取扱トグル */}
      <td className="px-2 py-3 w-16 text-center" onClick={(e) => e.stopPropagation()}>
        <ActiveToggle active={lienActive} color="lien" onToggle={onToggleLienActive} />
      </td>
      <td className={`px-4 py-3 text-right font-bold tabular-nums cursor-pointer ${flagLow ? 'text-danger' : 'text-text'}`} onClick={onNavigate}>
        {flagActive ? (flagStock?.currentStock ?? '—') : <span className="text-faint text-xs">取扱なし</span>}
      </td>
      <td className={`px-4 py-3 text-right font-bold tabular-nums cursor-pointer ${lienLow ? 'text-danger' : 'text-text'}`} onClick={onNavigate}>
        {lienActive ? (lienStock?.currentStock ?? '—') : <span className="text-faint text-xs">取扱なし</span>}
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums cursor-pointer" onClick={onNavigate}>{total}</td>
      <td className="px-4 py-3 text-center cursor-pointer" onClick={onNavigate}>
        <Badge variant={status.variant}>{status.label}</Badge>
      </td>
      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
  const { products, stocks, upsertStock, deleteProduct, reorderProducts, bulkUpdateCategory } = useAppStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(
    (location.state as { category?: string } | null)?.category ?? 'すべて'
  )
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
    const matchCat = category === 'すべて' || p.category === category
    return matchSearch && matchCat
  })

  const allChecked = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))
  const someChecked = filtered.some((p) => selectedIds.has(p.id))

  function toggleAll() {
    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function applyBulkCategory() {
    if (!bulkCategory || selectedIds.size === 0) return
    bulkUpdateCategory([...selectedIds], bulkCategory)
    setSelectedIds(new Set())
    setBulkCategory('')
  }

  function getStock(productId: string, storeId: 'flag' | 'lien') {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)
  }

  function toggleActive(productId: string, storeId: 'flag' | 'lien') {
    const s = getStock(productId, storeId)
    upsertStock({
      productId,
      storeId,
      currentStock: s?.currentStock ?? 0,
      minStock: s?.minStock ?? 3,
      active: !(s?.active ?? true),
    })
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
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      onClick={toggleAll}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                        allChecked
                          ? 'bg-accent border-accent text-white'
                          : someChecked
                          ? 'bg-accent/30 border-accent'
                          : 'border-border-strong'
                      }`}
                    >
                      {(allChecked || someChecked) && <span className="text-xs leading-none text-white">✓</span>}
                    </button>
                  </th>
                  <th className="w-8"></th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted w-12"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">カテゴリ</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold w-16" style={{ color: '#1B5EB8' }}>flag<br/>取扱</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold w-16" style={{ color: '#7B2FA8' }}>Lien<br/>取扱</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">flag在庫</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">Lien在庫</th>
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
                        checked={selectedIds.has(p.id)}
                        onCheck={(v) => toggleOne(p.id, v)}
                        onNavigate={() => navigate(`/products/${p.id}`, { state: { category } })}
                        onDelete={() => setConfirmId(p.id)}
                        onToggleFlagActive={() => toggleActive(p.id, 'flag')}
                        onToggleLienActive={() => toggleActive(p.id, 'lien')}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        </main>
      </div>

      {/* 一括カテゴリ変更バー */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border shadow-lg px-6 py-3 flex items-center gap-3">
          <span className="text-sm font-bold text-accent flex-shrink-0">{selectedIds.size}件 選択中</span>
          <span className="text-xs text-muted flex-shrink-0">カテゴリを一括変更:</span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="flex-1 h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
          >
            <option value="">カテゴリを選択</option>
            {MOVE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={applyBulkCategory}
            disabled={!bulkCategory}
            className="px-4 h-9 rounded-md bg-accent text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
          >
            移動
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkCategory('') }}
            className="px-4 h-9 rounded-md border border-border text-sm text-muted flex-shrink-0"
          >
            キャンセル
          </button>
        </div>
      )}

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
