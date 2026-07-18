import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

type Period = '今日' | '今週' | '今月' | '先月'
type StoreF = 'all' | StoreId

function fmt(n: number) {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
}

function getPeriodRange(period: Period): [number, number] {
  const now = Date.now()
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const todayStart = d.getTime()

  if (period === '今日') return [todayStart, now]
  if (period === '今週') {
    return [todayStart - d.getDay() * 86400000, now]
  }
  if (period === '今月') {
    return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now]
  }
  // 先月
  return [
    new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(),
    new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999).getTime(),
  ]
}

export function Sales() {
  const { transactions, products } = useAppStore()
  const [period, setPeriod] = useState<Period>('今月')
  const [store, setStore] = useState<StoreF>('all')

  const dispenses = transactions.filter((t) => t.type === 'dispense')

  const [rangeStart, rangeEnd] = getPeriodRange(period)

  const filtered = dispenses.filter((t) => {
    const inPeriod = t.timestamp >= rangeStart && t.timestamp <= rangeEnd
    const inStore = store === 'all' || t.storeId === store
    return inPeriod && inStore
  })

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

  // 直近7日の日別グラフ
  const dailyBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const dayStart = d.getTime()
    const dayEnd = dayStart + 86400000 - 1
    const label = `${d.getMonth() + 1}/${d.getDate()}`

    const calc = (storeId: StoreId) =>
      dispenses
        .filter((t) => t.storeId === storeId && t.timestamp >= dayStart && t.timestamp <= dayEnd)
        .reduce((sum, t) => sum + (products.find((p) => p.id === t.productId)?.sellPrice ?? 0) * t.quantity, 0)

    return { date: label, flag: calc('flag'), lien: calc('lien') }
  })
  const maxBar = Math.max(...dailyBars.map((d) => d.flag + d.lien), 1)

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="販売実績" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border">
            {/* 期間・店舗フィルタ */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1">
                {(['今日', '今週', '今月', '先月'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 h-8 rounded-md text-xs font-bold transition-colors ${
                      period === p ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 ml-4">
                <button
                  onClick={() => setStore('all')}
                  className={`px-3 h-8 rounded-md text-xs font-bold transition-colors ${
                    store === 'all' ? 'bg-text text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  全店
                </button>
                {(['flag', 'lien'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStore(s)}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-bold transition-colors ${
                      store === s
                        ? s === 'flag' ? 'bg-flag text-white' : 'bg-lien text-white'
                        : 'bg-bg text-muted border border-border'
                    }`}
                  >
                    <StoreDot store={s} size="sm" />
                    {s === 'flag' ? 'flag' : 'Lien'}
                  </button>
                ))}
              </div>
            </div>

            {/* KPIカード */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">払出金額</span>
                <span className="text-3xl font-bold text-text">{fmt(totalAmount)}</span>
                <span className="text-xs text-faint">払出数 × 売価</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">払出点数</span>
                <span className="text-3xl font-bold text-text">{totalQty}</span>
                <span className="text-xs text-faint">点</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">平均単価</span>
                <span className="text-3xl font-bold text-text">
                  {totalQty > 0 ? `¥${avgPrice.toLocaleString()}` : '—'}
                </span>
                <span className="text-xs text-faint">/点</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">取扱商品数</span>
                <span className="text-3xl font-bold text-accent">{distinctProducts}</span>
                <span className="text-xs text-faint">種類</span>
              </Card>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-[1fr_340px] gap-5 content-start">
            {/* 日別推移グラフ */}
            <Card padding={false}>
              <div className="p-4 border-b border-border">
                <p className="text-sm font-bold">日別払出金額 (直近7日)</p>
              </div>
              {dispenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted gap-2">
                  <p className="text-sm font-semibold">まだデータがありません</p>
                  <p className="text-xs text-faint text-center">
                    仕入れ → 払出数タブ で − をタップすると<br />ここにグラフが表示されます
                  </p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-end gap-2 h-40">
                    {dailyBars.map((d) => {
                      const flagH = Math.round((d.flag / maxBar) * 100)
                      const lienH = Math.round((d.lien / maxBar) * 100)
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <div className="flex items-end gap-0.5 w-full" style={{ height: 128 }}>
                            <div className="flex-1 rounded-t bg-flag opacity-80 transition-all" style={{ height: `${flagH}%` }} />
                            <div className="flex-1 rounded-t bg-lien opacity-80 transition-all" style={{ height: `${lienH}%` }} />
                          </div>
                          <span className="text-2xs text-faint">{d.date}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-flag opacity-80" />
                      <span className="text-xs text-muted">flag</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-lien opacity-80" />
                      <span className="text-xs text-muted">Lien</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* 払出ランキング */}
            <Card padding={false}>
              <div className="p-4 border-b border-border">
                <p className="text-sm font-bold">払出ランキング</p>
                <p className="text-xs text-faint mt-0.5">
                  {period} · {store === 'all' ? '全店' : store === 'flag' ? 'flag美容室' : 'Lien美容室'}
                </p>
              </div>
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-muted gap-2">
                  <p className="text-sm font-semibold">該当なし</p>
                  {dispenses.length === 0 && (
                    <p className="text-xs text-faint text-center">
                      払出数をカウントすると<br />ランキングが表示されます
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-accent' : 'text-faint'}`}>
                        {i + 1}
                      </span>
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
        </main>
      </div>
    </div>
  )
}
