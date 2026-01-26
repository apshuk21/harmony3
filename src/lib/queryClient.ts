/**
 * TanStack Query Client Configuration
 *
 * Configures the QueryClient with global caches for error handling,
 * logging, and default options for queries and mutations.
 *
 * @example
 * ```tsx
 * // In main.tsx
 * import { QueryClientProvider } from '@tanstack/react-query'
 * import { queryClient } from '@/lib/queryClient'
 *
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 * ```
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { ApiError, isApiError, getErrorMessage } from './api'

/**
 * Global error handler for queries and mutations
 * Centralized place to handle all API errors
 */
function handleGlobalError(
  error: unknown,
  context?: { queryKey?: unknown; mutationKey?: unknown }
) {
  // Log error for debugging
  console.error('[API Error]', {
    error,
    message: getErrorMessage(error),
    queryKey: context?.queryKey,
    mutationKey: context?.mutationKey,
  })

  // Handle specific error types
  if (isApiError(error)) {
    switch (error.status) {
      case 401:
        // Unauthorized - redirect to login or refresh token
        console.warn('[Auth] Session expired or unauthorized')
        // Uncomment when auth is implemented:
        // window.location.href = '/login'
        break

      case 403:
        // Forbidden - user doesn't have permission
        console.warn('[Auth] Access forbidden')
        break

      case 404:
        // Not found - resource doesn't exist
        console.warn('[API] Resource not found')
        break

      case 500:
      case 502:
      case 503:
        // Server error - show user-friendly message
        console.error('[API] Server error')
        break

      default:
        // Other errors
        break
    }
  }

  // Dispatch to toast notification system (uncomment when implemented)
  // toast.error(getErrorMessage(error))
}

/**
 * Query Cache with global callbacks
 * Acts as a global interceptor for all queries
 */
const queryCache = new QueryCache({
  // Called when any query encounters an error
  onError: (error, query) => {
    handleGlobalError(error, { queryKey: query.queryKey })
  },

  // Called when any query succeeds (development logging)
  onSuccess: (_data, query) => {
    if (import.meta.env.DEV) {
      console.debug('[Query Success]', query.queryKey)
    }
  },

  // Called when any query settles (success or error)
  onSettled: (_data, _error, query) => {
    if (import.meta.env.DEV) {
      console.debug('[Query Settled]', query.queryKey)
    }
  },
})

/**
 * Mutation Cache with global callbacks
 * Acts as a global interceptor for all mutations
 */
const mutationCache = new MutationCache({
  // Called when any mutation encounters an error
  onError: (error, _variables, _context, mutation) => {
    handleGlobalError(error, { mutationKey: mutation.options.mutationKey })
  },

  // Called when any mutation succeeds
  onSuccess: (_data, _variables, _context, mutation) => {
    if (import.meta.env.DEV) {
      console.debug('[Mutation Success]', mutation.options.mutationKey)
    }
  },
})

/**
 * QueryClient with global interceptors
 *
 * Features:
 * - Global error handling via QueryCache and MutationCache
 * - Smart retry logic (don't retry 4xx errors)
 * - Sensible defaults for stale time and cache time
 */
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Data is considered fresh for 1 minute
      staleTime: 60 * 1000,

      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Retry failed requests up to 3 times
      // Don't retry on 4xx errors (client errors)
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.isClientError()) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for stale data detection)
      refetchOnWindowFocus: true,

      // Refetch on mount if data is stale
      refetchOnMount: true,

      // Always refetch on reconnect
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Don't retry mutations by default (they might have side effects)
      retry: false,
    },
  },
})

/**
 * Query key factory pattern for consistent key generation
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy to invalidate related queries
 * - Consistent naming across the app
 *
 * @example
 * ```ts
 * // Use in queries
 * useQuery({
 *   queryKey: queryKeys.users.detail(userId),
 *   queryFn: () => api.get(`/api/users/${userId}`)
 * })
 *
 * // Invalidate all user queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
 *
 * // Invalidate specific user
 * queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
 * ```
 */
export const queryKeys = {
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Auth
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  // FX Trades (example for your domain)
  fxTrades: {
    all: ['fx-trades'] as const,
    cash: () => [...queryKeys.fxTrades.all, 'cash'] as const,
    options: () => [...queryKeys.fxTrades.all, 'options'] as const,
  },

  // Add more entities as your app grows
} as const
