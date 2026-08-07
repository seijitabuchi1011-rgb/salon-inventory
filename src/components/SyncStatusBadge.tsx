import { useSyncStatus } from '../lib/syncStatus'
import { flushToFirestoreNow } from '../hooks/useFirestoreSync'

export function SyncStatusBadge() {
  const { status } = useSyncStatus()

  if (status === 'idle') return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none md:bottom-auto md:top-4 md:right-4 md:left-auto md:translate-x-0">
      {status === 'saving' && (
        <div className="bg-gray-800 text-white shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 whitespace-nowrap">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
          保存中...
        </div>
      )}
      {status === 'saved' && (
        <div className="bg-gray-800 text-white shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 whitespace-nowrap">
          ✓ 保存済み
        </div>
      )}
      {status === 'error' && (
        <button
          onClick={() => flushToFirestoreNow()}
          className="pointer-events-auto bg-red-600 text-white shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 whitespace-nowrap active:opacity-70"
        >
          ✕ 保存失敗 — タップして再試行
        </button>
      )}
    </div>
  )
}
