import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { StoreDot } from '../components/StoreDot'

type StoreFilter = 'all' | 'flag' | 'lien'
type Period = '今月' | '先月' | '今期'

const STAFF = [
  { id: '1', name: '田中 美咲', role: 'スタイリスト', storeId: 'flag' as const, sales: 182000, qty: 64, topProduct: 'ケラスターゼ ソワン オレオ', growth: 18 },
  { id: '2', name: '山田 花子', role: 'チーフ', storeId: 'flag' as const, sales: 156000, qty: 52, topProduct: 'ミルボン ジェミールフラン', growth: 5 },
  { id: '3', name: '鈴木 雄太', role: 'スタイリスト', storeId: 'flag' as const, sales: 124000, qty: 44, topProduct: 'デミ アドミオオイル', growth: -2 },
  { id: '4', name: '佐藤 さくら', role: 'アシスタント', storeId: 'flag' as const, sales: 68000, qty: 26, topProduct: 'ナプラ ケアテクトHB', growth: 32 },
  { id: '5', name: '伊藤 葵', role: 'チーフ', storeId: 'lien' as const, sales: 168000, qty: 58, topProduct: 'アジュバン コンポジオ EX', growth: 9 },
  { id: '6', name: '渡辺 健', role: 'スタイリスト', storeId: 'lien' as const, sales: 142000, qty: 50, topProduct: 'OWAY カラーマスク ヘナ', growth: -5 },
  { id: '7', name: '小林 ひかり', role: 'スタイリスト', storeId: 'lien' as const, sales: 110500, qty: 38, topProduct: 'ロレアル ヴィタロル CC', growth: 14 },
]

function fmt(n: number) {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
}

export function StaffScreen() {
  const [store, setStore] = useState<StoreFilter>('all')
  const [period, setPeriod] = useState<Period>('今月')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = STAFF.filter((s) => store === 'all' || s.storeId === store)
  const sorted = [...filtered].sort((a, b) => b.sales - a.sales)

  const totalSales = filtered.reduce((sum, s) => sum + s.sales, 0)
  const totalQty = filtered.reduce((sum, s) => sum + s.qty, 0)

  const selected = selectedId ? STAFF.find((s) => s.id === selectedId) : null

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="スタッフ別実績" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          {/* ヘッダー */}
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              {/* 期間 */}
              <div className="flex gap-1">
                {(['今月', '先月', '今期'] as Period[]).map((p) => (
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
              {/* 店舗 */}
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

            {/* サマリー */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">チーム売上合計</span>
                <span className="text-3xl font-bold text-text">{fmt(totalSales)}</span>
                <span className="text-xs text-faint">{period}</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">販売点数合計</span>
                <span className="text-3xl font-bold text-text">{totalQty}</span>
                <span className="text-xs text-faint">点</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">スタッフ数</span>
                <span className="text-3xl font-bold text-text">{filtered.length}</span>
                <span className="text-xs text-faint">人</span>
              </Card>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 flex overflow-hidden">
            {/* スタッフリスト */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {sorted.map((staff, index) => {
                const barWidth = Math.round((staff.sales / sorted[0].sales) * 100)
                const isSelected = selectedId === staff.id
                return (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedId(isSelected ? null : staff.id)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? 'bg-accent-soft border-accent'
                        : 'bg-surface border-border hover:bg-bg'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* ランク */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-warn-soft text-warn' : index === 1 ? 'bg-bg text-muted' : 'bg-bg text-faint'
                      }`}>
                        {index + 1}
                      </div>

                      {/* アバター */}
                      <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                        {staff.name[0]}
                      </div>

                      {/* 名前・役職 */}
                      <div className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text text-sm">{staff.name}</span>
                          <StoreDot store={staff.storeId} size="sm" />
                        </div>
                        <span className="text-xs text-muted">{staff.role}</span>
                      </div>

                      {/* プログレスバー + 売上 */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted">売上</span>
                          <span className="text-sm font-bold tabular-nums">{fmt(staff.sales)}</span>
                        </div>
                        <div className="h-2 bg-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* 点数 */}
                      <div className="text-right min-w-[60px]">
                        <p className="text-sm font-bold tabular-nums">{staff.qty}点</p>
                        <p className={`text-xs font-semibold ${staff.growth >= 0 ? 'text-ok' : 'text-danger'}`}>
                          {staff.growth >= 0 ? `+${staff.growth}%` : `${staff.growth}%`}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 詳細パネル */}
            {selected && (
              <div className="w-72 flex-shrink-0 bg-surface border-l border-border overflow-y-auto p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-lg">
                    {selected.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-text">{selected.name}</p>
                      <StoreDot store={selected.storeId} size="sm" />
                    </div>
                    <p className="text-xs text-muted">{selected.role}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-xs text-muted mb-1">売上金額</p>
                    <p className="text-2xl font-bold">{fmt(selected.sales)}</p>
                    <Badge variant={selected.growth >= 0 ? 'ok' : 'danger'} >
                      {selected.growth >= 0 ? `+${selected.growth}%` : `${selected.growth}%`} 前月比
                    </Badge>
                  </div>
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-xs text-muted mb-1">販売点数</p>
                    <p className="text-2xl font-bold">{selected.qty} 点</p>
                  </div>
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-xs text-muted mb-1">一番売れた商品</p>
                    <p className="text-sm font-semibold leading-snug">{selected.topProduct}</p>
                  </div>
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-xs text-muted mb-1">平均客単価</p>
                    <p className="text-2xl font-bold">¥{Math.round(selected.sales / selected.qty).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
