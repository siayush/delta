import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  activeEnvironmentId: string | null
  setActiveEnvironmentId: (id: string | null) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeEnvironmentId: null,
      setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id })
    }),
    { name: 'delta-ui' }
  )
)
