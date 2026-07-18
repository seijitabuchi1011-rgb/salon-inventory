import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
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
  const y = now.getFullYear()
  const m = now.getMonth() + offset
  const start = new Date(y, m, 1).getTime()
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
  const label = `${new Date(y, m, 1).getFullYear()}年${new Date(y, m, 1).getMonth() + 1}月`
  return [start, end, label]
}

export function MonthlyPurchases() {
  const { transactions, products } = useAppStore()
  const [monthOffset, setMonthOffset] = useState(0)
  const [store, setStore] = useState<StoreF>('all')

  const [rangeStart, rangeEnd, monthLabel] = getMonthRange(monthOffset)

  const receives = transactions.filter((t) => {
    if (t.type !== 'receive') return false
    if (t.timestamp < rangeStart || t.timestamp > rangeEnd) return false
    if (store !== 'all' && t.storeId !== store) return false
    return true
  })

  const totalQty = receives.reduce((sum, t) => sum + t.quantity, 0)
  const totalAmountExTax = receives.reduce((sum, t) => {
    const p = products.find((pr) => pr.id === t.productId)
    return sum + (p?.purchasePrice ?? 0) * t.quantity
  }, 0)
  const totalAmountIncTax = receives.reduce((sum, t) => {
    const p = products.find((pr) => pr.id === t.productId)
    if (!p) return sum
    return sum + taxIncluded(p.purchasePrice, p.taxRate ?? 10) * t.quantity
  }, 0)
  const distinctProducts = new Set(receives.map((t) => t.productId)).size

  // 商品別集計
  type Row = { id: string; name: string; category: string; taxRate: 8 | 10; qty: number; amountExTax: number; amountIncTax: number }
  const rowMap = new Map<string, Row>()
  receives.forEach((t) => {
    const p = products.find((pr) => pr.id === t.productId)
    const rate = p?.taxRate ?? 10
    const exTax = (p?.purchasePrice ?? 0) * t.quantity
    const incTax = taxIncluded(p?.purchasePrice ?? 0, rate) * t.quantity
    const row = rowMap.get(t.productId)
    if (row) { row.qty += t.quantity; row.amountExTax += exTax; row.amountIncTax += incTax }
    else rowMap.set(t.productId, {
      id: t.productId,
      name: p?.name ?? '不明商品',
      category: p?.category ?? '',
      taxRate: rate,
      qty: t.quantity,
      amountExTax: exTax,
      amountIncTax: incTax,
    })
  })
  const rows = [...rowMap.values()].sort((a, b) => b.amountIncTax - a.amountIncTax)

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
                  <button
                    onClick={() => setMonthOffset(0)}
                    className="text-xs text-accent font-semibold ml-1"
                  >
                    今月に戻る
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 ml-4">
                <button
                  onClick={() => setStore('all')}
                  className={`px-3 h-8 rounded-md text-xs font-bold transition-colors ${store === 'all' ? 'bg-text text-white' : 'bg-bg text-muted border border-border'}`}
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

          {/* 明細テーブル */}
          <div className="flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
                <span className="text-5xl">📦</span>
                <p className="text-base font-semibold">この月の仕入れ記録がありません</p>
                <p className="text-xs text-faint text-center">
                  仕入れ画面の ↑ 仕入数 タブで ＋ をタップすると<br />ここに集計が表示されます
                </p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-16">税率</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">数量</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-32">仕入単価(税込)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-32">合計(税込)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const unitIncTax = row.qty > 0 ? Math.round(row.amountIncTax / row.qty) : 0
                    return (
                      <tr key={row.id} className="border-b border-border hover:bg-bg transition-colors">
                        <td className="px-4 py-3 font-semibold text-text">{row.name}</td>
                        <td className="px-4 py-3 text-xs text-muted">{row.category}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            row.taxRate === 8 ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent'
                          }`}>
                            {row.taxRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">{row.qty}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">¥{unitIncTax.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-text">¥{row.amountIncTax.toLocaleString()}</td>
                      </tr>
                    )
                  })}
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
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
