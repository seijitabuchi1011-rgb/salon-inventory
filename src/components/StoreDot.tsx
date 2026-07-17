import type { StoreId } from '../types'

export function StoreDot({ store, size = 'md' }: { store: StoreId; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
      style={{ background: store === 'flag' ? '#2B5FA7' : '#8A4AA6' }}
    />
  )
}
