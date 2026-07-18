import { useNavigate } from 'react-router-dom'
import { StoreSwitch } from './StoreSwitch'

interface AppBarProps {
  title: string
  back?: boolean
  onBack?: () => void
  showStoreSwitch?: boolean
  right?: React.ReactNode
}

export function AppBar({ title, back = false, onBack, showStoreSwitch = true, right }: AppBarProps) {
  const navigate = useNavigate()

  return (
    <div className="h-appbar flex items-center px-5 bg-surface border-b border-border flex-shrink-0 gap-3">
      {back && (
        <button
          onClick={() => onBack ? onBack() : navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-md text-muted hover:bg-bg transition-colors text-lg"
        >
          ‹
        </button>
      )}
      <span className="text-xl font-bold text-text flex-1 truncate">{title}</span>
      {showStoreSwitch && <StoreSwitch />}
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
