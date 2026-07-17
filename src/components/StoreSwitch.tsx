import { useAppStore } from '../store'
import type { StoreFilter } from '../types'

const OPTIONS: { value: StoreFilter; label: string }[] = [
  { value: 'all', label: '全店' },
  { value: 'flag', label: 'flag' },
  { value: 'lien', label: 'Lien' },
]

export function StoreSwitch() {
  const { currentStore, setCurrentStore } = useAppStore()

  return (
    <div className="flex border border-border rounded-md overflow-hidden">
      {OPTIONS.map((opt) => {
        const active = currentStore === opt.value
        const activeColor =
          opt.value === 'flag' ? 'bg-flag text-white' :
          opt.value === 'lien' ? 'bg-lien text-white' :
          'bg-text text-white'
        return (
          <button
            key={opt.value}
            onClick={() => setCurrentStore(opt.value)}
            className={`px-4 h-9 text-xs font-bold transition-colors ${
              active ? activeColor : 'bg-surface text-muted'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
