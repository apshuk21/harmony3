import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 1 minute
      staleTime: 60 * 1000,

      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for stale data detection)
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is still fresh
      refetchOnMount: true,

      // Don't refetch on reconnect by default
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

// Query key factory pattern for consistent key generation
// Usage: queryKeys.users.list(), queryKeys.users.detail(id)
export const queryKeys = {
  // Example structure - extend as needed
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  // Add more entities as your app grows
} as const
