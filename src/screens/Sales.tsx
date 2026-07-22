import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

type Period = '今日' | '今週' | '今月' | '先月'
type StoreF = 'all' | StoreId
type ViewMode = 'summary' | 'detail'

function fmt(n: number) {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
}

function getPeriodRange(period: Period): [number, number] {
  const now = Date.now()
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const todayStart = d.getTime()
  if (period === '今日') return [todayStart, now]
  if (period === '今週') return [todayStart - d.getDay() * 86400000, now]
  if (period === '今月') return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now]
  return [
    new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(),
    new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999).getTime(),
  ]
}

type AddForm = {
  date: string
  storeId: StoreId
  productId: string
  productSearch: string
  quantity: number
}

const BLANK_ADD = (defaultStore: StoreId): AddForm => ({
  date: new Date().toISOString().slice(0, 10),
  storeId: defaultStore,
  productId: '',
  productSearch: '',
  quantity: 1,
})

export function Sales() {
  const { transactions, products, stocks, upsertStock, addTransaction, deleteTransaction, storeOrder, storeInfo } = useAppStore()
  const [period, setPeriod] = useState<Period>('今月')
  const [store, setStore] = useState<StoreF>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<AddForm>(BLANK_ADD(storeOrder[0] ?? 'flag'))
  const [showDrop, setShowDrop] = useState(false)

  const dispenses = transactions.filter((t) => t.type === 'dispense')

  const [rangeStart, rangeEnd] = getPeriodRange(period)

  const filtered = dispenses.filter((t) => {
    const inPeriod = t.timestamp >= rangeStart && t.timestamp <= rangeEnd
    const inStore = store === 'all' || t.storeId === store
    return inPeriod && inStore
  }).sort((a, b) => b.timestamp - a.timestamp)

  // KPIs
  const totalQty = filtered.reduce((sum, t) => sum + t.quantity, 0)
  const totalAmount = filtered.reduce((sum, t) => {
    const p = products.find((pr) => pr.id === t.productId)
    return sum + (p?.sellPrice ?? 0) * t.quantity
  }, 0)
  const avgPrice = totalQty > 0 ? Math.round(totalAmount / totalQty) : 0
  const distinctProducts = new Set(filtered.map((t) => t.productId)).size

  // 払出ランキング
  const productMap = new Map<string, { qty: number; amount: number }>()
  filtered.forEach((t) => {
    const p = products.find((pr) => pr.id === t.productId)
    const amount = (p?.sellPrice ?? 0) * t.quantity
    const e = productMap.get(t.productId)
    if (e) { e.qty += t.quantity; e.amount += amount }
    else productMap.set(t.productId, { qty: t.quantity, amount })
  })
  const topProducts = [...productMap.entries()]
    .map(([id, d]) => ({
      id,
      name: products.find((p) => p.id === id)?.name ?? '',
      category: products.find((p) => p.id === id)?.category ?? '',
      ...d,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // 直近7日の日別グラフ（動的店舗対応）
  const dailyBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const dayStart = d.getTime()
    const dayEnd = dayStart + 86400000 - 1
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const byStore: Record<string, number> = {}
    storeOrder.forEach((sid) => {
      byStore[sid] = dispenses
        .filter((t) => t.storeId === sid && t.timestamp >= dayStart && t.timestamp <= dayEnd)
        .reduce((sum, t) => sum + (products.find((p) => p.id === t.productId)?.sellPrice ?? 0) * t.quantity, 0)
    })
    const total = Object.values(byStore).reduce((s, v) => s + v, 0)
    return { date: label, byStore, total }
  })
  const maxBar = Math.max(...dailyBars.map((d) => d.total), 1)

  // Add modal
  const selectedProduct = form.productId ? products.find((p) => p.id === form.productId) : null
  const dropProducts = form.productSearch.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(form.productSearch.toLowerCase())).slice(0, 10)
    : products.slice(0, 20)

  function handleAdd() {
    if (!form.productId) return
    const p = products.find((pr) => pr.id === form.productId)
    addTransaction({
      type: 'dispense',
      productId: form.productId,
      storeId: form.storeId,
      quantity: form.quantity,
      timestamp: new Date(form.date).getTime(),
    })
    if (p) {
      const s = stocks.find((st) => st.productId === form.productId && st.storeId === form.storeId)
      upsertStock({
        productId: form.productId,
        storeId: form.storeId,
        currentStock: Math.max(0, (s?.currentStock ?? 0) - form.quantity),
        minStock: s?.minStock ?? 3,
        active: s?.active ?? true,
      })
    }
    setShowAddModal(false)
  }

  const storeName = store === 'all' ? '全店' : (storeInfo[store]?.name ?? store)

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="販売実績" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* フィルターバー */}
          <div className="px-4 md:px-6 pt-4 pb-4 bg-surface border-b border-border">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* 期間 */}
              <div className="flex gap-1">
                {(['今日', '今週', '今月', '先月'] as Period[]).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 h-8 rounded-md text-xs font-bold transition-colors ${period === p ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'}`}>
                    {p}
                  </button>
                ))}
              </div>

              {/* 店舗 */}
              <div className="flex gap-1.5 overflow-x-auto">
                <button onClick={() => setStore('all')}
                  className={`flex-shrink-0 px-3 h-8 rounded-md text-xs font-bold transition-colors ${store === 'all' ? 'bg-text text-white' : 'bg-bg text-muted border border-border'}`}>
                  全店
                </button>
                {storeOrder.map((s) => (
                  <button key={s} onClick={() => setStore(s)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-bold transition-colors ${store === s ? 'text-white' : 'bg-bg text-muted border border-border'}`}
                    style={store === s ? { backgroundColor: storeInfo[s]?.color ?? '#888' } : undefined}>
                    <StoreDot store={s} size="sm" />
                    {storeInfo[s]?.name ?? s}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* 表示切替 */}
              <div className="flex rounded-md border border-border overflow-hidden flex-shrink-0">
                <button onClick={() => setViewMode('summary')}
                  className={`px-3 h-8 text-xs font-bold transition-colors ${viewMode === 'summary' ? 'bg-accent text-white' : 'bg-surface text-muted'}`}>
                  概要
                </button>
                <button onClick={() => setViewMode('detail')}
                  className={`px-3 h-8 text-xs font-bold border-l border-border transition-colors ${viewMode === 'detail' ? 'bg-accent text-white' : 'bg-surface text-muted'}`}>
                  明細
                </button>
              </div>

              {viewMode === 'detail' && (
                <Btn variant="primary" size="sm" onClick={() => { setForm(BLANK_ADD(storeOrder[0] ?? 'flag')); setShowAddModal(true) }}>
                  ＋ 追加
                </Btn>
              )}
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Card className="flex flex-col gap-0.5 py-2">
                <span className="text-2xs text-muted font-semibold">払出金額</span>
                <span className="text-2xl font-bold text-text">{fmt(totalAmount)}</span>
                <span className="text-2xs text-faint">払出数×売価</span>
              </Card>
              <Card className="flex flex-col gap-0.5 py-2">
                <span className="text-2xs text-muted font-semibold">払出点数</span>
                <span className="text-2xl font-bold text-text">{totalQty}</span>
                <span className="text-2xs text-faint">点</span>
              </Card>
              <Card className="flex flex-col gap-0.5 py-2">
                <span className="text-2xs text-muted font-semibold">平均単価</span>
                <span className="text-2xl font-bold text-text">{totalQty > 0 ? `¥${avgPrice.toLocaleString()}` : '—'}</span>
                <span className="text-2xs text-faint">/点</span>
              </Card>
              <Card className="flex flex-col gap-0.5 py-2">
                <span className="text-2xs text-muted font-semibold">取扱商品数</span>
                <span className="text-2xl font-bold text-accent">{distinctProducts}</span>
                <span className="text-2xs text-faint">種類</span>
              </Card>
            </div>
          </div>

          {/* ======== 概要タブ ======== */}
          {viewMode === 'summary' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 content-start">

              {/* 日別グラフ */}
              <Card padding={false}>
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-bold">日別払出金額 (直近7日)</p>
                </div>
                {dispenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted gap-2">
                    <p className="text-sm font-semibold">まだデータがありません</p>
                    <p className="text-xs text-faint text-center">払出し画面で − をタップすると表示されます</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-end gap-1.5 h-36">
                      {dailyBars.map((d) => {
                        let bottom = 0
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex flex-col-reverse items-stretch w-full" style={{ height: 120 }}>
                              {storeOrder.map((sid) => {
                                const h = Math.round((d.byStore[sid] ?? 0) / maxBar * 100)
                                void bottom
                                return (
                                  <div key={sid}
                                    className="w-full rounded-t transition-all"
                                    style={{ height: `${h}%`, backgroundColor: storeInfo[sid]?.color ?? '#888', opacity: 0.8 }} />
                                )
                              })}
                            </div>
                            <span className="text-2xs text-faint">{d.date}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-4 mt-3 flex-wrap">
                      {storeOrder.map((sid) => (
                        <div key={sid} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: storeInfo[sid]?.color ?? '#888', opacity: 0.8 }} />
                          <span className="text-xs text-muted">{storeInfo[sid]?.name ?? sid}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* 払出ランキング */}
              <Card padding={false}>
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-bold">払出ランキング</p>
                  <p className="text-xs text-faint mt-0.5">{period} · {storeName}</p>
                </div>
                {topProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-muted gap-2">
                    <p className="text-sm font-semibold">該当なし</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {topProducts.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-accent' : 'text-faint'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text truncate">{p.name}</p>
                          <p className="text-xs text-muted">{p.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold tabular-nums">{p.qty}点</p>
                          <p className="text-2xs text-faint tabular-nums">{fmt(p.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ======== 明細タブ ======== */}
          {viewMode === 'detail' && (
            <div className="flex-1 overflow-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
                  <span className="text-5xl">📊</span>
                  <p className="text-base font-semibold">この期間・店舗の払出し記録がありません</p>
                  <Btn variant="primary" size="sm" onClick={() => { setForm(BLANK_ADD(storeOrder[0] ?? 'flag')); setShowAddModal(true) }}>＋ 追加</Btn>
                </div>
              ) : (
                <table className="w-full min-w-[560px] text-sm border-collapse">
                  <thead className="bg-bg border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">日付</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-20">店舗</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">数量</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-28">売価(税抜)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-28">小計</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const p = products.find((pr) => pr.id === t.productId)
                      const unit = p?.sellPrice ?? 0
                      const subtotal = unit * t.quantity
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
                          <td className="px-4 py-3 text-right tabular-nums font-bold">{t.quantity}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted">
                            {unit > 0 ? `¥${unit.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold">
                            {unit > 0 ? `¥${subtotal.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="w-7 h-7 rounded-md text-faint hover:text-danger hover:bg-danger-soft transition-colors flex items-center justify-center text-sm"
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
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-muted">合計</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{totalQty}</td>
                      <td />
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-accent">¥{totalAmount.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 削除確認 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 shadow-xl flex flex-col gap-4 w-72">
            <p className="text-base font-bold">この払出し記録を削除しますか？</p>
            <p className="text-xs text-muted">削除すると元に戻せません。在庫数への反映は取り消されません。</p>
            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDeleteId(null)}>キャンセル</Btn>
              <Btn variant="danger" className="flex-1" onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) deleteTransaction(id) }}>削除</Btn>
            </div>
          </div>
        </div>
      )}

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-surface rounded-xl w-[420px] max-w-[95vw] shadow-xl flex flex-col gap-4 p-6">
            <p className="text-lg font-bold">払出しを追加</p>

            {/* 日付 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">日付</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
            </div>

            {/* 店舗 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">店舗</label>
              <div className="flex gap-2 flex-wrap">
                {storeOrder.map((s) => {
                  const color = storeInfo[s]?.color ?? '#888'
                  const active = form.storeId === s
                  return (
                    <button key={s} type="button"
                      onClick={() => setForm((f) => ({ ...f, storeId: s as StoreId }))}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-md text-sm font-bold border-2 transition-colors min-w-[80px]"
                      style={active ? { borderColor: color, backgroundColor: color, color: '#fff' } : { borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--surface)' }}>
                      <StoreDot store={s} size="sm" />
                      {storeInfo[s]?.name ?? s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 商品 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">商品</label>
              {selectedProduct ? (
                <div className="border border-accent rounded-md p-3 bg-accent-soft flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text">{selectedProduct.name}</p>
                    <p className="text-xs text-muted mt-0.5">売価 ¥{selectedProduct.sellPrice.toLocaleString()}</p>
                  </div>
                  <button onMouseDown={() => setForm((f) => ({ ...f, productId: '', productSearch: '' }))}
                    className="text-xs text-muted hover:text-text px-2 py-1">✕ 変更</button>
                </div>
              ) : (
                <>
                  <input value={form.productSearch}
                    onChange={(e) => setForm((f) => ({ ...f, productSearch: e.target.value }))}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                    placeholder="商品名で検索"
                    className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
                  {showDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      {dropProducts.map((p) => (
                        <button key={p.id}
                          onMouseDown={() => setForm((f) => ({ ...f, productId: p.id, productSearch: p.name }))}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg flex items-center justify-between border-b border-border last:border-0">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-xs text-muted ml-2 flex-shrink-0">¥{p.sellPrice.toLocaleString()}</span>
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
                <button onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg transition-colors">−</button>
                <div className="flex-1 h-12 border-2 border-accent rounded-md flex items-center justify-center text-2xl font-bold text-accent">
                  {form.quantity}
                </div>
                <button onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg transition-colors">＋</button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => setShowAddModal(false)}>キャンセル</Btn>
              <Btn variant="primary" onClick={handleAdd} disabled={!form.productId}>✓ 追加</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
