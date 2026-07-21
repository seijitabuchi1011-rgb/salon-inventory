import { useAppStore } from '../store'

export function StoreDot({ store, size = 'md' }: { store: string; size?: 'sm' | 'md' }) {
  const { storeInfo } = useAppStore()
  const color = storeInfo[store]?.color ?? '#888888'
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
      style={{ background: color }}
    />
  )
}
