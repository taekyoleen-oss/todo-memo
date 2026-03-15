import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DashboardTab = 'todo' | 'memo'

interface TabState {
  activeTab: DashboardTab
  setActiveTab: (tab: DashboardTab) => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      activeTab: 'todo',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'taskflow-tab',
    }
  )
)
