import { useState, useEffect, useRef } from 'react'
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

// カテゴリはストアから取得するため定数は削除（下のコンポーネントで categories を使用）

// ─── 在庫クイック編集ボトムシート ─────────────────────────────────────────

function StepInput({
  value,
  onChange,
  min = 0,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-lg bg-bg border border-border text-lg font-bold text-muted flex items-center justify-center active:bg-border transition-colors flex-shrink-0"
      >
        −
      </button>
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) onChange(Math.max(min, v))
        }}
        onFocus={() => inputRef.current?.select()}
        className="w-14 h-9 text-center text-base font-bold tabular-nums border border-border rounded-lg bg-surface text-text outline-none focus:border-accent"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-lg bg-bg border border-border text-lg font-bold text-muted flex items-center justify-center active:bg-border transition-colors flex-shrink-0"
      >
        ＋
      </button>
    </div>
  )
}

function StockEditSheet({
  product,
  flagStock,
  lienStock,
  onSave,
  onClose,
}: {
  product: Product
  flagStock: StoreStock | undefined
  lienStock: StoreStock | undefined
  onSave: (flag: Pick<StoreStock, 'currentStock' | 'minStock'>, lien: Pick<StoreStock, 'currentStock' | 'minStock'>) => void
  onClose: () => void
}) {
  const [flagCurrent, setFlagCurrent] = useState(flagStock?.currentStock ?? 0)
  const [flagMin, setFlagMin] = useState(flagStock?.minStock ?? 3)
  const [lienCurrent, setLienCurrent] = useState(lienStock?.currentStock ?? 0)
  const [lienMin, setLienMin] = useState(lienStock?.minStock ?? 3)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  function handleSave() {
    onSave(
      { currentStock: flagCurrent, minStock: flagMin },
      { currentStock: lienCurrent, minStock: lienMin },
    )
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 背景オーバーレイ */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      />
      {/* シート本体 */}
      <div
        className="relative bg-surface rounded-t-2xl shadow-2xl transition-transform duration-220"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* ハンドルバー */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>
        {/* ヘッダー */}
        <div className="px-5 pt-2 pb-3 border-b border-border">
          <p className="text-xs text-faint font-mono truncate">{product.barcode}</p>
          <p className="font-bold text-text text-base leading-snug mt-0.5">{product.name}</p>
        </div>
        {/* 在庫フォーム */}
        <div className="px-5 py-4 flex gap-6">
          {/* flag */}
          <div className="flex-1">
            <p className="text-xs font-bold mb-3" style={{ color: '#1B5EB8' }}>flag 美容室</p>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted mb-1.5">現在庫</p>
                <StepInput value={flagCurrent} onChange={setFlagCurrent} />
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5">下限</p>
                <StepInput value={flagMin} onChange={setFlagMin} />
              </div>
            </div>
          </div>
          {/* 区切り */}
          <div className="w-px bg-border self-stretch" />
          {/* lien */}
          <div className="flex-1">
            <p className="text-xs font-bold mb-3" style={{ color: '#7B2FA8' }}>Lien カラー専門店</p>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted mb-1.5">現在庫</p>
                <StepInput value={lienCurrent} onChange={setLienCurrent} />
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5">下限</p>
                <StepInput value={lienMin} onChange={setLienMin} />
              </div>
            </div>
          </div>
        </div>
        {/* ボタン */}
        <div className="px-5 pb-8 pt-2 flex gap-3 border-t border-border">
          <button
            onClick={handleClose}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-muted"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-11 rounded-xl bg-accent text-white text-sm font-bold"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

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
  onEditStock,
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
  onEditStock: () => void
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
        {p.image ? (
          <img src={p.image} alt={p.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded flex-shrink-0"
            style={{ background: 'repeating-linear-gradient(45deg, #F1F1EE 0 4px, #E8E8E4 4px 8px)' }}
          />
        )}
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
      <td
        className={`px-4 py-3 text-right font-bold tabular-nums cursor-pointer select-none ${flagLow ? 'text-danger' : 'text-text'}`}
        onClick={(e) => { e.stopPropagation(); onEditStock() }}
      >
        {flagActive ? (
          <span className="inline-flex items-center gap-1">
            {flagStock?.currentStock ?? '—'}
            <span className="text-2xs text-faint font-normal">/{flagStock?.minStock ?? '—'}</span>
          </span>
        ) : <span className="text-faint text-xs">取扱なし</span>}
      </td>
      <td
        className={`px-4 py-3 text-right font-bold tabular-nums cursor-pointer select-none ${lienLow ? 'text-danger' : 'text-text'}`}
        onClick={(e) => { e.stopPropagation(); onEditStock() }}
      >
        {lienActive ? (
          <span className="inline-flex items-center gap-1">
            {lienStock?.currentStock ?? '—'}
            <span className="text-2xs text-faint font-normal">/{lienStock?.minStock ?? '—'}</span>
          </span>
        ) : <span className="text-faint text-xs">取扱なし</span>}
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
  const { currentStore, products, stocks, upsertStock, deleteProduct, bulkDeleteProducts, reorderProducts, bulkUpdateCategory, categories } = useAppStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(
    (location.state as { category?: string } | null)?.category ?? 'すべて'
  )
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [editProductId, setEditProductId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
    const matchCat = category === 'すべて' || p.category === category
    const matchStore =
      currentStore === 'all' ||
      (stocks.find((s) => s.productId === p.id && s.storeId === currentStore)?.active ?? true)
    return matchSearch && matchCat && matchStore
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
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  placeholder="商品名・バーコードで検索"
                  className="w-full h-10 pl-8 pr-4 border border-border rounded-md text-sm bg-surface focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {['すべて', ...categories].map((cat) => (
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
            <table className="w-full min-w-[800px] text-sm border-collapse">
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
                        onEditStock={() => setEditProductId(p.id)}
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
            {categories.map((c) => (
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
            onClick={() => setConfirmBulkDelete(true)}
            className="px-4 h-9 rounded-md bg-danger text-white text-sm font-semibold flex-shrink-0"
          >
            削除
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkCategory('') }}
            className="px-4 h-9 rounded-md border border-border text-sm text-muted flex-shrink-0"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* 在庫クイック編集シート */}
      {editProductId && (() => {
        const p = products.find((x) => x.id === editProductId)
        if (!p) return null
        const fs = getStock(p.id, 'flag')
        const ls = getStock(p.id, 'lien')
        return (
          <StockEditSheet
            product={p}
            flagStock={fs}
            lienStock={ls}
            onClose={() => setEditProductId(null)}
            onSave={(flag, lien) => {
              upsertStock({ productId: p.id, storeId: 'flag', currentStock: flag.currentStock, minStock: flag.minStock, active: fs?.active ?? true })
              upsertStock({ productId: p.id, storeId: 'lien', currentStock: lien.currentStock, minStock: lien.minStock, active: ls?.active ?? true })
            }}
          />
        )
      })()}

      {/* 削除確認ダイアログ（単体） */}
      {confirmId && (() => {
        const target = products.find((p) => p.id === confirmId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-surface rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
              <p className="text-sm font-bold text-text">商品を削除しますか？</p>
              <p className="text-sm text-muted">
                {target ? `「${target.name}」を削除します。` : 'この商品を削除します。'}この操作は元に戻せません。
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-4 py-2 text-sm rounded-md border border-border text-muted hover:bg-bg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    const id = confirmId
                    setConfirmId(null)
                    if (id) {
                      deleteProduct(id)
                      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
                    }
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-danger text-white hover:bg-danger/90 transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 一括削除確認ダイアログ */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <p className="text-sm font-bold text-text">選択した商品を削除しますか？</p>
            <p className="text-sm text-muted">{selectedIds.size}件を削除します。この操作は元に戻せません。</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="px-4 py-2 text-sm rounded-md border border-border text-muted hover:bg-bg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  const ids = Array.from(selectedIds)
                  setConfirmBulkDelete(false)
                  setSelectedIds(new Set())
                  setBulkCategory('')
                  bulkDeleteProducts(ids)
                }}
                className="px-4 py-2 text-sm rounded-md bg-danger text-white hover:bg-danger/90 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
