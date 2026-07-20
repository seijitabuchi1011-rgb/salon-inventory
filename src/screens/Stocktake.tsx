import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId, StocktakeSnapshot, Product, StoreStock } from '../types'

type StoreTab = 'flag' | 'lien'
type ItemStatus = '未確認' | '確認済' | '差異'
type StatusFilter = 'すべて' | '未確認' | '確認済' | '差異'

const STATUS_VARIANT: Record<ItemStatus, 'muted' | 'ok' | 'danger'> = {
  未確認: 'muted', 確認済: 'ok', 差異: 'danger',
}

const CATEGORIES = [
  'すべて',
  'カラー剤', 'ブリーチ剤', 'カラーオキシ',
  'パーマ剤', 'プレックス剤', '髪ドラ',
  'oggi otto', 'H2', '処理剤', '小物類',
  'シャンプー', 'トリートメント', 'アウトバスTR', 'スタイリング', 'オイル',
]

type ScreenTab = '棚卸実施' | '月次記録'

// ────────────────────────────────────────────
// 月次記録タブ
// ────────────────────────────────────────────
function HistoryTab({
  snapshots,
  products,
  stocks,
  onDelete,
}: {
  snapshots: StocktakeSnapshot[]
  products: Product[]
  stocks: StoreStock[]
  onDelete: (id: string) => void
}) {
  // 現在の在庫評価額（理論値）
  const calcTotal = (storeId: StoreId) =>
    products.reduce((sum, p) => {
      const s = stocks.find((st) => st.productId === p.id && st.storeId === storeId)
      return s?.active !== false ? sum + (s?.currentStock ?? 0) * (p.purchasePrice ?? 0) : sum
    }, 0)
  const currentFlag = calcTotal('flag')
  const currentLien = calcTotal('lien')

  // 月ごとにグループ化（新しい順）
  const months = [...new Set(snapshots.map((s) => s.month))].sort().reverse()

  function fmtMonth(ym: string) {
    const [y, m] = ym.split('-')
    return `${y}年${parseInt(m)}月`
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
      {/* 現在の在庫評価額 */}
      <div>
        <p className="text-xs font-semibold text-muted mb-3">現在の在庫評価額（理論値）</p>
        <div className="grid grid-cols-3 gap-3">
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <StoreDot store="flag" />
              <span className="text-xs font-semibold text-muted">flag</span>
            </div>
            <span className="text-xl font-bold text-text tabular-nums">¥{currentFlag.toLocaleString()}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <StoreDot store="lien" />
              <span className="text-xs font-semibold text-muted">Lien</span>
            </div>
            <span className="text-xl font-bold text-text tabular-nums">¥{currentLien.toLocaleString()}</span>
          </Card>
          <Card className="flex flex-col gap-1 border-accent">
            <span className="text-xs font-semibold text-accent mb-0.5">合計</span>
            <span className="text-xl font-bold text-text tabular-nums">¥{(currentFlag + currentLien).toLocaleString()}</span>
          </Card>
        </div>
      </div>

      {/* 月次記録 */}
      <div>
        <p className="text-xs font-semibold text-muted mb-3">月次記録</p>
        {months.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-faint gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm font-semibold">記録がまだありません</p>
            <p className="text-xs">「棚卸実施」タブで棚卸を完了すると自動で保存されます</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {months.map((month, idx) => {
              const flagSnap = snapshots.find((s) => s.month === month && s.storeId === 'flag')
              const lienSnap = snapshots.find((s) => s.month === month && s.storeId === 'lien')
              const total = (flagSnap?.total ?? 0) + (lienSnap?.total ?? 0)

              // 前月比（次の月のデータと比較）
              let prevTotal: number | null = null
              if (idx < months.length - 1) {
                const prevMonth = months[idx + 1]
                const pFlag = snapshots.find((s) => s.month === prevMonth && s.storeId === 'flag')
                const pLien = snapshots.find((s) => s.month === prevMonth && s.storeId === 'lien')
                prevTotal = (pFlag?.total ?? 0) + (pLien?.total ?? 0)
              }
              const diff = prevTotal !== null ? total - prevTotal : null

              return (
                <Card key={month} className="flex flex-col gap-0 p-0 overflow-hidden">
                  {/* 月ヘッダー */}
                  <div className="flex items-center justify-between px-4 py-3 bg-bg border-b border-border">
                    <p className="text-sm font-bold text-text">{fmtMonth(month)}</p>
                    {diff !== null && (
                      <span className={`text-xs font-semibold tabular-nums ${diff > 0 ? 'text-ok' : diff < 0 ? 'text-danger' : 'text-muted'}`}>
                        前月比 {diff > 0 ? '+' : ''}{diff.toLocaleString()}円
                      </span>
                    )}
                  </div>

                  {/* flag 行 */}
                  {flagSnap ? (
                    <div className="flex items-center px-4 py-3 border-b border-border gap-3">
                      <StoreDot store="flag" />
                      <span className="text-sm text-text w-20">flag</span>
                      <span className="flex-1 text-base font-bold text-text tabular-nums">¥{flagSnap.total.toLocaleString()}</span>
                      <span className="text-xs text-faint">{flagSnap.confirmedCount}/{flagSnap.totalItems}確認</span>
                      {flagSnap.diffCount > 0 && (
                        <span className="text-xs text-danger font-semibold">差異{flagSnap.diffCount}件</span>
                      )}
                      <span className="text-xs text-faint">{flagSnap.date}</span>
                      <button
                        onClick={() => { if (confirm(`${fmtMonth(month)} flag の記録を削除しますか？`)) onDelete(flagSnap.id) }}
                        className="text-xs text-faint hover:text-danger ml-1"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3 border-b border-border gap-3">
                      <StoreDot store="flag" />
                      <span className="text-sm text-faint w-20">flag</span>
                      <span className="text-sm text-faint">未実施</span>
                    </div>
                  )}

                  {/* Lien 行 */}
                  {lienSnap ? (
                    <div className="flex items-center px-4 py-3 border-b border-border gap-3">
                      <StoreDot store="lien" />
                      <span className="text-sm text-text w-20">Lien</span>
                      <span className="flex-1 text-base font-bold text-text tabular-nums">¥{lienSnap.total.toLocaleString()}</span>
                      <span className="text-xs text-faint">{lienSnap.confirmedCount}/{lienSnap.totalItems}確認</span>
                      {lienSnap.diffCount > 0 && (
                        <span className="text-xs text-danger font-semibold">差異{lienSnap.diffCount}件</span>
                      )}
                      <span className="text-xs text-faint">{lienSnap.date}</span>
                      <button
                        onClick={() => { if (confirm(`${fmtMonth(month)} Lien の記録を削除しますか？`)) onDelete(lienSnap.id) }}
                        className="text-xs text-faint hover:text-danger ml-1"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3 border-b border-border gap-3">
                      <StoreDot store="lien" />
                      <span className="text-sm text-faint w-20">Lien</span>
                      <span className="text-sm text-faint">未実施</span>
                    </div>
                  )}

                  {/* 合計行 */}
                  <div className="flex items-center px-4 py-3 gap-3 bg-bg">
                    <span className="text-xs font-semibold text-muted w-20 ml-5">合計</span>
                    <span className="flex-1 text-base font-bold text-accent tabular-nums">¥{total.toLocaleString()}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function Stocktake() {
  const { products, stocks, upsertStock, stocktakeSnapshots, addStocktakeSnapshot, deleteStocktakeSnapshot } = useAppStore()
  const [screenTab, setScreenTab] = useState<ScreenTab>('棚卸実施')
  const [store, setStore] = useState<StoreTab>('flag')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('すべて')
  const [category, setCategory] = useState('すべて')
  const [modal, setModal] = useState<{ productId: string; inputQty: number } | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

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

  // 選択店舗でアクティブな商品一覧
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

  const filtered = items.filter((item) => {
    const matchStatus = statusFilter === 'すべて' || item.status === statusFilter
    const matchCat = category === 'すべて' || item.category === category
    return matchStatus && matchCat
  })

  const modalItem = modal ? items.find((i) => i.productId === modal.productId) : null

  function openModal(item: typeof items[0]) {
    setModal({ productId: item.productId, inputQty: item.actual ?? item.theoretical })
  }

  function confirmInput() {
    if (!modal || !modalItem) return
    setActualCounts((prev) => ({
      ...prev,
      [store]: { ...prev[store], [modal.productId]: modal.inputQty },
    }))
    setModal(null)
  }

  function completeStocktake() {
    // 確認済みの実棚数を一括で在庫に反映
    Object.entries(actualCounts[store]).forEach(([productId, qty]) => {
      const s = stocks.find((st) => st.productId === productId && st.storeId === store)
      upsertStock({
        productId,
        storeId: store,
        currentStock: qty,
        minStock: s?.minStock ?? 3,
        active: s?.active ?? true,
      })
    })
    // 月次スナップショットを保存
    const today = new Date()
    addStocktakeSnapshot({
      month: today.toISOString().slice(0, 7),
      date: today.toISOString().slice(0, 10),
      storeId: store as StoreId,
      total: totalValue,
      confirmedCount: confirmed,
      diffCount: diffCount,
      totalItems: items.length,
    })
    setActualCounts((prev) => ({ ...prev, [store]: {} }))
    setShowCompleteModal(false)
    setStatusFilter('すべて')
    setCategory('すべて')
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
      {/* 画面タブ */}
      <div className="bg-surface border-b border-border flex">
        {(['棚卸実施', '月次記録'] as ScreenTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setScreenTab(t)}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors border-b-2 ${
              screenTab === t ? 'border-accent text-accent' : 'border-transparent text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {screenTab === '棚卸実施' && (<>
          {/* ヘッダー */}
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border">
            {/* 店舗タブ＋ボタン行 */}
            <div className="flex gap-2 mb-4">
              {(['flag', 'lien'] as StoreTab[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStore(s); setStatusFilter('すべて'); setCategory('すべて') }}
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
              <Btn
                variant="primary"
                size="sm"
                disabled={confirmed === 0}
                onClick={() => setShowCompleteModal(true)}
              >
                棚卸を完了
              </Btn>
            </div>

            {/* サマリーカード */}
            <div className="flex gap-3 mb-4 overflow-x-auto pb-0.5">
              <Card className="flex-shrink-0 flex flex-col gap-1 min-w-[90px]">
                <span className="text-xs text-muted font-semibold">進捗</span>
                <span className="text-3xl font-bold text-accent">{progress}%</span>
                <span className="text-xs text-faint">{month}</span>
              </Card>
              <Card className="flex-shrink-0 flex flex-col gap-1 min-w-[90px]">
                <span className="text-xs text-muted font-semibold">確認済</span>
                <span className="text-3xl font-bold text-ok">{confirmed}</span>
                <span className="text-xs text-faint">/ {items.length} 商品</span>
              </Card>
              <Card className="flex-shrink-0 flex flex-col gap-1 min-w-[90px]">
                <span className="text-xs text-muted font-semibold">未確認</span>
                <span className="text-3xl font-bold text-text">{items.length - confirmed}</span>
                <span className="text-xs text-faint">残り</span>
              </Card>
              <Card className="flex-shrink-0 flex flex-col gap-1 min-w-[90px]">
                <span className="text-xs text-muted font-semibold">差異あり</span>
                <span className="text-3xl font-bold text-danger">{diffCount}</span>
                <span className="text-xs text-faint">要確認</span>
              </Card>
              <Card className="flex-shrink-0 flex flex-col gap-1 min-w-[120px] border-accent">
                <span className="text-xs text-accent font-semibold">在庫合計金額</span>
                <span className="text-2xl font-bold text-text leading-tight">
                  ¥{totalValue.toLocaleString()}
                </span>
                <span className="text-xs text-faint">実棚数 × 仕入単価</span>
              </Card>
            </div>

            <div className="h-2 bg-bg rounded-full overflow-hidden mb-3">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>

            {/* ステータスフィルター */}
            <div className="flex gap-2 overflow-x-auto mb-2">
              {(['すべて', '未確認', '確認済', '差異'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    statusFilter === f ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* カテゴリフィルター */}
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    category === cat ? 'bg-text text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {cat}
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
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted gap-2">
                <p className="text-sm">該当する商品がありません</p>
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
                          {item.purchasePrice > 0 ? `¥${item.purchasePrice.toLocaleString()}` : '—'}
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
          </>)}

          {screenTab === '月次記録' && (
            <HistoryTab
              snapshots={stocktakeSnapshots}
              products={products}
              stocks={stocks}
              onDelete={deleteStocktakeSnapshot}
            />
          )}
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

      {/* 棚卸完了確認モーダル */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl flex flex-col gap-4">
            <div>
              <p className="text-lg font-bold text-text">棚卸を完了しますか？</p>
              <p className="text-xs text-muted mt-1">
                {store === 'flag' ? 'flag 美容室' : 'Lien 美容室'} · {month}
              </p>
            </div>

            {/* サマリー */}
            <div className="bg-bg rounded-lg p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">確認済</span>
                <span className="font-bold text-ok">{confirmed} 商品</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">未確認</span>
                <span className="font-bold text-text">{items.length - confirmed} 商品</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">差異あり</span>
                <span className={`font-bold ${diffCount > 0 ? 'text-danger' : 'text-muted'}`}>{diffCount} 商品</span>
              </div>
              <div className="border-t border-border mt-1 pt-2 flex justify-between text-sm">
                <span className="text-muted">在庫合計金額</span>
                <span className="font-bold text-text">¥{totalValue.toLocaleString()}</span>
              </div>
            </div>

            {items.length - confirmed > 0 && (
              <p className="text-xs text-warn">
                ※ 未確認の商品が {items.length - confirmed} 件あります。完了すると今回のカウントがリセットされます。
              </p>
            )}

            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setShowCompleteModal(false)}>キャンセル</Btn>
              <Btn variant="primary" className="flex-[2]" onClick={completeStocktake}>✓ 完了する</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
