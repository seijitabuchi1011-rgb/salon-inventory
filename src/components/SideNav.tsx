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

export function SideNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="hidden md:flex w-sidenav flex-shrink-0 bg-surface border-r border-border flex-col py-2 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center h-[68px] gap-1 text-center transition-colors w-full ${
              active
                ? 'bg-accent-soft text-accent border-r-2 border-accent'
                : 'text-muted hover:bg-bg hover:text-text'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
