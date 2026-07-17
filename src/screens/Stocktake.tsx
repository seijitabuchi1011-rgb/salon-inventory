import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'

type StoreFilter = 'flag' | 'lien'
type ItemStatus = '未確認' | '確認済' | '差異'
type FilterType = 'すべて' | '未確認' | '確認済' | '差異'

const STATUS_VARIANT: Record<ItemStatus, 'muted' | 'ok' | 'danger'> = {
  未確認: 'muted', 確認済: 'ok', 差異: 'danger',
}

type Item = {
  id: string
  name: string
  category: string
  purchasePrice: number
  theoretical: { flag: number; lien: number }
  actual: { flag: number | null; lien: number | null }
  status: { flag: ItemStatus; lien: ItemStatus }
}

const INITIAL_ITEMS: Item[] = [
  { id: '1', name: 'ミルボン ジェミールフラン シャンプー 500ml', category: 'シャンプー', purchasePrice: 1800,
    theoretical: { flag: 8, lien: 3 }, actual: { flag: 8, lien: null }, status: { flag: '確認済', lien: '未確認' } },
  { id: '2', name: 'ケラスターゼ ソワン オレオ', category: 'トリートメント', purchasePrice: 3200,
    theoretical: { flag: 12, lien: 6 }, actual: { flag: 10, lien: null }, status: { flag: '差異', lien: '未確認' } },
  { id: '3', name: 'OWAY カラーマスク ヘナ', category: 'カラー剤', purchasePrice: 2600,
    theoretical: { flag: 2, lien: 1 }, actual: { flag: 2, lien: 1 }, status: { flag: '確認済', lien: '確認済' } },
  { id: '4', name: 'デミ アドミオオイル', category: 'スタイリング', purchasePrice: 1400,
    theoretical: { flag: 15, lien: 9 }, actual: { flag: 15, lien: 9 }, status: { flag: '確認済', lien: '確認済' } },
  { id: '5', name: 'ナプラ ケアテクトHB', category: 'シャンプー', purchasePrice: 1500,
    theoretical: { flag: 4, lien: 7 }, actual: { flag: null, lien: null }, status: { flag: '未確認', lien: '未確認' } },
  { id: '6', name: 'アジュバン コンポジオ EX', category: 'トリートメント', purchasePrice: 2800,
    theoretical: { flag: 5, lien: 2 }, actual: { flag: 5, lien: null }, status: { flag: '確認済', lien: '未確認' } },
  { id: '7', name: 'ロレアル ヴィタロル CC', category: 'カラー剤', purchasePrice: 980,
    theoretical: { flag: 6, lien: 4 }, actual: { flag: 5, lien: null }, status: { flag: '差異', lien: '未確認' } },
  { id: '8', name: 'ホーユー ビゲン クリーム', category: 'カラー剤', purchasePrice: 750,
    theoretical: { flag: 10, lien: 8 }, actual: { flag: 10, lien: 8 }, status: { flag: '確認済', lien: '確認済' } },
]

function calcTotalValue(items: Item[], store: StoreFilter) {
  return items.reduce((sum, item) => {
    const qty = item.actual[store]
    return qty !== null ? sum + qty * item.purchasePrice : sum
  }, 0)
}

function exportCsv(items: Item[], store: StoreFilter, month: string) {
  const storeName = store === 'flag' ? 'flag美容室' : 'Lien美容室'
  const header = ['商品名', 'カテゴリ', '仕入単価', '理論在庫', '実棚数', '差異', '状態', '在庫金額']
  const rows = items.map((item) => {
    const theoretical = item.theoretical[store]
    const actual = item.actual[store]
    const diff = actual !== null ? actual - theoretical : ''
    const value = actual !== null ? actual * item.purchasePrice : ''
    return [
      item.name, item.category, item.purchasePrice,
      theoretical, actual ?? '', diff,
      item.status[store], value,
    ]
  })
  const totalValue = calcTotalValue(items, store)
  rows.push(['', '', '', '', '', '', '合計金額', totalValue])

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(','))
    .join('\n')
  const bom = '﻿'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `棚卸_${storeName}_${month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function Stocktake() {
  const [store, setStore] = useState<StoreFilter>('flag')
  const [filter, setFilter] = useState<FilterType>('すべて')
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS)
  const [modal, setModal] = useState<{ item: Item; inputQty: number } | null>(null)

  const month = '2026年7月'
  const confirmed = items.filter((i) => i.status[store] !== '未確認').length
  const diffCount = items.filter((i) => i.status[store] === '差異').length
  const progress = Math.round((confirmed / items.length) * 100)
  const totalValue = calcTotalValue(items, store)

  const filtered = items.filter((item) =>
    filter === 'すべて' ? true : item.status[store] === filter
  )

  function openModal(item: Item) {
    setModal({ item, inputQty: item.actual[store] ?? item.theoretical[store] })
  }

  function confirmInput() {
    if (!modal) return
    const qty = modal.inputQty
    const theoretical = modal.item.theoretical[store]
    const newStatus: ItemStatus = qty === theoretical ? '確認済' : '差異'
    setItems((prev) =>
      prev.map((i) =>
        i.id !== modal.item.id ? i : {
          ...i,
          actual: { ...i.actual, [store]: qty },
          status: { ...i.status, [store]: newStatus },
        }
      )
    )
    setModal(null)
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
              {(['flag', 'lien'] as StoreFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStore(s)}
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
              <Btn variant="ghost" size="sm" onClick={() => exportCsv(items, store, month)}>
                CSVエクスポート
              </Btn>
              <Btn variant="primary" size="sm">棚卸を完了</Btn>
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
              {/* 合計金額カード */}
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
                  const theoretical = item.theoretical[store]
                  const actual = item.actual[store]
                  const diff = actual !== null ? actual - theoretical : null
                  const status = item.status[store]
                  const value = actual !== null ? actual * item.purchasePrice : null

                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-bg transition-colors">
                      <td className="px-4 py-3 font-semibold text-text">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-muted">{item.category}</td>
                      <td className="px-4 py-3 text-right text-muted tabular-nums">
                        ¥{item.purchasePrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{theoretical}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {actual !== null ? actual : <span className="text-faint">—</span>}
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
                        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Btn variant="ghost" size="sm" onClick={() => openModal(item)}>
                          {status === '未確認' ? '入力' : '修正'}
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* 実棚数入力モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <p className="text-xs text-muted font-semibold mb-1">{modal.item.category}</p>
            <p className="text-base font-bold mb-1 leading-snug">{modal.item.name}</p>
            <p className="text-xs text-muted mb-5">
              理論在庫: {modal.item.theoretical[store]} 個 ·
              仕入単価: ¥{modal.item.purchasePrice.toLocaleString()}
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

            {/* 差異プレビュー */}
            {(() => {
              const diff = modal.inputQty - modal.item.theoretical[store]
              return (
                <p className={`text-center text-sm font-semibold mb-5 ${
                  diff < 0 ? 'text-danger' : diff > 0 ? 'text-ok' : 'text-muted'
                }`}>
                  差異: {diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff} 個
                  {' · '}¥{(modal.inputQty * modal.item.purchasePrice).toLocaleString()}
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
