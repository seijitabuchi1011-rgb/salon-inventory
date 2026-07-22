import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', icon: '⌂', label: 'ホーム' },
  { path: '/scan', icon: '▦', label: 'スキャン' },
  { path: '/products', icon: '☰', label: '商品一覧' },
  { path: '/low-stock', icon: '⚠', label: '在庫不足' },
  { path: '/orders', icon: '↧', label: '仕入れ' },
  { path: '/dispense', icon: '↓', label: '払出し' },
  { path: '/wholesale', icon: '⊕', label: '店舗に卸す' },
  { path: '/monthly-purchases', icon: '¥', label: '今月仕入高' },
  { path: '/stocktake', icon: '⊟', label: '棚卸' },
  { path: '/transfer', icon: '⇄', label: '店舗間移動' },
  { path: '/sales', icon: '▲', label: '販売実績' },
  { path: '/staff', icon: '◉', label: '購入履歴' },
  { path: '/settings', icon: '⚙', label: '設定' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div
      className="md:hidden bg-surface border-t border-border flex overflow-x-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center flex-shrink-0 w-[72px] h-14 gap-0.5 transition-colors ${
              active ? 'text-accent' : 'text-muted'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[9px] font-semibold leading-tight text-center">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
