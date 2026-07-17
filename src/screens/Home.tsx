import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'

const KPI_CARDS = [
  { label: '在庫不足', value: '12', sub: '要発注 5', color: 'text-danger' },
  { label: '入荷待ち', value: '3', sub: '本日到着 1', color: 'text-warn' },
  { label: '今月販売', value: '286', sub: '前月比 +8%', color: 'text-ok' },
  { label: '棚卸進捗', value: '68%', sub: 'flag店', color: 'text-accent' },
]

const TILES = [
  { icon: '▦', label: 'バーコード読み取り', path: '/scan', primary: true, badge: null },
  { icon: '☰', label: '商品一覧', path: '/products', primary: false, badge: null },
  { icon: '⚠', label: '在庫不足', path: '/low-stock', primary: false, badge: '12' },
  { icon: '↧', label: '入荷・発注', path: '/orders', primary: false, badge: null },
  { icon: '⊟', label: '棚卸', path: '/stocktake', primary: false, badge: null },
  { icon: '⇄', label: '店舗間移動', path: '/transfer', primary: false, badge: null },
  { icon: '▲', label: '販売実績', path: '/sales', primary: false, badge: null },
  { icon: '◉', label: 'スタッフ実績', path: '/staff', primary: false, badge: null },
  { icon: '＋', label: '商品登録', path: '/products/new', primary: false, badge: null },
]

export function Home() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border flex items-center px-4">
        <span className="text-2xs text-faint">{today}</span>
      </div>
      <AppBar title="ホーム" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 bg-bg">
          {/* 挨拶 */}
          <div className="mb-4">
            <p className="text-2xs text-faint">{today}</p>
            <h1 className="text-2xl font-bold text-text">おはようございます</h1>
          </div>

          {/* KPI カード */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {KPI_CARDS.map((k) => (
              <Card key={k.label} className="flex flex-col gap-1">
                <span className="text-xs text-muted font-semibold">{k.label}</span>
                <span className={`text-4xl font-bold tracking-tight ${k.color}`}>{k.value}</span>
                <span className="text-xs text-faint">{k.sub}</span>
              </Card>
            ))}
          </div>

          {/* アクションタイル */}
          <div className="grid grid-cols-3 gap-3">
            {TILES.map((tile) => (
              <button
                key={tile.path}
                onClick={() => navigate(tile.path)}
                className={`relative flex flex-col items-center justify-center min-h-[108px] rounded-lg gap-2 transition-opacity active:opacity-80 ${
                  tile.primary
                    ? 'bg-text text-white'
                    : 'bg-surface border border-border text-text hover:bg-bg'
                }`}
              >
                <span className="text-2xl leading-none">{tile.icon}</span>
                <span className="text-sm font-semibold">{tile.label}</span>
                {tile.badge && (
                  <span className="absolute top-2 right-2 bg-danger text-white text-2xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tile.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
