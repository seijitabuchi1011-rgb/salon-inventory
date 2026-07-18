import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { useAppStore } from '../store'

type Filter = 'すべて' | '緊急のみ' | 'flag店' | 'Lien店' | '両店とも不足'

export function LowStock() {
  const { currentStore, products, stocks } = useAppStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('すべて')

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const lowItems = products.flatMap((p) => {
    const flagS = stocks.find((s) => s.productId === p.id && s.storeId === 'flag')
    const lienS = stocks.find((s) => s.productId === p.id && s.storeId === 'lien')

    const flagActive = flagS?.active ?? true
    const lienActive = lienS?.active ?? true
    const flagCurrent = flagS?.currentStock ?? 0
    const lienCurrent = lienS?.currentStock ?? 0
    const flagMin = flagS?.minStock ?? 3
    const lienMin = lienS?.minStock ?? 3

    const flagLow = flagActive && flagCurrent <= flagMin
    const lienLow = lienActive && lienCurrent <= lienMin

    // currentStore フィルタ
    if (currentStore === 'flag' && !flagLow) return []
    if (currentStore === 'lien' && !lienLow) return []
    if (currentStore === 'all' && !flagLow && !lienLow) return []

    return [{
      id: p.id,
      name: p.name,
      category: p.category,
      flag: flagCurrent,
      lien: lienCurrent,
      flagMin,
      lienMin,
      flagLow,
      lienLow,
      urgent: (flagActive && flagCurrent === 0) || (lienActive && lienCurrent === 0),
    }]
  })

  const filtered = lowItems.filter((p) => {
    if (filter === '緊急のみ') return p.urgent
    if (filter === 'flag店') return p.flagLow
    if (filter === 'Lien店') return p.lienLow
    if (filter === '両店とも不足') return p.flagLow && p.lienLow
    return true
  })

  const urgentCount = lowItems.filter((p) => p.urgent).length
  const storeLabel = currentStore === 'flag' ? 'flag美容室' : currentStore === 'lien' ? 'Lien美容室' : '全店'

  function exportCsv() {
    const header = ['商品名', 'カテゴリ', 'flag在庫', 'Lien在庫', 'flag下限', 'Lien下限']
    const rows = filtered.map((p) => [p.name, p.category, p.flag, p.lien, p.flagMin, p.lienMin])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `在庫不足一覧_${storeLabel}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="在庫不足一覧" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          <div className="px-6 pt-5 pb-3 bg-surface border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <p className="text-2xs text-faint">
                  {storeLabel} · 下限を下回っている商品
                </p>
                <p className="text-3xl font-bold text-text">
                  {lowItems.length} 商品
                  {urgentCount > 0 && (
                    <span className="text-sm text-danger font-semibold ml-2">· 緊急 {urgentCount}件</span>
                  )}
                </p>
              </div>
              <div className="flex-1" />
              <Btn variant="ghost" size="sm" onClick={exportCsv}>CSVエクスポート</Btn>
              <Btn variant="primary" size="sm" disabled={selected.size === 0}>
                ↧ 選択中 {selected.size}件をまとめて発注
              </Btn>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['すべて', '緊急のみ', 'flag店', 'Lien店', '両店とも不足'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    filter === f ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
                <span className="text-5xl">✓</span>
                <p className="text-base font-semibold">在庫不足の商品はありません</p>
                <p className="text-xs text-faint">{storeLabel}の在庫はすべて下限を上回っています</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 w-10"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: '#1B5EB8' }}>flag在庫</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: '#1B5EB8' }}>flag下限</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: '#7B2FA8' }}>Lien在庫</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: '#7B2FA8' }}>Lien下限</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const checked = selected.has(p.id)
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-border transition-colors ${checked ? 'bg-accent-soft' : 'hover:bg-bg'}`}
                      >
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggle(p.id)}
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              checked ? 'bg-text border-text text-white' : 'border-border-strong'
                            }`}
                          >
                            {checked && <span className="text-xs leading-none">✓</span>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text">{p.name}</span>
                            {p.urgent && <Badge variant="danger">緊急</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">{p.category}</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${p.flagLow ? 'text-danger' : 'text-text'}`}>
                          {p.flag}
                        </td>
                        <td className="px-4 py-3 text-right text-muted tabular-nums">{p.flagMin}</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${p.lienLow ? 'text-danger' : 'text-text'}`}>
                          {p.lien}
                        </td>
                        <td className="px-4 py-3 text-right text-muted tabular-nums">{p.lienMin}</td>
                        <td className="px-4 py-3 text-center">
                          <Btn variant="ghost" size="sm">発注</Btn>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
