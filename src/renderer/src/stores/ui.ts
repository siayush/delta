import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  theme: 'dark' | 'light'
  activeEnvironmentId: string | null
  setTheme: (t: 'dark' | 'light') => void
  toggleTheme: () => void
  setActiveEnvironmentId: (id: string | null) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeEnvironmentId: null,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id })
    }),
    { name: 'delta-ui' }
  )
)
