# TanStack Query Cache Deep Dive

This document provides an in-depth explanation of TanStack Query's caching mechanism, focusing on `staleTime`, `gcTime`, `enabled`, and multi-tab behavior.

## Table of Contents

1. [Default Values](#default-values)
2. [Cache Storage Location](#cache-storage-location)
3. [Understanding staleTime](#understanding-staletime)
4. [Understanding gcTime](#understanding-gctime)
5. [The enabled Option](#the-enabled-option)
6. [Relationship Between staleTime, gcTime, and enabled](#relationship-between-staletime-gctime-and-enabled)
7. [Multi-Tab Behavior](#multi-tab-behavior)
8. [Practical Examples](#practical-examples)

---

## Default Values

| Option | Default Value | Meaning |
|--------|---------------|---------|
| **staleTime** | `0` (0 ms) | Data is **immediately stale** after fetch. Every mount/focus triggers a refetch. |
| **gcTime** | `300000` (5 minutes) | Inactive cache is kept for 5 minutes before garbage collection. |
| **enabled** | `true` | Query runs automatically on mount. |

### Quick Reference

```tsx
// These are the defaults - you don't need to specify them
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 0,           // DEFAULT: 0 ms (immediately stale)
  gcTime: 1000 * 60 * 5,  // DEFAULT: 5 minutes (300,000 ms)
  enabled: true,          // DEFAULT: true (auto-fetch on mount)
})
```

### Why These Defaults?

| Option | Why This Default? |
|--------|-------------------|
| `staleTime: 0` | Ensures users always see the freshest data. Safe default for most apps. |
| `gcTime: 5 min` | Balances memory usage with UX (instant back-navigation within 5 min). |
| `enabled: true` | Most queries should fetch automatically when component mounts. |

---

## Cache Storage Location

### Where is the cache stored?

TanStack Query stores its cache **in JavaScript memory (RAM)** - not in localStorage, sessionStorage, or IndexedDB by default.

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Tab                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              JavaScript Runtime (V8)                 │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │                                                      │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │           QueryClient Instance               │   │   │
│   │   ├─────────────────────────────────────────────┤   │   │
│   │   │                                              │   │   │
│   │   │   QueryCache (in-memory Map)                │   │   │
│   │   │   ├── ['users', 1] → { data, state, ... }   │   │   │
│   │   │   ├── ['users', 2] → { data, state, ... }   │   │   │
│   │   │   └── ['posts']    → { data, state, ... }   │   │   │
│   │   │                                              │   │   │
│   │   │   MutationCache (in-memory Map)             │   │   │
│   │   │   └── mutation instances                     │   │   │
│   │   │                                              │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Implications

| Aspect | Behavior |
|--------|----------|
| Page Refresh | Cache is **completely lost** |
| Tab Close | Cache is **completely lost** |
| New Tab | Gets its **own separate cache** |
| Same Tab Navigation | Cache is **preserved** |

### Enabling Persistent Cache

To persist cache across page refreshes, you need to use a persister:

```tsx
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (must be >= persisted time)
    },
  },
})

// Create a persister using localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'TANSTACK_QUERY_CACHE',
})

// Enable persistence
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
})
```

---

## Understanding staleTime

### What is staleTime?

> **Default: `0` (0 milliseconds)** - Data is immediately stale after fetching.

`staleTime` determines how long data is considered "fresh" after being fetched. During this time, TanStack Query will **not** refetch the data, even if the component remounts.

**With the default `staleTime: 0`**, every component mount or window focus will trigger a background refetch, even if data was just fetched moments ago.

```
Time ──────────────────────────────────────────────────────────►

     │◄────── staleTime (5 minutes) ──────►│
     │                                       │
Fetch│         DATA IS FRESH                 │    DATA IS STALE
─────●───────────────────────────────────────●──────────────────
     │                                       │
     │  • No refetch on mount                │  • Refetch on mount
     │  • No refetch on window focus         │  • Refetch on window focus
     │  • No refetch on reconnect            │  • Refetch on reconnect
     │  • Cache returns immediately          │  • Cache returns + background refetch
```

### staleTime Values

```tsx
// Default: 0 (immediately stale)
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  // staleTime: 0  ← default
})

// Data stays fresh for 5 minutes
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 1000 * 60 * 5, // 5 minutes
})

// Data never becomes stale (use for static data)
useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: Infinity,
})
```

### Example: staleTime in Action

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data, isFetching } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Scenario 1: First mount
  // - No cache exists
  // - Fetches from server
  // - isFetching = true

  // Scenario 2: Remount within 5 minutes
  // - Cache exists and is FRESH
  // - Returns cached data immediately
  // - NO refetch happens
  // - isFetching = false

  // Scenario 3: Remount after 5 minutes
  // - Cache exists but is STALE
  // - Returns cached data immediately (instant UI)
  // - Background refetch happens
  // - isFetching = true (shows loading indicator if desired)

  return (
    <div>
      {data?.name}
      {isFetching && <span className="spinner" />}
    </div>
  )
}
```

---

## Understanding gcTime

### What is gcTime?

> **Default: `300000` (5 minutes)** - Inactive cache is garbage collected after 5 minutes.

`gcTime` (garbage collection time, formerly `cacheTime`) determines how long **inactive** query data remains in the cache before being garbage collected.

**With the default `gcTime: 300000` (5 min)**, if a user navigates away from a page and returns within 5 minutes, the cached data is still available (instant display). After 5 minutes, the cache is deleted and a fresh fetch is required.

### Key Definitions

| Term | Meaning |
|------|---------|
| **ACTIVE query** | At least one component is using `useQuery` with this query key |
| **INACTIVE query** | No component is currently using this query key (all unmounted) |
| **gcTime** | Countdown timer that starts when a query becomes INACTIVE |

### When Does a Query Become Inactive?

A query becomes **INACTIVE** when the component using it **unmounts** (not while it's mounted). Common scenarios:

- User navigates to a different page
- Component is conditionally hidden (`{showList && <UserList />}`)
- Parent component unmounts

### Visual Timeline: Navigation Example

Imagine a user navigating between a User List page and a User Detail page:

```
TIME ──────────────────────────────────────────────────────────────────────────►

USER ACTIONS:
  Visit        Navigate to      Navigate back     Navigate back
  /users       /users/123       to /users         to /users
    │              │                 │                 │
    ▼              ▼                 ▼                 ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│ UserList          UserDetail        UserList          UserList              │
│ Component         Component         Component         Component             │
│ MOUNTED           MOUNTED           MOUNTED           MOUNTED               │
│    │                 │                 │                 │                  │
│    │   UserList      │   UserDetail    │   UserList      │                  │
│    │   UNMOUNTS      │   UNMOUNTS      │   UNMOUNTS      │                  │
│    ▼                 ▼                 ▼                 ▼                  │
└─────────────────────────────────────────────────────────────────────────────┘

QUERY ['users'] STATUS:

    ACTIVE ──────► INACTIVE ─────────► ACTIVE ──────► INACTIVE ──────────────►
       │              │                    │              │
       │              │◄── gcTime ────────►│              │◄───── gcTime ─────►
       │              │   countdown        │              │      countdown
       │              │                    │              │
       │              │   Component        │              │   If gcTime expires
       │              │   remounts in      │              │   before remount:
       │              │   time! Cache      │              │   Cache DELETED
       │              │   preserved ✓      │              │
```

### What Happens at Each Stage?

```
STAGE 1: User visits /users
├── UserList component MOUNTS
├── useQuery(['users']) executes
├── Query ['users'] becomes ACTIVE
└── Data is fetched from server

STAGE 2: User navigates to /users/123
├── UserList component UNMOUNTS
├── Query ['users'] becomes INACTIVE
├── gcTime countdown STARTS (default: 5 minutes)
└── Cache is still in memory (not deleted yet)

STAGE 3: User navigates back to /users (within gcTime)
├── UserList component MOUNTS again
├── useQuery(['users']) executes
├── Query ['users'] becomes ACTIVE again
├── gcTime countdown STOPS and RESETS
├── Cache data is returned immediately ✓
└── If data is stale, background refetch happens

STAGE 4: If user never returns (gcTime expires)
├── 5 minutes pass with query INACTIVE
├── gcTime expires
├── Cache is GARBAGE COLLECTED (deleted)
└── Next mount will require fresh fetch
```

### gcTime Values

```tsx
// Default: 5 minutes
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  // gcTime: 1000 * 60 * 5  ← default (5 minutes)
})

// Keep in cache for 1 hour even when inactive
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  gcTime: 1000 * 60 * 60, // 1 hour
})

// Immediately remove from cache when inactive
useQuery({
  queryKey: ['sensitive-data'],
  queryFn: fetchSensitiveData,
  gcTime: 0, // Remove immediately when component unmounts
})

// Never garbage collect (keep forever)
useQuery({
  queryKey: ['static-config'],
  queryFn: fetchConfig,
  gcTime: Infinity,
})
```

### Example: gcTime in Action

```tsx
// Page A - User List
function UserList() {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  return <div>{users?.map(u => <Link to={`/user/${u.id}`}>{u.name}</Link>)}</div>
}

// Page B - User Detail
function UserDetail({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  return <div>{user?.name}</div>
}

// Timeline:
// 1. User visits /users (UserList mounts)
//    - Query ['users'] becomes ACTIVE
//    - Fetches user list
//
// 2. User clicks on a user, navigates to /user/123 (UserList unmounts)
//    - Query ['users'] becomes INACTIVE
//    - 10-minute gcTime countdown starts
//
// 3. User navigates back to /users within 10 minutes
//    - Query ['users'] still in cache!
//    - If stale, background refetch
//    - If fresh, instant display
//
// 4. User navigates back to /users after 10 minutes
//    - Query ['users'] was garbage collected
//    - Fresh fetch required
//    - Shows loading state
```

---

## The enabled Option

### What is enabled?

> **Default: `true`** - Query runs automatically when the component mounts.

The `enabled` option controls whether the query should automatically run. When `enabled: false`, the query will not execute until enabled becomes `true`.

**With the default `enabled: true`**, the query fetches data automatically when the component mounts. Set `enabled: false` for dependent queries or lazy/manual queries.

```tsx
const { data, refetch } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  enabled: !!userId, // Only run when userId exists
})
```

### enabled States

| enabled Value | Behavior |
|---------------|----------|
| `true` (default) | Query runs automatically on mount |
| `false` | Query does NOT run automatically |
| `false` → `true` | Query runs when enabled changes to true |
| `true` → `false` | Query stops, but cache is preserved |

### Common Use Cases

#### 1. Dependent Queries (Waterfall)

```tsx
function UserPosts({ userId }: { userId: string }) {
  // First query: fetch user
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  // Second query: only runs after user is loaded
  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchPostsByUser(user!.id),
    enabled: !!user?.id, // Waits for user to load
  })

  return (
    <div>
      <h1>{user?.name}'s Posts</h1>
      {posts?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  )
}
```

#### 2. Manual/Lazy Queries

```tsx
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [shouldSearch, setShouldSearch] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: () => searchAPI(searchTerm),
    enabled: shouldSearch && searchTerm.length >= 3,
  })

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={() => setShouldSearch(true)}>
        Search
      </button>
      {isFetching && <Spinner />}
      {data && <Results data={data} />}
    </div>
  )
}
```

#### 3. Conditional Fetching Based on Permissions

```tsx
function AdminDashboard() {
  const { user } = useAuth()

  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    enabled: user?.role === 'admin', // Only fetch for admins
  })

  if (user?.role !== 'admin') {
    return <AccessDenied />
  }

  return <Dashboard stats={adminStats} />
}
```

---

## Relationship Between staleTime, gcTime, and enabled

### The Complete Picture

```
                          enabled: false
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Query DISABLED    │
                    │   (Won't execute)   │
                    └─────────────────────┘
                               │
                        enabled: true
                               │
                               ▼
     ┌─────────────────────────────────────────────────────────┐
     │                    QUERY LIFECYCLE                       │
     └─────────────────────────────────────────────────────────┘

     FETCHING ──► FRESH ──────────────────► STALE ─────────────►
                  │                          │
                  │◄────── staleTime ───────►│
                  │                          │
                  │  No refetch on:          │  Refetch on:
                  │  • mount                 │  • mount
                  │  • window focus          │  • window focus
                  │  • network reconnect     │  • network reconnect
                  │  • interval (if set)     │  • interval (if set)
                  │                          │
     ─────────────┴──────────────────────────┴─────────────────►


     ┌─────────────────────────────────────────────────────────┐
     │                    CACHE LIFECYCLE                       │
     └─────────────────────────────────────────────────────────┘

     ACTIVE ─────────────────────► INACTIVE ───────────────────►
     (Component mounted)           (Component unmounted)
                                   │
                                   │◄─────── gcTime ──────────►│
                                   │                            │
                                   │  Cache preserved           │  Cache deleted
                                   │  Instant data on remount   │  Fresh fetch needed
```

### Configuration Matrix

| Scenario | staleTime | gcTime | enabled | Behavior |
|----------|-----------|--------|---------|----------|
| Real-time data | `0` | `5min` | `true` | Always refetch on mount/focus |
| Semi-static data | `5min` | `30min` | `true` | Refetch only after 5min |
| Static config | `Infinity` | `Infinity` | `true` | Fetch once, never refetch |
| Dependent query | `5min` | `5min` | `!!parentData` | Wait for parent |
| Lazy query | `5min` | `5min` | `false` | Manual trigger only |
| Sensitive data | `0` | `0` | `true` | Always fresh, no caching |

### Practical Example: E-commerce Product Page

```tsx
function ProductPage({ productId }: { productId: string }) {
  // 1. Product details - changes rarely, cache aggressively
  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    staleTime: 1000 * 60 * 10,  // Fresh for 10 minutes
    gcTime: 1000 * 60 * 60,     // Keep in cache for 1 hour
  })

  // 2. Stock status - changes frequently, always fresh
  const { data: stock } = useQuery({
    queryKey: ['product', productId, 'stock'],
    queryFn: () => fetchStock(productId),
    staleTime: 0,               // Always stale (refetch on every mount)
    gcTime: 1000 * 60 * 5,      // Cache for 5 minutes
    enabled: !!product,         // Only after product loads
  })

  // 3. Reviews - user generated, moderate freshness
  const { data: reviews } = useQuery({
    queryKey: ['product', productId, 'reviews'],
    queryFn: () => fetchReviews(productId),
    staleTime: 1000 * 60 * 2,   // Fresh for 2 minutes
    gcTime: 1000 * 60 * 30,     // Keep in cache for 30 minutes
    enabled: !!product,         // Only after product loads
  })

  // 4. Related products - static, cache forever
  const { data: related } = useQuery({
    queryKey: ['product', productId, 'related'],
    queryFn: () => fetchRelatedProducts(productId),
    staleTime: Infinity,        // Never stale
    gcTime: Infinity,           // Never garbage collect
    enabled: !!product,         // Only after product loads
  })

  return (
    <div>
      <ProductDetails product={product} />
      <StockBadge stock={stock} />
      <ReviewsList reviews={reviews} />
      <RelatedProducts products={related} />
    </div>
  )
}
```

---

## Multi-Tab Behavior

### Default Behavior: Isolated Caches

By default, each browser tab has its **own isolated cache**. They do not share data.

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐       ┌─────────────────────┐          │
│  │       TAB 1         │       │       TAB 2         │          │
│  ├─────────────────────┤       ├─────────────────────┤          │
│  │                     │       │                     │          │
│  │  QueryClient A      │       │  QueryClient B      │          │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │          │
│  │  │ Cache         │  │       │  │ Cache         │  │          │
│  │  │ ['users'] → ▓ │  │       │  │ ['users'] → ▓ │  │          │
│  │  └───────────────┘  │       │  └───────────────┘  │          │
│  │                     │       │                     │          │
│  │  Data fetched at    │       │  Data fetched at    │          │
│  │  10:00:00           │       │  10:05:00           │          │
│  │                     │       │                     │          │
│  │  NO SYNC ←──────────┼───────┼──────────→ NO SYNC  │          │
│  │                     │       │                     │          │
│  └─────────────────────┘       └─────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What Happens in Each Tab?

```tsx
// Tab 1 opens at 10:00:00
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 1000 * 60 * 5, // 5 minutes
})
// → Fetches users, caches result

// Tab 2 opens at 10:02:00
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 1000 * 60 * 5, // 5 minutes
})
// → Tab 2 has NO cache, fetches users AGAIN

// Tab 1 user updates a record at 10:03:00
// → Tab 1 invalidates and refetches
// → Tab 2 still has STALE data (no sync!)
```

### Enabling Cross-Tab Synchronization

Use the `broadcastQueryClient` plugin to sync cache across tabs:

```tsx
import { QueryClient } from '@tanstack/react-query'
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental'

const queryClient = new QueryClient()

// Enable cross-tab sync using BroadcastChannel API
broadcastQueryClient({
  queryClient,
  broadcastChannel: 'harmony-app-cache',
})
```

### With Cross-Tab Sync Enabled

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐       ┌─────────────────────┐          │
│  │       TAB 1         │       │       TAB 2         │          │
│  ├─────────────────────┤       ├─────────────────────┤          │
│  │                     │       │                     │          │
│  │  QueryClient A      │       │  QueryClient B      │          │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │          │
│  │  │ Cache         │  │       │  │ Cache         │  │          │
│  │  │ ['users'] → ▓ │◄─┼───────┼─►│ ['users'] → ▓ │  │          │
│  │  └───────────────┘  │       │  └───────────────┘  │          │
│  │         │           │       │         ▲           │          │
│  │         │           │       │         │           │          │
│  └─────────┼───────────┘       └─────────┼───────────┘          │
│            │                             │                       │
│            │    ┌───────────────────┐    │                       │
│            └───►│ BroadcastChannel  │────┘                       │
│                 │ 'harmony-app-cache'│                           │
│                 └───────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cross-Tab Sync Events

| Event | Synced? | Description |
|-------|---------|-------------|
| Query data update | Yes | When data changes in one tab |
| Query invalidation | Yes | When cache is invalidated |
| New query | No | Each tab fetches independently |
| Optimistic updates | Partially | Depends on configuration |

### Complete Multi-Tab Setup

```tsx
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 60 * 24,   // 24 hours (for persistence)
      refetchOnWindowFocus: true,
      retry: 3,
    },
  },
})

// 1. Cross-tab synchronization (via BroadcastChannel)
broadcastQueryClient({
  queryClient,
  broadcastChannel: 'harmony-cache-sync',
})

// 2. Persistence across page refreshes (via localStorage)
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'HARMONY_QUERY_CACHE',
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: 'v1', // Increment to invalidate old cache
})
```

### Window Focus Refetching

TanStack Query refetches stale queries when the window regains focus:

```tsx
// Global configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // Default: true
      // or 'always' to refetch even fresh queries
    },
  },
})

// Per-query configuration
useQuery({
  queryKey: ['real-time-prices'],
  queryFn: fetchPrices,
  refetchOnWindowFocus: 'always', // Always refetch, even if fresh
})

useQuery({
  queryKey: ['static-config'],
  queryFn: fetchConfig,
  refetchOnWindowFocus: false, // Never refetch on focus
})
```

### Timeline: Multi-Tab with Focus Refetching

```
Time ────────────────────────────────────────────────────────────►

TAB 1:  ──[Active]──────[Background]─────────[Active]──────────►
                   │                     │
                   │  User switches      │  User returns
                   │  to Tab 2           │  to Tab 1
                   │                     │
                   ▼                     ▼
                                    Stale queries
                                    refetch!

TAB 2:  ──[Background]──[Active]───────[Background]────────────►
                   │             │
                   │  Tab gains  │  Tab loses
                   │  focus      │  focus
                   │             │
                   ▼
              Stale queries
              refetch!
```

---

## Practical Examples

### Example 1: Dashboard with Mixed Freshness

```tsx
function Dashboard() {
  // User info - rarely changes, cache aggressively
  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 30,  // 30 minutes
    gcTime: 1000 * 60 * 60,     // 1 hour
  })

  // Notifications - changes often, always check
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 0,               // Always stale
    refetchInterval: 30000,     // Poll every 30 seconds
    enabled: !!user,            // Only after user loads
  })

  // Activity feed - balance between freshness and performance
  const { data: activity } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: fetchActivityFeed,
    staleTime: 1000 * 60 * 2,   // 2 minutes
    gcTime: 1000 * 60 * 10,     // 10 minutes
    enabled: !!user,
  })

  return (
    <div className="dashboard">
      <UserHeader user={user} />
      <NotificationBell notifications={notifications} />
      <ActivityFeed activity={activity} />
    </div>
  )
}
```

### Example 2: Form with Dependent Dropdowns

```tsx
function LocationForm() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedState, setSelectedState] = useState<string | null>(null)

  // Countries - static data, cache forever
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  // States - depends on country selection
  const { data: states, isLoading: statesLoading } = useQuery({
    queryKey: ['states', selectedCountry],
    queryFn: () => fetchStates(selectedCountry!),
    staleTime: 1000 * 60 * 60,  // 1 hour
    gcTime: 1000 * 60 * 60,     // 1 hour
    enabled: !!selectedCountry, // Only when country selected
  })

  // Cities - depends on state selection
  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', selectedState],
    queryFn: () => fetchCities(selectedState!),
    staleTime: 1000 * 60 * 30,  // 30 minutes
    gcTime: 1000 * 60 * 60,     // 1 hour
    enabled: !!selectedState,   // Only when state selected
  })

  return (
    <form>
      <select
        value={selectedCountry ?? ''}
        onChange={(e) => {
          setSelectedCountry(e.target.value)
          setSelectedState(null) // Reset dependent selections
        }}
      >
        <option value="">Select Country</option>
        {countries?.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        value={selectedState ?? ''}
        onChange={(e) => setSelectedState(e.target.value)}
        disabled={!selectedCountry || statesLoading}
      >
        <option value="">Select State</option>
        {states?.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select
        value=""
        disabled={!selectedState || citiesLoading}
      >
        <option value="">Select City</option>
        {cities?.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </form>
  )
}
```

### Example 3: Search with Debounce

```tsx
function SearchPage() {
  const [inputValue, setInputValue] = useState('')
  const [debouncedValue, setDebouncedValue] = useState('')

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', debouncedValue],
    queryFn: () => searchAPI(debouncedValue),
    staleTime: 1000 * 60 * 5,   // Cache search results for 5 min
    gcTime: 1000 * 60 * 10,     // Keep in cache for 10 min
    enabled: debouncedValue.length >= 2, // Only search 2+ chars
  })

  return (
    <div>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search..."
      />
      {isFetching && <Spinner />}
      {results && <SearchResults results={results} />}
    </div>
  )
}
```

---

## Summary Table

| Option | Default | Purpose | Common Values |
|--------|---------|---------|---------------|
| `staleTime` | `0` | How long data stays "fresh" | `0`, `5min`, `Infinity` |
| `gcTime` | `5min` | How long inactive cache lives | `0`, `5min`, `24h`, `Infinity` |
| `enabled` | `true` | Whether query runs automatically | `true`, `false`, `!!dependency` |
| `refetchOnWindowFocus` | `true` | Refetch when tab gains focus | `true`, `false`, `'always'` |
| `refetchOnMount` | `true` | Refetch when component mounts | `true`, `false`, `'always'` |
| `refetchOnReconnect` | `true` | Refetch when network reconnects | `true`, `false`, `'always'` |

### Decision Guide

```
Do you need the data immediately?
├── Yes → Set enabled: true (or based on dependency)
└── No  → Set enabled: false (lazy query)

How often does the server data change?
├── Real-time (seconds) → staleTime: 0, refetchInterval: X
├── Frequently (minutes) → staleTime: 1-5 minutes
├── Occasionally (hours) → staleTime: 30-60 minutes
└── Rarely/Never → staleTime: Infinity

How important is keeping old data available?
├── Critical → gcTime: Infinity (or very long)
├── Nice to have → gcTime: 30-60 minutes
├── Not important → gcTime: 5 minutes (default)
└── Sensitive data → gcTime: 0 (remove immediately)
```

## Related Documentation

- [16-tanstack-query-interceptors.md](./16-tanstack-query-interceptors.md) - Global interceptors setup
- [14-tanstack-query-zustand-state-management.md](./14-tanstack-query-zustand-state-management.md) - State management patterns
