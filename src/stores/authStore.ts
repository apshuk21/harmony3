/**
 * Auth Store (Zustand)
 *
 * Stores authentication state for synchronous access across the app.
 * Works alongside TanStack Query's cache - this is the "client view" of auth state.
 *
 * When to use this vs useSession() hook:
 * - useSession(): When you need loading/error states, auto-refetch, cache invalidation
 * - useAuthStore(): When you need synchronous access, outside React, or client-side preferences
 *
 * @example
 * ```tsx
 * // In a component
 * const user = useCurrentUser()
 * const { login, logout } = useAuthActions()
 *
 * // Outside React (e.g., in api interceptors)
 * const user = useAuthStore.getState().user
 * ```
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User } from '@/types/auth'

/**
 * Auth state interface
 */
interface AuthState {
  // User data
  user: User | null
  isAuthenticated: boolean

  // Token (also in localStorage, but having it here allows reactive updates)
  token: string | null

  // Last login timestamp
  lastLoginAt: string | null

  // User preferences (client-side, persisted)
  preferences: {
    rememberMe: boolean
    defaultView: string
  }
}

/**
 * Auth actions interface
 */
interface AuthActions {
  // Set user after successful login
  setUser: (user: User, token: string) => void

  // Clear user on logout
  clearUser: () => void

  // Update user data (e.g., after profile update)
  updateUser: (updates: Partial<User>) => void

  // Update preferences
  setPreference: <K extends keyof AuthState['preferences']>(
    key: K,
    value: AuthState['preferences'][K]
  ) => void
}

type AuthStore = AuthState & AuthActions

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  token: null,
  lastLoginAt: null,
  preferences: {
    rememberMe: false,
    defaultView: '/trade-activity/block-level',
  },
}

/**
 * Auth store
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setUser: (user, token) =>
          set({
            user,
            token,
            isAuthenticated: true,
            lastLoginAt: new Date().toISOString(),
          }),

        clearUser: () =>
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            lastLoginAt: null,
          }),

        updateUser: (updates) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          })),

        setPreference: (key, value) =>
          set((state) => ({
            preferences: { ...state.preferences, [key]: value },
          })),
      }),
      {
        name: 'auth-store',
        // Only persist preferences and remember-me related data
        // Don't persist user/token (they come from login response)
        partialize: (state) => ({
          preferences: state.preferences,
          // Optionally persist user if rememberMe is true
          ...(state.preferences.rememberMe
            ? {
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                lastLoginAt: state.lastLoginAt,
              }
            : {}),
        }),
      }
    ),
    { name: 'AuthStore' }
  )
)

// ============================================================================
// SELECTOR HOOKS (for performance - only re-render when specific values change)
// ============================================================================

/**
 * Get current user (null if not logged in)
 */
export const useCurrentUser = () => useAuthStore((state) => state.user)

/**
 * Check if user is authenticated
 */
export const useIsLoggedIn = () => useAuthStore((state) => state.isAuthenticated)

/**
 * Get user's display name
 */
export const useUserName = () => useAuthStore((state) => state.user?.name ?? null)

/**
 * Get user's role
 */
export const useUserRole = () => useAuthStore((state) => state.user?.role ?? null)

/**
 * Get user preferences
 */
export const useUserPreferences = () => useAuthStore((state) => state.preferences)

// ============================================================================
// ACTION HOOKS (stable references)
// ============================================================================

/**
 * Get auth actions (login, logout, update)
 */
export const useAuthActions = () =>
  useAuthStore((state) => ({
    setUser: state.setUser,
    clearUser: state.clearUser,
    updateUser: state.updateUser,
    setPreference: state.setPreference,
  }))

// ============================================================================
// UTILITY FUNCTIONS (for use outside React)
// ============================================================================

/**
 * Get current user synchronously (outside React)
 *
 * @example
 * ```ts
 * // In an API interceptor
 * const user = getCurrentUser()
 * if (user?.role === 'admin') {
 *   // Add admin header
 * }
 * ```
 */
export function getCurrentUser(): User | null {
  return useAuthStore.getState().user
}

/**
 * Check if authenticated synchronously (outside React)
 */
export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated
}

/**
 * Get auth token synchronously (outside React)
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token
}
