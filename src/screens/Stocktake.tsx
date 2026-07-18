import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'

type StoreTab = 'flag' | 'lien'
type ItemStatus = '未確認' | '確認済' | '差異'
type FilterType = 'すべて' | '未確認' | '確認済' | '差異'

const STATUS_VARIANT: Record<ItemStatus, 'muted' | 'ok' | 'danger'> = {
  未確認: 'muted', 確認済: 'ok', 差異: 'danger',
}

export function Stocktake() {
  const { products, stocks, upsertStock } = useAppStore()
  const [store, setStore] = useState<StoreTab>('flag')
  const [filter, setFilter] = useState<FilterType>('すべて')
  const [modal, setModal] = useState<{ productId: string; inputQty: number } | null>(null)

  // 棚卸開始時の在庫スナップショット（このセッション中は変わらない）
  const [theoretical] = useState<Record<string, Record<string, number>>>(() => {
    const snap: Record<string, Record<string, number>> = { flag: {}, lien: {} }
    stocks.forEach((s) => {
      if (s.storeId === 'flag' || s.storeId === 'lien') {
        snap[s.storeId][s.productId] = s.currentStock
      }
    })
    return snap
  })

  // 入力済み実棚数
  const [actualCounts, setActualCounts] = useState<Record<string, Record<string, number>>>({
    flag: {}, lien: {},
  })

  const month = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  // 選択店舗でアクティブな商品一覧を組み立て
  const items = products
    .map((p) => {
      const s = stocks.find((st) => st.productId === p.id && st.storeId === store)
      if (s?.active === false) return null
      const theo = theoretical[store]?.[p.id] ?? (s?.currentStock ?? 0)
      const actual = actualCounts[store][p.id] ?? null
      const status: ItemStatus =
        actual === null ? '未確認' :
        actual === theo ? '確認済' : '差異'
      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        purchasePrice: p.purchasePrice ?? 0,
        theoretical: theo,
        minStock: s?.minStock ?? 3,
        actual,
        status,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const confirmed = items.filter((i) => i.status !== '未確認').length
  const diffCount = items.filter((i) => i.status === '差異').length
  const progress = items.length > 0 ? Math.round((confirmed / items.length) * 100) : 0
  const totalValue = items.reduce((sum, item) =>
    item.actual !== null ? sum + item.actual * item.purchasePrice : sum, 0
  )

  const filtered = items.filter((item) =>
    filter === 'すべて' ? true : item.status === filter
  )

  const modalItem = modal ? items.find((i) => i.productId === modal.productId) : null

  function openModal(item: typeof items[0]) {
    setModal({ productId: item.productId, inputQty: item.actual ?? item.theoretical })
  }

  function confirmInput() {
    if (!modal || !modalItem) return
    const qty = modal.inputQty
    setActualCounts((prev) => ({
      ...prev,
      [store]: { ...prev[store], [modal.productId]: qty },
    }))
    // 実棚数を在庫に反映
    const s = stocks.find((s) => s.productId === modal.productId && s.storeId === store)
    upsertStock({
      productId: modal.productId,
      storeId: store,
      currentStock: qty,
      minStock: s?.minStock ?? 3,
      active: s?.active ?? true,
    })
    setModal(null)
  }

  function exportCsv() {
    const storeName = store === 'flag' ? 'flag美容室' : 'Lien美容室'
    const header = ['商品名', 'カテゴリ', '仕入単価', '理論在庫', '実棚数', '差異', '状態', '在庫金額']
    const rows = items.map((item) => {
      const diff = item.actual !== null ? item.actual - item.theoretical : ''
      const value = item.actual !== null ? item.actual * item.purchasePrice : ''
      return [item.name, item.category, item.purchasePrice, item.theoretical, item.actual ?? '', diff, item.status, value]
    })
    rows.push(['', '', '', '', '', '', '合計金額', totalValue])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `棚卸_${storeName}_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="棚卸" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* ヘッダー */}
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border">
            <div className="flex gap-2 mb-4">
              {(['flag', 'lien'] as StoreTab[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStore(s); setFilter('すべて') }}
                  className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-bold border transition-colors ${
                    store === s
                      ? s === 'flag' ? 'bg-flag-soft text-flag border-flag' : 'bg-lien-soft text-lien border-lien'
                      : 'bg-bg text-muted border-border'
                  }`}
                >
                  <StoreDot store={s} />
                  {s === 'flag' ? 'flag 美容室' : 'Lien 美容室'}
                </button>
              ))}
              <div className="flex-1" />
              <Btn variant="ghost" size="sm" onClick={exportCsv}>CSVエクスポート</Btn>
              <Btn variant="primary" size="sm" disabled={confirmed === 0}>棚卸を完了</Btn>
            </div>

            {/* サマリーカード */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">進捗</span>
                <span className="text-3xl font-bold text-accent">{progress}%</span>
                <span className="text-xs text-faint">{month}</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">確認済</span>
                <span className="text-3xl font-bold text-ok">{confirmed}</span>
                <span className="text-xs text-faint">/ {items.length} 商品</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">未確認</span>
                <span className="text-3xl font-bold text-text">{items.length - confirmed}</span>
                <span className="text-xs text-faint">残り</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">差異あり</span>
                <span className="text-3xl font-bold text-danger">{diffCount}</span>
                <span className="text-xs text-faint">要確認</span>
              </Card>
              <Card className="flex flex-col gap-1 border-accent">
                <span className="text-xs text-accent font-semibold">在庫合計金額</span>
                <span className="text-2xl font-bold text-text leading-tight">
                  ¥{totalValue.toLocaleString()}
                </span>
                <span className="text-xs text-faint">実棚数 × 仕入単価</span>
              </Card>
            </div>

            <div className="h-2 bg-bg rounded-full overflow-hidden mb-4">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(['すべて', '未確認', '確認済', '差異'] as FilterType[]).map((f) => (
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
              <span className="ml-auto text-xs text-faint flex-shrink-0 self-center">{filtered.length} 商品</span>
            </div>
          </div>

          {/* テーブル */}
          <div className="flex-1 overflow-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
                <span className="text-5xl">📦</span>
                <p className="text-base font-semibold">取扱商品がありません</p>
                <p className="text-xs text-faint">商品一覧で {store === 'flag' ? 'flag' : 'Lien'} の取扱をONにしてください</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">仕入単価</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">理論在庫</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">実棚数</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">差異</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-24">在庫金額</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-24">状態</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const diff = item.actual !== null ? item.actual - item.theoretical : null
                    const value = item.actual !== null ? item.actual * item.purchasePrice : null

                    return (
                      <tr key={item.productId} className="border-b border-border hover:bg-bg transition-colors">
                        <td className="px-4 py-3 font-semibold text-text">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-muted">{item.category}</td>
                        <td className="px-4 py-3 text-right text-muted tabular-nums">
                          ¥{item.purchasePrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.theoretical}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {item.actual !== null ? item.actual : <span className="text-faint">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${
                          diff === null ? 'text-faint' : diff < 0 ? 'text-danger' : diff > 0 ? 'text-ok' : 'text-muted'
                        }`}>
                          {diff !== null ? (diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-text">
                          {value !== null ? `¥${value.toLocaleString()}` : <span className="text-faint">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Btn variant="ghost" size="sm" onClick={() => openModal(item)}>
                            {item.status === '未確認' ? '入力' : '修正'}
                          </Btn>
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

      {/* 実棚数入力モーダル */}
      {modal && modalItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <p className="text-xs text-muted font-semibold mb-1">{modalItem.category}</p>
            <p className="text-base font-bold mb-1 leading-snug">{modalItem.name}</p>
            <p className="text-xs text-muted mb-5">
              理論在庫: {modalItem.theoretical} 個
              {modalItem.purchasePrice > 0 && ` · 仕入単価: ¥${modalItem.purchasePrice.toLocaleString()}`}
            </p>

            <p className="text-xs font-semibold text-muted mb-2">実棚数を入力</p>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setModal((m) => m && { ...m, inputQty: Math.max(0, m.inputQty - 1) })}
                className="w-16 h-16 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg"
              >−</button>
              <div className="flex-1 h-16 border-2 border-accent rounded-md flex items-center justify-center text-4xl font-bold text-accent">
                {modal.inputQty}
              </div>
              <button
                onClick={() => setModal((m) => m && { ...m, inputQty: m.inputQty + 1 })}
                className="w-16 h-16 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg"
              >＋</button>
            </div>

            {(() => {
              const diff = modal.inputQty - modalItem.theoretical
              return (
                <p className={`text-center text-sm font-semibold mb-5 ${
                  diff < 0 ? 'text-danger' : diff > 0 ? 'text-ok' : 'text-muted'
                }`}>
                  差異: {diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff} 個
                  {modalItem.purchasePrice > 0 && ` · ¥${(modal.inputQty * modalItem.purchasePrice).toLocaleString()}`}
                </p>
              )
            })()}

            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setModal(null)}>キャンセル</Btn>
              <Btn variant="primary" className="flex-[2]" onClick={confirmInput}>✓ 確定</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
