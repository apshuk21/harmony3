import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Types for the store
interface SidebarState {
  isOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

interface UIState {
  // Active modal
  activeModal: string | null
  openModal: (modalId: string) => void
  closeModal: () => void

  // Toast notifications queue
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>
  addToast: (message: string, type: 'success' | 'error' | 'info') => void
  removeToast: (id: string) => void
}

// Combined app store type
type AppStore = SidebarState & ThemeState & UIState

// Create the store with devtools and persistence
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        // Sidebar state
        isOpen: true,
        toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
        setSidebarOpen: (open) => set({ isOpen: open }),

        // Theme state
        theme: 'system',
        setTheme: (theme) => set({ theme }),

        // Modal state
        activeModal: null,
        openModal: (modalId) => set({ activeModal: modalId }),
        closeModal: () => set({ activeModal: null }),

        // Toast state
        toasts: [],
        addToast: (message, type) =>
          set((state) => ({
            toasts: [
              ...state.toasts,
              { id: crypto.randomUUID(), message, type },
            ],
          })),
        removeToast: (id) =>
          set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
          })),
      }),
      {
        name: 'app-store',
        // Only persist theme and sidebar state, not toasts/modals
        partialize: (state) => ({
          isOpen: state.isOpen,
          theme: state.theme,
        }),
      }
    ),
    { name: 'AppStore' }
  )
)

// Selector hooks for performance optimization
// Usage: const isOpen = useSidebarOpen()
export const useSidebarOpen = () => useAppStore((state) => state.isOpen)
export const useTheme = () => useAppStore((state) => state.theme)
export const useActiveModal = () => useAppStore((state) => state.activeModal)
export const useToasts = () => useAppStore((state) => state.toasts)

// Action hooks (stable references)
export const useSidebarActions = () =>
  useAppStore((state) => ({
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
  }))

export const useModalActions = () =>
  useAppStore((state) => ({
    openModal: state.openModal,
    closeModal: state.closeModal,
  }))

export const useToastActions = () =>
  useAppStore((state) => ({
    addToast: state.addToast,
    removeToast: state.removeToast,
  }))
