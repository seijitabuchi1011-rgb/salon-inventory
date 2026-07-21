import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { useAppStore } from '../store'

const TILES = [
  { icon: '▦', label: 'バーコード読み取り', path: '/scan', primary: true, badge: null },
  { icon: '☰', label: '商品一覧', path: '/products', primary: false, badge: null },
  { icon: '⚠', label: '在庫不足', path: '/low-stock', primary: false, badge: null },
  { icon: '↧', label: '仕入れ', path: '/orders', primary: false, badge: null },
  { icon: '↓', label: '払出し', path: '/dispense', primary: false, badge: null },
  { icon: '¥', label: '今月仕入高', path: '/monthly-purchases', primary: false, badge: null },
  { icon: '⊟', label: '棚卸', path: '/stocktake', primary: false, badge: null },
  { icon: '⇄', label: '店舗間移動', path: '/transfer', primary: false, badge: null },
  { icon: '▲', label: '販売実績', path: '/sales', primary: false, badge: null },
  { icon: '◉', label: 'スタッフ購入履歴', path: '/staff', primary: false, badge: null },
  { icon: '＋', label: '商品登録', path: '/products/new', primary: false, badge: null },
]

export function Home() {
  const navigate = useNavigate()
  const { currentStore, products, stocks, storeInfo, storeOrder } = useAppStore()
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  const storeLabel = currentStore === 'all' ? '全店' : (storeInfo[currentStore]?.name ?? currentStore)

  const checkStores = currentStore === 'all' ? storeOrder : [currentStore]

  // 在庫不足カウント
  const lowStockCount = products.filter((p) =>
    checkStores.some((sid) => {
      const s = stocks.find((s) => s.productId === p.id && s.storeId === sid)
      return s && s.active !== false && s.currentStock <= s.minStock
    })
  ).length

  // 緊急（在庫0）カウント
  const urgentCount = products.filter((p) =>
    checkStores.some((sid) => {
      const s = stocks.find((s) => s.productId === p.id && s.storeId === sid)
      return s && s.active !== false && s.currentStock === 0
    })
  ).length

  // 取扱商品数
  const activeProductCount = products.filter((p) => {
    if (currentStore === 'all') return true
    const s = stocks.find((s) => s.productId === p.id && s.storeId === currentStore)
    return s?.active !== false
  }).length

  const kpiCards = [
    {
      label: '在庫不足',
      value: String(lowStockCount),
      sub: urgentCount > 0 ? `緊急 ${urgentCount}件` : '緊急なし',
      color: lowStockCount > 0 ? 'text-danger' : 'text-ok',
      path: '/low-stock',
    },
    {
      label: '取扱商品数',
      value: String(activeProductCount),
      sub: storeLabel,
      color: 'text-accent',
      path: '/products',
    },
    {
      label: '入荷待ち',
      value: '—',
      sub: '発注管理で確認',
      color: 'text-warn',
      path: '/orders',
    },
    {
      label: '棚卸進捗',
      value: '—',
      sub: '棚卸で開始',
      color: 'text-muted',
      path: '/stocktake',
    },
  ]

  const lowBadge = lowStockCount > 0 ? String(lowStockCount) : null

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border flex items-center px-4">
        <span className="text-2xs text-faint">{today}</span>
      </div>
      <AppBar title="ホーム" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 bg-bg">
          <div className="mb-4">
            <p className="text-2xs text-faint">{today}</p>
            <h1 className="text-2xl font-bold text-text">おはようございます</h1>
            <p className="text-sm text-muted mt-1">
              表示中:{' '}
              <span className={`font-bold ${currentStore === 'flag' ? 'text-[#1B5EB8]' : currentStore === 'lien' ? 'text-[#7B2FA8]' : 'text-text'}`}>
                {storeLabel}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {kpiCards.map((k) => (
              <button
                key={k.label}
                onClick={() => navigate(k.path)}
                className="text-left active:opacity-80 transition-opacity"
              >
                <Card className="flex flex-col gap-1 h-full">
                  <span className="text-xs text-muted font-semibold">{k.label}</span>
                  <span className={`text-4xl font-bold tracking-tight ${k.color}`}>{k.value}</span>
                  <span className="text-xs text-faint">{k.sub}</span>
                </Card>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TILES.map((tile) => {
              const badge = tile.path === '/low-stock' ? lowBadge : tile.badge
              return (
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
                  {badge && (
                    <span className="absolute top-2 right-2 bg-danger text-white text-2xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
