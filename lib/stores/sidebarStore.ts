import { create } from 'zustand'

interface SidebarStore {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false,
  setCollapsed: (collapsed) => set({ collapsed }),
}))
