import { useAppStore } from '../store'

export function StoreSwitch() {
  const { currentStore, setCurrentStore, storeOrder, storeInfo } = useAppStore()

  return (
    <div className="flex border border-border rounded-md overflow-hidden overflow-x-auto max-w-full">
      <button
        onClick={() => setCurrentStore('all')}
        className={`px-3 h-9 text-xs font-bold transition-colors flex-shrink-0 ${
          currentStore === 'all' ? 'bg-text text-white' : 'bg-surface text-muted'
        }`}
      >
        全店
      </button>
      {storeOrder.map((id) => {
        const info = storeInfo[id]
        const active = currentStore === id
        return (
          <button
            key={id}
            onClick={() => setCurrentStore(id)}
            className={`px-3 h-9 text-xs font-bold transition-colors flex-shrink-0 border-l border-border ${
              active ? 'text-white' : 'bg-surface text-muted'
            }`}
            style={active ? { background: info?.color ?? '#888888' } : {}}
          >
            {info?.name ?? id}
          </button>
        )
      })}
    </div>
  )
}
