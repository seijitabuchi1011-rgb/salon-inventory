import { useState, useEffect } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

type StoreF = 'all' | StoreId

function fmt(n: number) {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
}

function taxIncluded(price: number, rate: 8 | 10) {
  return Math.round(price * (rate === 10 ? 1.1 : 1.08))
}

function getMonthRange(offset: number): [number, number, string] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  const label = `${start.getFullYear()}年${start.getMonth() + 1}月`
  return [start.getTime(), end.getTime(), label]
}

type AddForm = {
  date: string
  storeId: StoreId
  productId: string
  productSearch: string
  quantity: number
}

const BLANK_ADD = (): AddForm => ({
  date: new Date().toISOString().slice(0, 10),
  storeId: 'flag',
  productId: '',
  productSearch: '',
  quantity: 1,
})

export function MonthlyPurchases() {
  const { products, storeOrder, storeInfo, addTransaction, deleteTransaction } = useAppStore()

  // useSyncExternalStoreのiOS Safari問題を回避: vanillaのsubscribeで直接監視
  const [transactions, setTransactions] = useState(() => useAppStore.getState().transactions)
  useEffect(() => {
    setTransactions(useAppStore.getState().transactions)
    return useAppStore.subscribe((state) => {
      setTransactions(state.transactions)
    })
  }, [])

  const [monthOffset, setMonthOffset] = useState(0)
  const [store, setStore] = useState<StoreF>('all')
  const [viewMode, setViewMode] = useState<'detail' | 'byProduct'>('detail')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<AddForm>(BLANK_ADD())
  const [showDrop, setShowDrop] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [rangeStart, rangeEnd, monthLabel] = getMonthRange(monthOffset)

  const filtered = transactions.filter((t) => {
    if (t.type !== 'receive') return false
    if (t.timestamp < rangeStart || t.timestamp > rangeEnd) return false
    if (store !== 'all' && t.storeId !== store) return false
    return true
  }).sort((a, b) => b.timestamp - a.timestamp)

  // 商品別集計
  type AggRow = { productId: string; name: string; category: string; taxRate: 8 | 10; unitIncTax: number; totalQty: number; totalIncTax: number }
  const aggregated: AggRow[] = Object.values(
    filtered.reduce<Record<string, AggRow>>((acc, t) => {
      const p = products.find((pr) => pr.id === t.productId)
      const key = t.productId
      const rate = p?.taxRate ?? 10
      const unitIncTax = taxIncluded(p?.purchasePrice ?? 0, rate)
      if (!acc[key]) {
        acc[key] = { productId: key, name: p?.name ?? '不明商品', category: p?.category ?? '', taxRate: rate, unitIncTax, totalQty: 0, totalIncTax: 0 }
      }
      acc[key].totalQty += t.quantity
      acc[key].totalIncTax += unitIncTax * t.quantity
      return acc
    }, {})
  ).sort((a, b) => b.totalIncTax - a.totalIncTax)

  // KPIs (aggregated from all receives in range regardless of store filter for context, but respect filter)
  const totalQty = filtered.reduce((sum, t) => sum + t.quantity, 0)
  const totalAmountExTax = filtered.reduce((sum, t) => {
    const p = products.find((pr) => pr.id === t.productId)
    return sum + (p?.purchasePrice ?? 0) * t.quantity
  }, 0)
  const totalAmountIncTax = filtered.reduce((sum, t) => {
    const p = products.find((pr) => pr.id === t.productId)
    if (!p) return sum
    return sum + taxIncluded(p.purchasePrice, p.taxRate ?? 10) * t.quantity
  }, 0)
  const distinctProducts = new Set(filtered.map((t) => t.productId)).size

  // Add modal product dropdown
  const dropProducts = form.productSearch.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(form.productSearch.toLowerCase())).slice(0, 10)
    : products.slice(0, 20)
  const selectedProduct = form.productId ? products.find((p) => p.id === form.productId) : null

  function openAdd() {
    setForm(BLANK_ADD())
    setShowDrop(false)
    setShowAddModal(true)
  }

  function handleAdd() {
    if (!form.productId) return
    addTransaction({
      type: 'receive',
      productId: form.productId,
      storeId: form.storeId,
      quantity: form.quantity,
      timestamp: new Date(form.date).getTime(),
    })
    setShowAddModal(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="今月の仕入高" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* フィルターバー */}
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              {/* 月切り替え */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMonthOffset((o) => o - 1)}
                  className="w-8 h-8 rounded-md border border-border text-muted hover:bg-bg flex items-center justify-center"
                >
                  ‹
                </button>
                <span className="text-sm font-bold min-w-[90px] text-center">{monthLabel}</span>
                <button
                  onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
                  disabled={monthOffset >= 0}
                  className="w-8 h-8 rounded-md border border-border text-muted hover:bg-bg flex items-center justify-center disabled:opacity-30"
                >
                  ›
                </button>
                {monthOffset < 0 && (
                  <button onClick={() => setMonthOffset(0)} className="text-xs text-accent font-semibold ml-1">
                    今月に戻る
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 ml-2 overflow-x-auto">
                <button
                  onClick={() => setStore('all')}
                  className={`flex-shrink-0 px-3 h-8 rounded-md text-xs font-bold transition-colors ${store === 'all' ? 'bg-text text-white' : 'bg-bg text-muted border border-border'}`}
                >
                  全店
                </button>
                {storeOrder.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStore(s as StoreF)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-bold transition-colors ${
                      store === s ? 'text-white' : 'bg-bg text-muted border border-border'
                    }`}
                    style={store === s ? { backgroundColor: storeInfo[s]?.color ?? '#888' } : undefined}
                  >
                    <StoreDot store={s} size="sm" />
                    {storeInfo[s]?.name ?? s}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* 表示切替 */}
              <div className="flex rounded-md border border-border overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setViewMode('detail')}
                  className={`px-3 h-8 text-xs font-bold transition-colors ${viewMode === 'detail' ? 'bg-accent text-white' : 'bg-surface text-muted'}`}
                >
                  明細
                </button>
                <button
                  onClick={() => setViewMode('byProduct')}
                  className={`px-3 h-8 text-xs font-bold border-l border-border transition-colors ${viewMode === 'byProduct' ? 'bg-accent text-white' : 'bg-surface text-muted'}`}
                >
                  商品別
                </button>
              </div>

              <Btn variant="primary" size="sm" onClick={openAdd}>＋ 仕入追加</Btn>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">仕入高 (税込)</span>
                <span className="text-3xl font-bold text-accent">{fmt(totalAmountIncTax)}</span>
                <span className="text-xs text-faint">税抜 {fmt(totalAmountExTax)}</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">仕入点数</span>
                <span className="text-3xl font-bold text-text">{totalQty}</span>
                <span className="text-xs text-faint">点</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">取扱商品数</span>
                <span className="text-3xl font-bold text-text">{distinctProducts}</span>
                <span className="text-xs text-faint">種類</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">平均仕入単価</span>
                <span className="text-3xl font-bold text-text">
                  {totalQty > 0 ? fmt(Math.round(totalAmountIncTax / totalQty)) : '—'}
                </span>
                <span className="text-xs text-faint">税込 /点</span>
              </Card>
            </div>
          </div>

          {/* テーブルエリア */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
                <span className="text-5xl">📦</span>
                <p className="text-base font-semibold">この月の仕入れ記録がありません</p>
                <p className="text-xs text-faint text-center">
                  仕入れ画面で ＋ をタップするか<br />右上の「＋ 仕入追加」から手動入力できます
                </p>
                <Btn variant="primary" size="sm" onClick={openAdd}>＋ 仕入追加</Btn>
              </div>
            ) : viewMode === 'byProduct' ? (
              /* 商品別集計テーブル */
              <table className="w-full min-w-[560px] text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-14">税率</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">合計数量</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-32">仕入単価(税込)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-32">合計金額(税込)</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.map((row) => (
                    <tr key={row.productId} className="border-b border-border hover:bg-bg transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-text">{row.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{row.category}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          row.taxRate === 8 ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent'
                        }`}>{row.taxRate}%</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">{row.totalQty}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">¥{row.unitIncTax.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-accent">¥{row.totalIncTax.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-bg border-t-2 border-border sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-muted">合計</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{totalQty}</td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-accent">¥{totalAmountIncTax.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              /* 明細テーブル（個別トランザクション） */
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">日付</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-16">店舗</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-14">税率</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">数量</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-28">単価(税込)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-28">小計(税込)</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const p = products.find((pr) => pr.id === t.productId)
                    const rate = p?.taxRate ?? 10
                    const unitIncTax = taxIncluded(p?.purchasePrice ?? 0, rate)
                    const totalIncTax = unitIncTax * t.quantity
                    const dateStr = new Date(t.timestamp).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                    return (
                      <tr key={t.id} className="border-b border-border hover:bg-bg transition-colors">
                        <td className="px-4 py-3 text-xs text-muted font-mono">{dateStr}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-text">{p?.name ?? '不明商品'}</p>
                          <p className="text-2xs text-faint">{p?.category ?? ''}</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <StoreDot store={t.storeId} size="sm" />
                            <span className="text-xs text-muted">{storeInfo[t.storeId]?.name ?? t.storeId}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            rate === 8 ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent'
                          }`}>{rate}%</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">{t.quantity}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">¥{unitIncTax.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">¥{totalIncTax.toLocaleString()}</td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="w-8 h-8 rounded-md text-danger bg-danger-soft hover:bg-danger hover:text-white transition-colors flex items-center justify-center text-sm font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-bg border-t-2 border-border sticky bottom-0">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-muted">合計</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{totalQty}</td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-accent">¥{totalAmountIncTax.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* 削除確認 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 shadow-xl flex flex-col gap-4 w-72">
            <p className="text-base font-bold">この仕入れ記録を削除しますか？</p>
            <p className="text-xs text-muted">削除すると元に戻せません。在庫数には反映されません。</p>
            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDeleteId(null)}>キャンセル</Btn>
              <Btn variant="danger" className="flex-1" onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) deleteTransaction(id) }}>
                削除
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* 仕入追加モーダル */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="bg-surface rounded-xl w-[440px] max-h-[90vh] overflow-y-auto shadow-xl flex flex-col gap-4 p-6">
            <p className="text-lg font-bold">仕入れを追加・修正</p>

            {/* 日付 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">日付</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
              />
            </div>

            {/* 店舗 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">店舗</label>
              <div className="flex gap-2 flex-wrap">
                {storeOrder.map((s) => {
                  const color = storeInfo[s]?.color ?? '#888888'
                  const active = form.storeId === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, storeId: s as StoreId }))}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-md text-sm font-bold border-2 transition-colors min-w-[80px]"
                      style={active ? { borderColor: color, backgroundColor: color, color: '#fff' } : { borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--surface)' }}
                    >
                      <StoreDot store={s} size="sm" />
                      {storeInfo[s]?.name ?? s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 商品選択 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">商品</label>
              {selectedProduct ? (
                <div className="border border-accent rounded-md p-3 bg-accent-soft flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text">{selectedProduct.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      仕入単価 税込 ¥{taxIncluded(selectedProduct.purchasePrice, selectedProduct.taxRate ?? 10).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onMouseDown={() => setForm((f) => ({ ...f, productId: '', productSearch: '' }))}
                    className="text-xs text-muted hover:text-text px-2 py-1"
                  >
                    ✕ 変更
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={form.productSearch}
                    onChange={(e) => setForm((f) => ({ ...f, productSearch: e.target.value }))}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                    placeholder="タップして商品一覧 / 商品名で検索"
                    className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
                  />
                  {showDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      {dropProducts.map((p) => (
                        <button
                          key={p.id}
                          onMouseDown={() => setForm((f) => ({ ...f, productId: p.id, productSearch: p.name }))}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg flex items-center justify-between border-b border-border last:border-0"
                        >
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-xs text-muted ml-2 flex-shrink-0">
                            ¥{taxIncluded(p.purchasePrice, p.taxRate ?? 10).toLocaleString()} 税込
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 数量 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">数量</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg transition-colors"
                >
                  −
                </button>
                <div className="flex-1 h-12 border-2 border-ok rounded-md flex items-center justify-center text-2xl font-bold text-ok">
                  {form.quantity}
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg transition-colors"
                >
                  ＋
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => setShowAddModal(false)}>キャンセル</Btn>
              <Btn variant="primary" onClick={handleAdd} disabled={!form.productId}>
                ✓ 追加
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
