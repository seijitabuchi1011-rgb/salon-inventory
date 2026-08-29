import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { useAppStore } from '../store'

export function LowStock() {
  const { currentStore, products, stocks, storeInfo } = useAppStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('すべて')
  const [categoryFilter, setCategoryFilter] = useState<string>('すべて')

  const storeIds = Object.keys(storeInfo)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const lowItems = products.flatMap((p) => {
    const storeStocks = storeIds.map((sid) => {
      const s = stocks.find((st) => st.productId === p.id && st.storeId === sid)
      const active = s?.active ?? true
      const current = s?.currentStock ?? 0
      const min = s?.minStock ?? 3
      const low = active && current <= min
      return { sid, current, min, low, active }
    })

    const anyLow = storeStocks.some((s) => s.low)

    if (currentStore !== 'all') {
      if (!storeStocks.find((s) => s.sid === currentStore)?.low) return []
    } else if (!anyLow) {
      return []
    }

    const urgent = storeStocks.some((s) => s.active && s.current === 0)

    return [{ id: p.id, name: p.name, category: p.category, storeStocks, urgent }]
  })

  const filterTabs = ['すべて', '緊急のみ', ...storeIds, '両店とも不足']

  const filtered = lowItems.filter((p) => {
    if (filter === '緊急のみ') return p.urgent
    if (filter === '両店とも不足') return p.storeStocks.filter((s) => s.active).every((s) => s.low)
    if (storeIds.includes(filter)) return p.storeStocks.find((s) => s.sid === filter)?.low ?? false
    return true
  })

  const categories = ['すべて', ...Array.from(new Set(filtered.map((p) => p.category).filter(Boolean))).sort()]
  const displayed = categoryFilter === 'すべて' ? filtered : filtered.filter((p) => p.category === categoryFilter)

  const handleFilterChange = (f: string) => {
    setFilter(f)
    setCategoryFilter('すべて')
  }

  const urgentCount = lowItems.filter((p) => p.urgent).length
  const storeLabel = currentStore === 'all' ? '全店' : (storeInfo[currentStore]?.name ?? currentStore)

  const tabLabel = (f: string) => {
    if (f === 'すべて' || f === '緊急のみ' || f === '両店とも不足') return f
    const name = storeInfo[f]?.name ?? f
    return name.replace('美容室', '').replace('美容院', '').trim() + '店'
  }

  const shortName = (sid: string) =>
    storeInfo[sid]?.name?.replace('美容室', '').replace('美容院', '').trim() ?? sid

  function exportCsv() {
    const storeHeaders = storeIds.flatMap((sid) => [`${storeInfo[sid]?.name ?? sid}在庫`, `${storeInfo[sid]?.name ?? sid}下限`])
    const header = ['商品名', 'カテゴリ', ...storeHeaders]
    const rows = displayed.map((p) => [
      p.name, p.category,
      ...p.storeStocks.flatMap((s) => [s.current, s.min]),
    ])
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
          <div className="px-4 md:px-6 pt-5 pb-3 bg-surface border-b border-border">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-2xs text-faint">{storeLabel} · 下限を下回っている商品</p>
                <p className="text-2xl md:text-3xl font-bold text-text">
                  {lowItems.length} 商品
                  {urgentCount > 0 && (
                    <span className="text-sm text-danger font-semibold ml-2">· 緊急 {urgentCount}件</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Btn variant="ghost" size="sm" onClick={exportCsv}>CSV</Btn>
                <Btn variant="primary" size="sm" disabled={selected.size === 0}>
                  {selected.size === 0 ? '↧ 発注（行を選択）' : `↧ ${selected.size}件 発注`}
                </Btn>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {filterTabs.map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    filter === f ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {tabLabel(f)}
                </button>
              ))}
            </div>
            {categories.length > 2 && (
              <div className="flex gap-2 overflow-x-auto mt-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`flex-shrink-0 px-3 h-6 rounded-full text-2xs font-semibold transition-colors ${
                      categoryFilter === c ? 'bg-text text-surface' : 'bg-bg text-faint border border-border'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
                <span className="text-5xl">✓</span>
                <p className="text-base font-semibold">在庫不足の商品はありません</p>
                <p className="text-xs text-faint">{storeLabel}の在庫はすべて下限を上回っています</p>
              </div>
            ) : (
              <>
                {/* モバイル: カードリスト */}
                <div className="md:hidden divide-y divide-border">
                  {displayed.map((p) => {
                    const checked = selected.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${checked ? 'bg-accent-soft' : ''}`}
                      >
                        <span
                          className={`w-6 h-6 mt-0.5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                            checked ? 'bg-text border-text text-white' : 'border-border-strong'
                          }`}
                        >
                          {checked && <span className="text-xs leading-none">✓</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-text text-sm truncate">{p.name}</span>
                            {p.urgent && <Badge variant="danger">緊急</Badge>}
                          </div>
                          <p className="text-xs text-muted mb-2">{p.category}</p>
                          <div className="flex gap-2 flex-wrap">
                            {p.storeStocks
                              .filter(({ sid }) => !storeIds.includes(filter) || sid === filter)
                              .map(({ sid, current, min, low }) => (
                                <StoreChip
                                  key={sid}
                                  label={shortName(sid)}
                                  color={storeInfo[sid]?.color ?? '#888'}
                                  current={current}
                                  min={min}
                                  low={low}
                                />
                              ))}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* デスクトップ: テーブル */}
                <table className="hidden md:table w-full text-sm border-collapse">
                  <thead className="bg-bg border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 w-10"></th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted">在庫状況</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((p) => {
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
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {p.storeStocks
                                .filter(({ sid }) => !storeIds.includes(filter) || sid === filter)
                                .map(({ sid, current, min, low }) => (
                                  <StoreChip
                                    key={sid}
                                    label={shortName(sid)}
                                    color={storeInfo[sid]?.color ?? '#888'}
                                    current={current}
                                    min={min}
                                    low={low}
                                  />
                                ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Btn variant="ghost" size="sm">発注</Btn>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function StoreChip({
  label,
  color,
  current,
  min,
  low,
}: {
  label: string
  color: string
  current: number
  min: number
  low: boolean
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border"
      style={{ borderColor: color + '40', backgroundColor: color + '14' }}
    >
      <span className="font-semibold" style={{ color }}>{label}</span>
      <span className={`font-bold tabular-nums ${low ? 'text-danger' : 'text-text'}`}>{current}</span>
      <span className="text-faint">/{min}</span>
    </span>
  )
}
