import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'

type Period = '今日' | '今週' | '今月' | '先月'
type StoreFilter = 'all' | 'flag' | 'lien'

const KPI: Record<StoreFilter, Record<Period, { sales: number; qty: number; avg: number; growth: number }>> = {
  all: {
    今日:  { sales: 48600,  qty: 18, avg: 2700,  growth: 12  },
    今週:  { sales: 286400, qty: 98, avg: 2922,  growth: 8   },
    今月:  { sales: 982500, qty: 342, avg: 2872, growth: 11  },
    先月:  { sales: 884200, qty: 308, avg: 2870, growth: -3  },
  },
  flag: {
    今日:  { sales: 28200,  qty: 10, avg: 2820, growth: 15  },
    今週:  { sales: 164800, qty: 57, avg: 2891, growth: 10  },
    今月:  { sales: 562000, qty: 196, avg: 2867, growth: 14 },
    先月:  { sales: 492000, qty: 172, avg: 2861, growth: -1 },
  },
  lien: {
    今日:  { sales: 20400,  qty: 8,  avg: 2550, growth: 8   },
    今週:  { sales: 121600, qty: 41, avg: 2966, growth: 5   },
    今月:  { sales: 420500, qty: 146, avg: 2880, growth: 7  },
    先月:  { sales: 392200, qty: 136, avg: 2883, growth: -5 },
  },
}

const TOP_PRODUCTS = [
  { rank: 1, name: 'ミルボン ジェミールフラン シャンプー 500ml', category: 'シャンプー', qty: 42, amount: 117600 },
  { rank: 2, name: 'ケラスターゼ ソワン オレオ', category: 'トリートメント', qty: 28, amount: 145600 },
  { rank: 3, name: 'デミ アドミオオイル', category: 'スタイリング', qty: 35, amount: 59500 },
  { rank: 4, name: 'ナプラ ケアテクトHB', category: 'シャンプー', qty: 30, amount: 66000 },
  { rank: 5, name: 'OWAY カラーマスク ヘナ', category: 'カラー剤', qty: 22, amount: 99000 },
]

const DAILY_BARS = [
  { date: '7/11', flag: 72000, lien: 56000 },
  { date: '7/12', flag: 85000, lien: 48000 },
  { date: '7/13', flag: 60000, lien: 64000 },
  { date: '7/14', flag: 92000, lien: 71000 },
  { date: '7/15', flag: 78000, lien: 58000 },
  { date: '7/16', flag: 88000, lien: 66000 },
  { date: '7/17', flag: 28200, lien: 20400 },
]
const MAX_BAR = Math.max(...DAILY_BARS.map((d) => d.flag + d.lien))

function fmt(n: number) {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
}

export function Sales() {
  const [period, setPeriod] = useState<Period>('今月')
  const [store, setStore] = useState<StoreFilter>('all')

  const kpi = KPI[store][period]

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
                <span className="text-xs text-muted font-semibold">売上金額</span>
                <span className="text-3xl font-bold text-text">{fmt(kpi.sales)}</span>
                <span className={`text-xs font-semibold ${kpi.growth >= 0 ? 'text-ok' : 'text-danger'}`}>
                  {kpi.growth >= 0 ? `▲ +${kpi.growth}%` : `▼ ${kpi.growth}%`} 前期比
                </span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">販売点数</span>
                <span className="text-3xl font-bold text-text">{kpi.qty}</span>
                <span className="text-xs text-faint">点</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">平均単価</span>
                <span className="text-3xl font-bold text-text">¥{kpi.avg.toLocaleString()}</span>
                <span className="text-xs text-faint">/点</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">取扱商品数</span>
                <span className="text-3xl font-bold text-accent">24</span>
                <span className="text-xs text-faint">種類</span>
              </Card>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-[1fr_340px] gap-5 content-start">
            {/* 日別推移グラフ */}
            <Card padding={false}>
              <div className="p-4 border-b border-border">
                <p className="text-sm font-bold">日別売上推移 (今週)</p>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-2 h-40">
                  {DAILY_BARS.map((d) => {
                    const flagH = Math.round((d.flag / MAX_BAR) * 100)
                    const lienH = Math.round((d.lien / MAX_BAR) * 100)
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-end gap-0.5 w-full" style={{ height: 128 }}>
                          <div
                            className="flex-1 rounded-t bg-flag opacity-80 transition-all"
                            style={{ height: `${flagH}%` }}
                          />
                          <div
                            className="flex-1 rounded-t bg-lien opacity-80 transition-all"
                            style={{ height: `${lienH}%` }}
                          />
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
            </Card>

            {/* 売れ筋ランキング */}
            <Card padding={false}>
              <div className="p-4 border-b border-border">
                <p className="text-sm font-bold">売れ筋ランキング</p>
              </div>
              <div className="divide-y divide-border">
                {TOP_PRODUCTS.map((p) => (
                  <div key={p.rank} className="flex items-center gap-3 px-4 py-3">
                    <span className={`w-6 text-center text-sm font-bold ${p.rank <= 3 ? 'text-accent' : 'text-faint'}`}>
                      {p.rank}
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
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
