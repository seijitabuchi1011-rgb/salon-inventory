import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'

type StoreFilter = 'flag' | 'lien'

const STOCKTAKE_META = {
  flag: { month: '2026年7月', progress: 68, confirmed: 17, total: 25, diff: 3 },
  lien: { month: '2026年7月', progress: 44, confirmed: 11, total: 25, diff: 1 },
}

const ITEMS = [
  { id: '1', name: 'ミルボン ジェミールフラン シャンプー 500ml', category: 'シャンプー', theoretical: { flag: 8, lien: 3 }, actual: { flag: 8, lien: null }, status: { flag: '確認済' as const, lien: '未確認' as const } },
  { id: '2', name: 'ケラスターゼ ソワン オレオ', category: 'トリートメント', theoretical: { flag: 12, lien: 6 }, actual: { flag: 10, lien: null }, status: { flag: '差異' as const, lien: '未確認' as const } },
  { id: '3', name: 'OWAY カラーマスク ヘナ', category: 'カラー剤', theoretical: { flag: 2, lien: 1 }, actual: { flag: 2, lien: 1 }, status: { flag: '確認済' as const, lien: '確認済' as const } },
  { id: '4', name: 'デミ アドミオオイル', category: 'スタイリング', theoretical: { flag: 15, lien: 9 }, actual: { flag: 15, lien: 9 }, status: { flag: '確認済' as const, lien: '確認済' as const } },
  { id: '5', name: 'ナプラ ケアテクトHB', category: 'シャンプー', theoretical: { flag: 4, lien: 7 }, actual: { flag: null, lien: null }, status: { flag: '未確認' as const, lien: '未確認' as const } },
  { id: '6', name: 'アジュバン コンポジオ EX', category: 'トリートメント', theoretical: { flag: 5, lien: 2 }, actual: { flag: 5, lien: null }, status: { flag: '確認済' as const, lien: '未確認' as const } },
  { id: '7', name: 'ロレアル ヴィタロル CC', category: 'カラー剤', theoretical: { flag: 6, lien: 4 }, actual: { flag: 5, lien: null }, status: { flag: '差異' as const, lien: '未確認' as const } },
  { id: '8', name: 'ホーユー ビゲン クリーム', category: 'カラー剤', theoretical: { flag: 10, lien: 8 }, actual: { flag: 10, lien: 8 }, status: { flag: '確認済' as const, lien: '確認済' as const } },
]

type ItemStatus = '未確認' | '確認済' | '差異'

const STATUS_VARIANT: Record<ItemStatus, 'muted' | 'ok' | 'danger'> = {
  未確認: 'muted',
  確認済: 'ok',
  差異: 'danger',
}

type FilterType = 'すべて' | '未確認' | '確認済' | '差異'

export function Stocktake() {
  const [store, setStore] = useState<StoreFilter>('flag')
  const [filter, setFilter] = useState<FilterType>('すべて')

  const meta = STOCKTAKE_META[store]

  const filtered = ITEMS.filter((item) => {
    const status = item.status[store]
    if (filter === 'すべて') return true
    return status === filter
  })

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="棚卸" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          {/* ヘッダー */}
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border">
            {/* 店舗切替 */}
            <div className="flex gap-2 mb-4">
              {(['flag', 'lien'] as StoreFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStore(s)}
                  className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-bold border transition-colors ${
                    store === s
                      ? s === 'flag'
                        ? 'bg-flag-soft text-flag border-flag'
                        : 'bg-lien-soft text-lien border-lien'
                      : 'bg-bg text-muted border-border'
                  }`}
                >
                  <StoreDot store={s} />
                  {s === 'flag' ? 'flag 美容室' : 'Lien 美容室'}
                </button>
              ))}
              <div className="flex-1" />
              <Btn variant="ghost" size="sm">CSVエクスポート</Btn>
              <Btn variant="primary" size="sm">棚卸を完了</Btn>
            </div>

            {/* 進捗サマリー */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">進捗</span>
                <span className="text-3xl font-bold text-accent">{meta.progress}%</span>
                <span className="text-xs text-faint">{meta.month}</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">確認済</span>
                <span className="text-3xl font-bold text-ok">{meta.confirmed}</span>
                <span className="text-xs text-faint">/ {meta.total} 商品</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">未確認</span>
                <span className="text-3xl font-bold text-text">{meta.total - meta.confirmed}</span>
                <span className="text-xs text-faint">残り</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">差異あり</span>
                <span className="text-3xl font-bold text-danger">{meta.diff}</span>
                <span className="text-xs text-faint">要確認</span>
              </Card>
            </div>

            {/* プログレスバー */}
            <div className="h-2 bg-bg rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${meta.progress}%` }}
              />
            </div>

            {/* フィルタ */}
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">理論在庫</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">実棚数</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">差異</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-24">状態</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const theoretical = item.theoretical[store]
                  const actual = item.actual[store]
                  const diff = actual !== null ? actual - theoretical : null
                  const status = item.status[store]

                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-bg transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{item.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{item.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{theoretical}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {actual !== null ? actual : <span className="text-faint">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${diff !== null && diff < 0 ? 'text-danger' : diff !== null && diff > 0 ? 'text-ok' : 'text-faint'}`}>
                        {diff !== null ? (diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Btn variant="ghost" size="sm">
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
    </div>
  )
}
