import { create } from 'zustand'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SyncStatusStore {
  status: SyncStatus
  setStatus: (status: SyncStatus) => void
}

export const useSyncStatus = create<SyncStatusStore>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}))
