# TanStack Query + Zustand: State Management Strategy

## Table of Contents

1. [Overview](#overview)
2. [Why This Combination?](#why-this-combination)
3. [Setup Steps](#setup-steps)
4. [TanStack Query Usage](#tanstack-query-usage)
5. [Zustand Usage](#zustand-usage)
6. [When to Use Which](#when-to-use-which)
7. [Advanced Patterns](#advanced-patterns)
8. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Overview

This project uses a two-library approach to state management:

| Library | Version | Purpose |
|---------|---------|---------|
| **TanStack Query** | v5 | Server state (API data, caching, background sync) |
| **Zustand** | v5 | Client state (UI state, user preferences, local-only data) |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐       │
│   │      TanStack Query         │    │         Zustand              │       │
│   │      (Server State)         │    │      (Client State)          │       │
│   ├─────────────────────────────┤    ├─────────────────────────────┤       │
│   │                             │    │                             │       │
│   │  • API responses            │    │  • UI state (modals, etc)   │       │
│   │  • Cached data              │    │  • User preferences         │       │
│   │  • Loading states           │    │  • Theme settings           │       │
│   │  • Error states             │    │  • Sidebar open/closed      │       │
│   │  • Background refetching    │    │  • Form drafts              │       │
│   │  • Optimistic updates       │    │  • Local filters            │       │
│   │  • Pagination state         │    │  • Toast notifications      │       │
│   │                             │    │                             │       │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘       │
│                  │                                  │                       │
│                  │         ┌────────────┐           │                       │
│                  └────────►│ Components │◄──────────┘                       │
│                            └────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Combination?

### The Problem with Traditional Global State

Many projects make the mistake of putting everything in Redux/Zustand:

```typescript
// ❌ BAD: Server data in global state
const useStore = create((set) => ({
  users: [],
  usersLoading: false,
  usersError: null,
  fetchUsers: async () => {
    set({ usersLoading: true })
    try {
      const users = await api.getUsers()
      set({ users, usersLoading: false })
    } catch (error) {
      set({ usersError: error, usersLoading: false })
    }
  },
}))
```

**Problems with this approach:**
- Manual loading/error state management
- No caching — refetches on every mount
- No background refetching — data goes stale
- No deduplication — same request fires multiple times
- No retry logic
- No pagination/infinite scroll support
- No optimistic updates

### The Solution: Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVER STATE vs CLIENT STATE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   SERVER STATE (TanStack Query)          CLIENT STATE (Zustand)             │
│   ─────────────────────────────          ──────────────────────             │
│                                                                             │
│   • Persisted remotely                   • Persisted locally (or not)       │
│   • Async / requires fetching            • Sync / immediately available     │
│   • Shared ownership (other users)       • Owned by this client only        │
│   • Can become stale                     • Always up-to-date locally        │
│   • Needs caching strategy               • Simple state updates             │
│                                                                             │
│   Examples:                              Examples:                          │
│   • User profile from API                • Is sidebar open?                 │
│   • List of products                     • Current theme (dark/light)       │
│   • Order history                        • Active modal ID                  │
│   • Search results                       • Form input before submit         │
│   • Real-time notifications              • Selected items in UI             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Setup Steps

### Step 1: Install Packages

```bash
npm install @tanstack/react-query zustand
npm install @tanstack/react-query-devtools  # Optional but recommended
```

### Step 2: Create QueryClient Configuration

**File: `src/lib/queryClient.ts`**

```typescript
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

      // Refetch on reconnect
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

// Query key factory pattern for consistent key generation
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
} as const
```

### Step 3: Create Zustand Store

**File: `src/stores/appStore.ts`**

```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  // Sidebar
  isOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Modal
  activeModal: string | null
  openModal: (modalId: string) => void
  closeModal: () => void

  // Toasts
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>
  addToast: (message: string, type: 'success' | 'error' | 'info') => void
  removeToast: (id: string) => void
}

export const useAppStore = create<AppState>()(
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
        // Only persist certain fields
        partialize: (state) => ({
          isOpen: state.isOpen,
          theme: state.theme,
        }),
      }
    ),
    { name: 'AppStore' }  // Name shown in Redux DevTools
  )
)

// Selector hooks for performance optimization
export const useSidebarOpen = () => useAppStore((state) => state.isOpen)
export const useTheme = () => useAppStore((state) => state.theme)
export const useActiveModal = () => useAppStore((state) => state.activeModal)
export const useToasts = () => useAppStore((state) => state.toasts)
```

### Step 4: Update main.tsx with Providers

**File: `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/queryClient'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

**Note:** Zustand doesn't need a Provider — stores are created outside React and can be imported directly.

---

## TanStack Query Usage

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUser(userId),
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return <div>{data.name}</div>
}
```

### Query with Parameters

```typescript
function UserList({ filters }: { filters: UserFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => fetchUsers(filters),
    // Only fetch when filters are valid
    enabled: filters.status !== undefined,
  })

  return (
    <ul>
      {data?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  )
}
```

### Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateUserForm() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newUser: CreateUserDto) => api.createUser(newUser),
    onSuccess: () => {
      // Invalidate and refetch user list
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
    },
  })

  const handleSubmit = (data: CreateUserDto) => {
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      {mutation.isError && <p>Error: {mutation.error.message}</p>}
    </form>
  )
}
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos', newTodo.id] })

    // Snapshot previous value
    const previousTodo = queryClient.getQueryData(['todos', newTodo.id])

    // Optimistically update
    queryClient.setQueryData(['todos', newTodo.id], newTodo)

    // Return context for rollback
    return { previousTodo }
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos', newTodo.id], context.previousTodo)
  },
  onSettled: () => {
    // Refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

### Dependent Queries

```typescript
function UserPosts({ userId }: { userId: string }) {
  // First query
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  // Second query depends on first
  const postsQuery = useQuery({
    queryKey: ['posts', userQuery.data?.id],
    queryFn: () => fetchPosts(userQuery.data!.id),
    enabled: !!userQuery.data?.id,  // Only runs when user data is available
  })

  // ...
}
```

### Parallel Queries

```typescript
import { useQueries } from '@tanstack/react-query'

function Dashboard({ userIds }: { userIds: string[] }) {
  const userQueries = useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
    })),
  })

  const isLoading = userQueries.some(q => q.isLoading)
  const users = userQueries.map(q => q.data).filter(Boolean)

  // ...
}
```

### Prefetching

```typescript
function UserListItem({ user }: { user: User }) {
  const queryClient = useQueryClient()

  // Prefetch on hover
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(user.id),
      queryFn: () => fetchUser(user.id),
      staleTime: 5 * 60 * 1000,  // Don't prefetch if data is less than 5 min old
    })
  }

  return (
    <Link
      to={`/users/${user.id}`}
      onMouseEnter={handleMouseEnter}
    >
      {user.name}
    </Link>
  )
}
```

---

## Zustand Usage

### Basic Store Access

```typescript
import { useAppStore, useSidebarOpen } from '@/stores/appStore'

// Option 1: Select specific state (recommended)
function Sidebar() {
  const isOpen = useSidebarOpen()
  const toggleSidebar = useAppStore(state => state.toggleSidebar)

  return (
    <aside className={isOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  )
}

// Option 2: Destructure (creates new object on every render - less optimal)
function Sidebar() {
  const { isOpen, toggleSidebar } = useAppStore()
  // ...
}
```

### Why Selectors Matter

```typescript
// ❌ BAD: Re-renders on ANY store change
function Component() {
  const store = useAppStore()  // Subscribes to entire store
  return <div>{store.isOpen}</div>
}

// ✅ GOOD: Only re-renders when isOpen changes
function Component() {
  const isOpen = useAppStore(state => state.isOpen)
  return <div>{isOpen}</div>
}
```

### Multiple Selectors with Shallow Equality

```typescript
import { shallow } from 'zustand/shallow'

// Use when selecting multiple values
function Component() {
  const { isOpen, theme } = useAppStore(
    state => ({ isOpen: state.isOpen, theme: state.theme }),
    shallow  // Prevents re-render if object reference changes but values don't
  )
}
```

### Actions Outside Components

```typescript
// Access store outside React
import { useAppStore } from '@/stores/appStore'

// In a utility function or API interceptor
export function showErrorToast(message: string) {
  useAppStore.getState().addToast(message, 'error')
}

// In an API error handler
api.interceptors.response.use(
  response => response,
  error => {
    showErrorToast(error.message)
    return Promise.reject(error)
  }
)
```

### Computed Values (Derived State)

```typescript
// Option 1: Compute in selector
function Component() {
  const hasToasts = useAppStore(state => state.toasts.length > 0)
}

// Option 2: Add to store (if used frequently)
const useAppStore = create<AppState>()((set, get) => ({
  toasts: [],

  // Getter function
  hasToasts: () => get().toasts.length > 0,

  // Or as computed property (recalculated on access)
  get hasActiveToasts() {
    return this.toasts.length > 0
  },
}))
```

### Async Actions in Zustand

```typescript
const useStore = create<StoreState>()((set, get) => ({
  items: [],
  isLoading: false,

  // Async action
  fetchItems: async () => {
    set({ isLoading: true })
    try {
      const items = await api.getItems()
      set({ items, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      // Handle error
    }
  },

  // Action that uses current state
  addItem: (item) => {
    const currentItems = get().items
    set({ items: [...currentItems, item] })
  },
}))
```

**Note:** For server data, prefer TanStack Query over async Zustand actions.

---

## When to Use Which

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DECISION TREE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Does the data come from an API/server?                                    │
│   │                                                                         │
│   ├── YES ──► Use TanStack Query                                           │
│   │           • Handles caching, loading, errors automatically              │
│   │           • Background refetching keeps data fresh                      │
│   │           • Deduplicates identical requests                             │
│   │                                                                         │
│   └── NO ───► Is it shared across multiple components?                     │
│               │                                                             │
│               ├── YES ──► Use Zustand                                       │
│               │           • Global state for UI concerns                    │
│               │           • Persist to localStorage if needed               │
│               │                                                             │
│               └── NO ───► Use React local state                            │
│                           • useState for simple cases                       │
│                           • useReducer for complex logic                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick Reference Table

| Scenario | Solution |
|----------|----------|
| User profile from API | TanStack Query |
| List of products from API | TanStack Query |
| "Is sidebar open?" | Zustand |
| "Which theme is selected?" | Zustand (with persist) |
| "Is this dropdown open?" | React useState |
| Form input values | React useState (or form library) |
| "Which modal is active?" | Zustand |
| Paginated table data | TanStack Query |
| User's selected filters | Zustand (or URL state) |
| Real-time notifications | TanStack Query (with refetch interval) |
| Toast messages | Zustand |
| Shopping cart (before checkout) | Zustand (with persist) |
| Order history | TanStack Query |

---

## Advanced Patterns

### Pattern 1: Combining Query Data with Zustand Filters

```typescript
function ProductList() {
  // Client state: filters from Zustand
  const filters = useFiltersStore(state => state.productFilters)

  // Server state: products from TanStack Query
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  })

  return (
    <>
      <FilterPanel />  {/* Updates Zustand filters */}
      <ProductGrid products={products} loading={isLoading} />
    </>
  )
}
```

### Pattern 2: Optimistic UI with Both Libraries

```typescript
function LikeButton({ postId }: { postId: string }) {
  const queryClient = useQueryClient()
  const addToast = useAppStore(state => state.addToast)

  const likeMutation = useMutation({
    mutationFn: () => api.likePost(postId),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      const previous = queryClient.getQueryData(['post', postId])
      queryClient.setQueryData(['post', postId], (old: Post) => ({
        ...old,
        likes: old.likes + 1,
        isLiked: true,
      }))
      return { previous }
    },
    onError: (err, _, context) => {
      // Rollback
      queryClient.setQueryData(['post', postId], context?.previous)
      // Show toast via Zustand
      addToast('Failed to like post', 'error')
    },
    onSuccess: () => {
      addToast('Post liked!', 'success')
    },
  })

  return <button onClick={() => likeMutation.mutate()}>Like</button>
}
```

### Pattern 3: Hydrating Zustand from Query

```typescript
function UserSettings() {
  const setTheme = useAppStore(state => state.setTheme)

  // Fetch user preferences from server
  const { data: preferences } = useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: fetchUserPreferences,
  })

  // Sync server preferences to Zustand (once)
  useEffect(() => {
    if (preferences?.theme) {
      setTheme(preferences.theme)
    }
  }, [preferences?.theme, setTheme])

  // ...
}
```

### Pattern 4: Persisting Zustand to Server

```typescript
function ThemeToggle() {
  const theme = useTheme()
  const setTheme = useAppStore(state => state.setTheme)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newTheme: Theme) => api.updatePreferences({ theme: newTheme }),
    onMutate: (newTheme) => {
      // Update Zustand immediately
      setTheme(newTheme)
    },
    onSuccess: () => {
      // Invalidate preferences query
      queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] })
    },
    onError: (_, __, context) => {
      // Could rollback Zustand here if needed
    },
  })

  return (
    <select value={theme} onChange={(e) => mutation.mutate(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  )
}
```

---

## Common Mistakes to Avoid

### Mistake 1: Putting Server Data in Zustand

```typescript
// ❌ BAD: Server data in Zustand
const useStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await api.getUsers()
    set({ users })
  },
}))

// ✅ GOOD: Server data in TanStack Query
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: api.getUsers,
})
```

### Mistake 2: Not Using Selectors

```typescript
// ❌ BAD: Subscribes to entire store
const { theme } = useAppStore()

// ✅ GOOD: Only subscribes to theme
const theme = useAppStore(state => state.theme)
```

### Mistake 3: Inline Query Functions

```typescript
// ❌ BAD: New function reference on every render
useQuery({
  queryKey: ['user', id],
  queryFn: async () => {
    const res = await fetch(`/api/users/${id}`)
    return res.json()
  },
})

// ✅ GOOD: Stable function reference
const fetchUser = async (id: string) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
})
```

### Mistake 4: Not Invalidating After Mutations

```typescript
// ❌ BAD: Cache is stale after mutation
const mutation = useMutation({
  mutationFn: createUser,
})

// ✅ GOOD: Invalidate related queries
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

### Mistake 5: Over-Persisting Zustand State

```typescript
// ❌ BAD: Persisting everything including transient UI state
persist(
  (set) => ({
    isOpen: true,
    activeModal: null,  // Don't persist this
    toasts: [],         // Don't persist this
  }),
  { name: 'app-store' }
)

// ✅ GOOD: Only persist what should survive refresh
persist(
  (set) => ({
    isOpen: true,
    theme: 'system',
    activeModal: null,
    toasts: [],
  }),
  {
    name: 'app-store',
    partialize: (state) => ({
      isOpen: state.isOpen,
      theme: state.theme,
    }),
  }
)
```

---

## Project File Structure

```
src/
├── lib/
│   └── queryClient.ts       # QueryClient config + query key factory
├── stores/
│   ├── appStore.ts          # Main app store (sidebar, theme, modals)
│   └── [feature]Store.ts    # Feature-specific stores as needed
├── hooks/
│   └── queries/
│       ├── useUsers.ts      # User-related queries
│       └── useProducts.ts   # Product-related queries
└── main.tsx                 # QueryClientProvider wraps the app
```

---

## DevTools

### TanStack Query DevTools

- Floating button in bottom-right corner (development only)
- Shows all queries, their state, cache, and timing
- Manually trigger refetches for testing

### Zustand DevTools

- Install Redux DevTools browser extension
- Zustand stores with `devtools()` middleware appear automatically
- View state changes, time-travel debugging

---

## Related Documentation

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [12-api-strategy-views-data-fetching.md](./12-api-strategy-views-data-fetching.md) — API strategy using TanStack Query
