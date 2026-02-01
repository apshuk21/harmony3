/**
 * Authentication Hooks
 *
 * React hooks for authentication state and operations.
 * Built on TanStack Query for caching and state management.
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const loginMutation = useLogin()
 *
 *   const handleSubmit = (credentials) => {
 *     loginMutation.mutate(credentials)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {loginMutation.isError && <Error error={loginMutation.error} />}
 *       {loginMutation.isPending && <Spinner />}
 *       ...
 *     </form>
 *   )
 * }
 * ```
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { isApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { LoginCredentials, User } from '@/types/auth'

/**
 * Query keys for auth-related queries
 */
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
}

/**
 * Hook to get current user session
 *
 * Checks if user is authenticated and returns user data.
 * Returns null if not authenticated.
 *
 * @example
 * ```tsx
 * function UserMenu() {
 *   const { data: user, isLoading } = useSession()
 *
 *   if (isLoading) return <Spinner />
 *   if (!user) return <LoginButton />
 *
 *   return <UserAvatar user={user} />
 * }
 * ```
 */
export function useSession() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: () => authApi.getSession(),
    staleTime: 5 * 60 * 1000, // Consider session fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false, // Don't retry auth checks
    refetchOnWindowFocus: true, // Check session on tab focus
  })
}

/**
 * Hook to check if user is authenticated
 *
 * Simple boolean check derived from session query.
 *
 * @example
 * ```tsx
 * function ProtectedRoute({ children }) {
 *   const { isAuthenticated, isLoading } = useIsAuthenticated()
 *
 *   if (isLoading) return <Spinner />
 *   if (!isAuthenticated) return <Navigate to="/login" />
 *
 *   return children
 * }
 * ```
 */
export function useIsAuthenticated() {
  const sessionQuery = useSession()

  return {
    isAuthenticated: !!sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    user: sessionQuery.data,
  }
}

/**
 * Hook to handle login
 *
 * Returns a mutation for logging in with credentials.
 * On success, updates session cache and redirects to app.
 *
 * @param options - Optional configuration
 * @param options.redirectTo - Path to redirect after login (default: '/')
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const loginMutation = useLogin()
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault()
 *     loginMutation.mutate({ email, password })
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {loginMutation.isError && (
 *         <div className="error">{getLoginError(loginMutation.error)}</div>
 *       )}
 *       <input name="email" />
 *       <input name="password" type="password" />
 *       <button disabled={loginMutation.isPending}>
 *         {loginMutation.isPending ? 'Logging in...' : 'Login'}
 *       </button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useLogin(options?: { redirectTo?: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const redirectTo = options?.redirectTo ?? '/trade-activity/block-level'

  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),

    onSuccess: (data) => {
      // Update TanStack Query cache (for useSession hook)
      queryClient.setQueryData<User>(authKeys.session(), data.user)

      // Update Zustand store (for synchronous access & persistence)
      // Note: Token is already stored in localStorage by authApi.login()
      setUser(data.user)

      // Redirect to app
      navigate({ to: redirectTo })
    },

    // Note: onError is NOT needed here!
    // Global error handler in MutationCache handles logging/toasts
    // Component can still access error via mutation.error for UI display
  })
}

/**
 * Hook to handle logout
 *
 * Returns a mutation for logging out.
 * On success, clears cache and redirects to login.
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const logoutMutation = useLogout()
 *
 *   return (
 *     <button
 *       onClick={() => logoutMutation.mutate()}
 *       disabled={logoutMutation.isPending}
 *     >
 *       {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clearUser = useAuthStore((state) => state.clearUser)

  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: () => authApi.logout(),

    onSuccess: () => {
      // Clear Zustand store
      clearUser()

      // Clear all TanStack Query cached data
      queryClient.clear()

      // Redirect to login page
      navigate({ to: '/login' })
    },

    onError: () => {
      // Even if logout fails on server, still clear local state
      clearUser()
      queryClient.clear()
      navigate({ to: '/login' })
    },
  })
}

/**
 * Get a user-friendly error message for login errors
 *
 * @example
 * ```tsx
 * {loginMutation.isError && (
 *   <div className="error">{getLoginErrorMessage(loginMutation.error)}</div>
 * )}
 * ```
 */
export function getLoginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    // Handle specific error codes
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password'

      case 'ACCOUNT_LOCKED': {
        const details = error.details as { lockoutEndsAt?: string } | undefined
        if (details?.lockoutEndsAt) {
          const lockoutTime = new Date(details.lockoutEndsAt)
          return `Account locked until ${lockoutTime.toLocaleTimeString()}`
        }
        return 'Account locked. Please try again later.'
      }

      case 'ACCOUNT_DISABLED':
        return 'This account has been disabled. Please contact support.'

      case 'EMAIL_NOT_VERIFIED':
        return 'Please verify your email address before logging in.'

      case 'TOO_MANY_ATTEMPTS': {
        const details = error.details as { retryAfter?: number } | undefined
        if (details?.retryAfter) {
          return `Too many attempts. Please wait ${details.retryAfter} seconds.`
        }
        return 'Too many login attempts. Please try again later.'
      }

      default:
        return error.toUserMessage()
    }
  }

  return 'An unexpected error occurred. Please try again.'
}
