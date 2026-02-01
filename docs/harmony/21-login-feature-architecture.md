# Login Feature Architecture

## Table of Contents

1. [Overview](#overview)
2. [Why Dual Storage?](#why-dual-storage)
3. [Token Storage Strategy](#token-storage-strategy)
4. [Authentication Flow](#authentication-flow)
5. [Type Definitions](#type-definitions)
6. [TanStack Query for Auth](#tanstack-query-for-auth)
7. [Zustand Auth Store](#zustand-auth-store)
8. [How They Work Together](#how-they-work-together)
9. [Accessing User Data in Internal Pages](#accessing-user-data-in-internal-pages)
10. [Cookie-Based Authentication](#cookie-based-authentication)
11. [Route Protection](#route-protection)
12. [Key Files Reference](#key-files-reference)

---

## Overview

The login feature uses a dual state management approach:

| Library | Purpose in Auth |
|---------|-----------------|
| **TanStack Query** | Server state - API calls, caching session data, loading/error states |
| **Zustand** | Client state - Synchronous access to user data, persistence, preferences |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │  LoginPage   │────►│  useLogin()  │────►│  authApi     │               │
│   │  Component   │     │  (mutation)  │     │  .login()    │               │
│   └──────────────┘     └──────────────┘     └──────────────┘               │
│                               │                    │                        │
│                               │                    ▼                        │
│                               │            ┌──────────────┐                 │
│                               │            │  POST /api/  │                 │
│                               │            │  auth/login  │                 │
│                               │            └──────────────┘                 │
│                               │                    │                        │
│                               ▼                    ▼                        │
│                        On Success:          Returns:                        │
│                               │              • user                         │
│                               │              • token                        │
│                               │              • refreshToken                 │
│                               │                    │                        │
│              ┌────────────────┴────────────────┐   │                        │
│              ▼                                 ▼   ▼                        │
│   ┌──────────────────┐              ┌──────────────────┐                   │
│   │  TanStack Query  │              │  Zustand Store   │                   │
│   │  Cache Updated   │              │  State Updated   │                   │
│   │  (session query) │              │  (user data)     │                   │
│   └──────────────────┘              └──────────────────┘                   │
│                                              │                              │
│                                     ┌────────┴────────┐                    │
│                                     │  localStorage   │                    │
│                                     │  (token only)   │                    │
│                                     └─────────────────┘                    │
│              │                                 │                            │
│              └─────────────┬───────────────────┘                            │
│                            ▼                                                │
│                   Navigate to /trade-activity                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Dual Storage?

A common question is: **Why store user data in both TanStack Query cache AND Zustand?** Isn't that redundant?

The answer is that each system serves a different purpose, and together they provide a complete solution.

### The Problem with Using Only One

#### If we only used TanStack Query:

```tsx
// Problem: Can't access user data synchronously
function ApiInterceptor() {
  // ❌ This won't work - hooks can only be used in React components
  const { data: user } = useSession()

  // ❌ Can't use in API interceptors, utility functions, or route guards
}

// Problem: Always async, even when we already have the data
function QuickUserCheck() {
  const { data: user, isLoading } = useSession()

  // ❌ Must always handle loading state, even for simple checks
  if (isLoading) return <Spinner />

  return <div>{user?.name}</div>
}
```

#### If we only used Zustand:

```tsx
// Problem: No automatic refetching or cache invalidation
function SessionDisplay() {
  const user = useCurrentUser()

  // ❌ If session expires on server, we won't know
  // ❌ No automatic refresh on window focus
  // ❌ Must manually handle all API states
}

// Problem: Must build loading/error handling manually
const useStore = create((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const user = await api.getSession()
      set({ user, isLoading: false })
    } catch (error) {
      set({ error, isLoading: false })
    }
  },
}))
// ❌ Reinventing what TanStack Query already provides
```

### The Solution: Each System Does What It's Best At

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHY BOTH SYSTEMS ARE NEEDED                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   TanStack Query (Server State)              Zustand (Client State)         │
│   ─────────────────────────────              ──────────────────────         │
│                                                                             │
│   ✓ Handles API communication                ✓ Synchronous access           │
│   ✓ Automatic caching                        ✓ Works outside React          │
│   ✓ Loading/error states built-in            ✓ Instant reads (no async)     │
│   ✓ Background refetching                    ✓ Persistence to localStorage  │
│   ✓ Refetch on window focus                  ✓ User preferences storage     │
│   ✓ Retry logic                              ✓ Can be accessed in:          │
│   ✓ Cache invalidation                         - API interceptors           │
│   ✓ Stale-while-revalidate                     - Route guards               │
│                                                 - Utility functions          │
│                                                 - Event handlers             │
│                                                                             │
│   Best for:                                  Best for:                       │
│   • Initial session fetch                   • Displaying user name/avatar   │
│   • Session validation                      • Role-based UI rendering       │
│   • Detecting session expiry                • Adding auth headers to API    │
│   • Login/logout mutations                  • Quick permission checks       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How They Stay in Sync

The key is that both systems are updated at the same time during login:

```tsx
// src/hooks/useAuth.ts
onSuccess: (data) => {
  // 1. Update TanStack Query cache
  queryClient.setQueryData<User>(authKeys.session(), data.user)

  // 2. Update Zustand store
  setUser(data.user, data.token)

  // Both now have the same user data!
}
```

And during logout, both are cleared:

```tsx
onSuccess: () => {
  clearUser()           // Clear Zustand
  queryClient.clear()   // Clear TanStack Query cache
}
```

### Real-World Analogy

Think of it like a **database** and a **cache**:

- **TanStack Query** = Your source of truth for server data (like a database)
- **Zustand** = Your fast-access cache (like Redis)

You query the database when you need fresh data with loading states, but you read from the cache when you need instant access.

---

## Token Storage Strategy

### Single Source of Truth: localStorage

To avoid duplication and sync issues, tokens are stored **only in localStorage**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN STORAGE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │   localStorage  │  ◄── Single source of truth for tokens                │
│   │   (auth.ts)     │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                │
│            ├──────────────────┬──────────────────┐                          │
│            ▼                  ▼                  ▼                          │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│   │ API Interceptor │ │  Route Guards   │ │  getAuthToken() │              │
│   │ (adds Bearer)   │ │  (auth check)   │ │  (utility)      │              │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘              │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │  Zustand Store  │  ◄── User data only (no token)                        │
│   │  (authStore.ts) │      • user object                                    │
│   └─────────────────┘      • isAuthenticated flag                           │
│                            • preferences                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Not Store Token in Zustand?

| Approach | Problem |
|----------|---------|
| Token in both localStorage + Zustand | Two sources of truth, sync issues |
| Token only in Zustand | Lost on page refresh (unless persisted), then we're back to localStorage anyway |
| Token only in localStorage | Single source of truth, always available |

### How It Works

**1. Login stores token in localStorage:**

```tsx
// src/api/auth.ts
login: async (credentials) => {
  const response = await api.post('/api/auth/login', credentials)

  // Token stored here - single location
  storeTokens(response.token, response.refreshToken)

  return response
}
```

**2. Zustand stores user data (no token):**

```tsx
// src/hooks/useAuth.ts
onSuccess: (data) => {
  queryClient.setQueryData(authKeys.session(), data.user)

  // Only user data passed to Zustand
  // Token is already in localStorage from authApi.login()
  setUser(data.user)
}
```

**3. getAuthToken() reads from localStorage:**

```tsx
// src/stores/authStore.ts (re-exported for convenience)
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken')
}

// Usage in API interceptor
const token = getAuthToken()
if (token) {
  config.headers.Authorization = `Bearer ${token}`
}
```

---

## Authentication Flow

### 1. User Submits Login Form

The `LoginPage` component handles the form submission:

```tsx
// src/pages/public/LoginPage.tsx
const loginMutation = useLogin()

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  loginMutation.mutate({
    email,
    password,
    rememberMe,
  })
}
```

### 2. TanStack Query Mutation Executes

The `useLogin` hook creates a mutation that:
- Calls the API
- Updates TanStack Query cache
- Updates Zustand store
- Navigates to the app

```tsx
// src/hooks/useAuth.ts
export function useLogin(options?: { redirectTo?: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),

    onSuccess: (data) => {
      // Update TanStack Query cache (for useSession hook)
      queryClient.setQueryData<User>(authKeys.session(), data.user)

      // Update Zustand store (for synchronous access & persistence)
      setUser(data.user, data.token)

      // Redirect to app
      navigate({ to: redirectTo })
    },
  })
}
```

### 3. API Layer Handles Request

The `authApi.login()` function:
- Makes the POST request
- Stores tokens in localStorage
- Returns the response

```tsx
// src/api/auth.ts
login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/api/auth/login', credentials)

  // Store tokens on successful login
  storeTokens(response.token, response.refreshToken)

  return response
}
```

### 4. Dual State Update

On successful login, **both** state systems are updated:

| System | What's Updated | Why |
|--------|----------------|-----|
| TanStack Query | Session cache via `setQueryData` | For `useSession()` hook and reactive updates |
| Zustand | User + token via `setUser()` | For synchronous access and optional persistence |

---

## Type Definitions

Located in `src/types/auth.ts`:

```tsx
// User information returned from auth endpoints
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  avatar?: string
  lastLoginAt?: string
}

// Credentials for login request
interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

// Response from successful login
interface LoginResponse {
  user: User
  token: string
  refreshToken?: string
  expiresAt: string
}

// Response from session check
interface SessionResponse {
  user: User
  expiresAt: string
}

// Error codes returned by auth API
type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
```

---

## TanStack Query for Auth

### Query Keys

```tsx
// src/hooks/useAuth.ts
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
}
```

### useSession Hook

Fetches and caches the current user session:

```tsx
export function useSession() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: () => authApi.getSession(),
    staleTime: 5 * 60 * 1000,      // Fresh for 5 minutes
    gcTime: 10 * 60 * 1000,        // Cache for 10 minutes
    retry: false,                   // Don't retry auth checks
    refetchOnWindowFocus: true,     // Verify session on tab focus
  })
}
```

**When to use:**
- When you need loading/error states
- When you want auto-refetch behavior
- In components that need reactive session updates

### useLogin Hook

Handles the login mutation:

```tsx
export function useLogin(options?: { redirectTo?: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),

    onSuccess: (data) => {
      // Update TanStack Query cache
      queryClient.setQueryData<User>(authKeys.session(), data.user)

      // Update Zustand store
      setUser(data.user, data.token)

      // Redirect
      navigate({ to: options?.redirectTo ?? '/trade-activity/block-level' })
    },
  })
}
```

### useLogout Hook

Handles logout with cleanup:

```tsx
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clearUser = useAuthStore((state) => state.clearUser)

  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: () => authApi.logout(),

    onSuccess: () => {
      clearUser()           // Clear Zustand
      queryClient.clear()   // Clear all TanStack Query cache
      navigate({ to: '/login' })
    },

    onError: () => {
      // Even on error, clear local state
      clearUser()
      queryClient.clear()
      navigate({ to: '/login' })
    },
  })
}
```

### Error Handling

The `getLoginErrorMessage` function provides user-friendly error messages:

```tsx
export function getLoginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password'
      case 'ACCOUNT_LOCKED':
        return 'Account locked. Please try again later.'
      case 'TOO_MANY_ATTEMPTS':
        return 'Too many login attempts. Please try again later.'
      // ... other cases
    }
  }
  return 'An unexpected error occurred. Please try again.'
}
```

---

## Zustand Auth Store

Located in `src/stores/authStore.ts`:

### State Structure

```tsx
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  lastLoginAt: string | null
  preferences: {
    rememberMe: boolean
    defaultView: string
  }
}
```

### Actions

```tsx
interface AuthActions {
  setUser: (user: User, token: string) => void
  clearUser: () => void
  updateUser: (updates: Partial<User>) => void
  setPreference: <K extends keyof AuthState['preferences']>(
    key: K,
    value: AuthState['preferences'][K]
  ) => void
}
```

### Store Implementation

```tsx
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        token: null,
        lastLoginAt: null,
        preferences: {
          rememberMe: false,
          defaultView: '/trade-activity/block-level',
        },

        // Actions
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

        // ... other actions
      }),
      {
        name: 'auth-store',
        // Conditional persistence based on rememberMe
        partialize: (state) => ({
          preferences: state.preferences,
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
```

### Selector Hooks

For optimized re-renders:

```tsx
// Get current user
export const useCurrentUser = () => useAuthStore((state) => state.user)

// Check if authenticated
export const useIsLoggedIn = () => useAuthStore((state) => state.isAuthenticated)

// Get user's name
export const useUserName = () => useAuthStore((state) => state.user?.name ?? null)

// Get user's role
export const useUserRole = () => useAuthStore((state) => state.user?.role ?? null)

// Get preferences
export const useUserPreferences = () => useAuthStore((state) => state.preferences)
```

### Action Hook

```tsx
export const useAuthActions = () =>
  useAuthStore((state) => ({
    setUser: state.setUser,
    clearUser: state.clearUser,
    updateUser: state.updateUser,
    setPreference: state.setPreference,
  }))
```

### Utility Functions (Outside React)

```tsx
// Get user synchronously (for API interceptors, etc.)
export function getCurrentUser(): User | null {
  return useAuthStore.getState().user
}

// Check auth synchronously
export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated
}

// Get token synchronously
export function getAuthToken(): string | null {
  return useAuthStore.getState().token
}
```

---

## How They Work Together

### When to Use Which

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHEN TO USE EACH SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Use useSession() (TanStack Query) when:                                   │
│   ─────────────────────────────────────                                     │
│   • You need loading/error states for UI                                    │
│   • You want automatic refetching on window focus                           │
│   • You need to display session expiry warnings                             │
│   • You're building components that react to session changes                │
│                                                                             │
│   Use useAuthStore (Zustand) when:                                          │
│   ────────────────────────────────                                          │
│   • You need synchronous access to user data                                │
│   • You're outside React (API interceptors, utilities)                      │
│   • You need to persist user preferences                                    │
│   • You want instant access without waiting for queries                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example: Header User Display

```tsx
function Header() {
  // Option 1: Use Zustand for immediate display
  const user = useCurrentUser()
  const userName = useUserName()

  // Option 2: Use TanStack Query for loading states
  const { data: user, isLoading } = useSession()

  if (isLoading) return <Skeleton />
  if (!user) return <LoginButton />

  return <UserAvatar user={user} />
}
```

### Example: API Interceptor

```tsx
// Outside React - use Zustand's getState()
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Example: Protected Component

```tsx
function AdminPanel() {
  // Zustand for synchronous role check
  const role = useUserRole()

  if (role !== 'admin') {
    return <AccessDenied />
  }

  return <AdminContent />
}
```

---

## Accessing User Data in Internal Pages

Once logged in, you can access user details from any internal page (like FxCashTab, BlockLevelPage, etc.) using either system depending on your needs.

### Quick Reference: Which Hook to Use

| Need | Use This | Import From |
|------|----------|-------------|
| User's name (display) | `useUserName()` | `@/stores/authStore` |
| Full user object | `useCurrentUser()` | `@/stores/authStore` |
| User's role | `useUserRole()` | `@/stores/authStore` |
| Check if logged in | `useIsLoggedIn()` | `@/stores/authStore` |
| Session with loading state | `useSession()` | `@/hooks/useAuth` |
| Logout action | `useLogout()` | `@/hooks/useAuth` |

### Example: FxCashTab with User Context

```tsx
// src/pages/app/trade-activity/block-level/FxCashTab.tsx
import { useCurrentUser, useUserRole } from '@/stores/authStore'

export function FxCashTab() {
  // Get user details from Zustand (synchronous, no loading state needed)
  const user = useCurrentUser()
  const role = useUserRole()

  // Use user info for filtering, display, or permissions
  const canEditTrades = role === 'admin' || role === 'user'

  return (
    <div className={localStyles.tabPanel}>
      {/* Show user-specific greeting */}
      <div className={styles.tabHeader}>
        <span>Welcome, {user?.name}</span>

        {/* Conditional UI based on role */}
        {canEditTrades && (
          <button className={styles.actionButton}>
            New Trade
          </button>
        )}
      </div>

      {/* Grid with user context */}
      <div className={localStyles.gridContainer}>
        <ServerSideGrid<FxCashTrade>
          columnDefs={columnDefs}
          fetchUrl="/api/fx-cash"
          // Pass user ID for user-specific filtering
          additionalParams={{ traderId: user?.id }}
        />
      </div>
    </div>
  )
}
```

### Example: Role-Based Column Visibility

```tsx
// Show different columns based on user role
const columnDefs = useMemo<ColDef<FxCashTrade>[]>(() => {
  const role = useUserRole()

  const baseColumns = [
    { field: 'tradeId', headerName: 'Trade ID' },
    { field: 'currencyPair', headerName: 'Currency Pair' },
    { field: 'status', headerName: 'Status' },
  ]

  // Admin-only columns
  if (role === 'admin') {
    return [
      ...baseColumns,
      { field: 'trader', headerName: 'Trader' },
      { field: 'approvedBy', headerName: 'Approved By' },
      { field: 'internalNotes', headerName: 'Notes' },
    ]
  }

  return baseColumns
}, [])
```

### Example: User Info in Page Header

```tsx
// src/components/layout/Header.tsx
import { useCurrentUser, useUserName, useUserRole } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'

export function Header() {
  const user = useCurrentUser()
  const userName = useUserName()
  const role = useUserRole()
  const logoutMutation = useLogout()

  return (
    <header className={styles.header}>
      <div className={styles.logo}>Harmony Trading</div>

      <div className={styles.userSection}>
        {/* Display user avatar */}
        {user?.avatar && (
          <img
            src={user.avatar}
            alt={userName ?? 'User'}
            className={styles.avatar}
          />
        )}

        {/* Display user name and role */}
        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{role}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className={styles.logoutButton}
        >
          {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </header>
  )
}
```

### Example: Passing User to API Requests

```tsx
// In a component that needs to filter by current user
import { useCurrentUser } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'

function MyTrades() {
  const user = useCurrentUser()

  const { data: trades, isLoading } = useQuery({
    queryKey: ['trades', 'my-trades', user?.id],
    queryFn: () => fetchTradesByUser(user!.id),
    enabled: !!user?.id, // Only fetch when user is available
  })

  if (isLoading) return <Loading />

  return <TradeList trades={trades} />
}
```

### Example: Outside React (API Interceptor)

```tsx
// src/lib/api.ts
import { getAuthToken, getCurrentUser } from '@/stores/authStore'

// Add auth header to all requests
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Optionally add user context
  const user = getCurrentUser()
  if (user) {
    config.headers['X-User-Id'] = user.id
    config.headers['X-User-Role'] = user.role
  }

  return config
})
```

### Example: Permission Check Utility

```tsx
// src/utils/permissions.ts
import { getCurrentUser } from '@/stores/authStore'

export function canUserPerformAction(action: string): boolean {
  const user = getCurrentUser()
  if (!user) return false

  const permissions: Record<string, string[]> = {
    admin: ['create', 'read', 'update', 'delete', 'approve'],
    user: ['create', 'read', 'update'],
    viewer: ['read'],
  }

  return permissions[user.role]?.includes(action) ?? false
}

// Usage in any file (React or non-React):
if (canUserPerformAction('delete')) {
  // Show delete button
}
```

### Complete Example: Block Level Page with User Context

```tsx
// src/pages/app/trade-activity/BlockLevelPage.tsx
import { useCurrentUser, useUserRole, useUserPreferences } from '@/stores/authStore'
import { useSession } from '@/hooks/useAuth'

export function BlockLevelPage() {
  // Zustand: Synchronous access for immediate rendering
  const user = useCurrentUser()
  const role = useUserRole()
  const preferences = useUserPreferences()

  // TanStack Query: If you need loading state or session validation
  const { isLoading: isValidatingSession } = useSession()

  // Determine user permissions
  const permissions = {
    canCreate: role === 'admin' || role === 'user',
    canApprove: role === 'admin',
    canExport: role !== 'viewer',
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Block Level Trading"
        subtitle={`Welcome back, ${user?.name}`}
      />

      <div className={styles.toolbar}>
        {permissions.canCreate && <CreateTradeButton />}
        {permissions.canExport && <ExportButton />}
      </div>

      <TabPanel defaultTab={preferences.defaultView}>
        <FxCashTab />
        <FxOptionsTab />
        {permissions.canApprove && <ApprovalQueueTab />}
      </TabPanel>
    </div>
  )
}
```

---

## Cookie-Based Authentication

The current implementation uses **JWT tokens stored in localStorage**. However, many applications use **cookie-based (session) authentication** instead. Here's how the architecture would change:

### Token vs Cookie Comparison

| Aspect | JWT in localStorage | Cookie (Session) |
|--------|---------------------|------------------|
| Storage | Client-side (localStorage) | Server sets via `Set-Cookie` header |
| Sent with requests | Manually in `Authorization` header | Automatically by browser |
| XSS vulnerability | Vulnerable (JS can read localStorage) | Secure with `HttpOnly` flag |
| CSRF vulnerability | Not vulnerable | Needs CSRF protection |
| Server state | Stateless (token contains data) | Stateful (server stores session) |
| Scalability | Better (no server-side storage) | Requires session store (Redis, DB) |

### Adapting for Cookie-Based Auth

If your backend uses cookies instead of JWTs, here's what changes:

#### 1. No Token Storage Needed

```tsx
// src/api/auth.ts - SIMPLIFIED
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // Server sets HttpOnly cookie automatically
    // No need to store anything client-side
    const response = await api.post<LoginResponse>('/api/auth/login', credentials, {
      withCredentials: true, // Important: include cookies
    })
    return response
  },

  logout: async (): Promise<void> => {
    // Server clears the cookie
    await api.post('/api/auth/logout', {}, { withCredentials: true })
  },

  getSession: async (): Promise<User | null> => {
    try {
      // Cookie sent automatically
      const response = await api.get<SessionResponse>('/api/auth/session', {
        withCredentials: true,
      })
      return response.user
    } catch (error) {
      return null
    }
  },
}
```

#### 2. Remove Token-Related Code

```tsx
// src/api/auth.ts - Remove these functions
// ❌ storeTokens() - not needed
// ❌ clearTokens() - not needed
// ❌ getAuthToken() - not needed
```

#### 3. No Authorization Header in Interceptor

```tsx
// src/lib/api.ts - BEFORE (JWT)
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// src/lib/api.ts - AFTER (Cookie)
// No interceptor needed for auth!
// Just ensure withCredentials: true is set globally

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Cookies sent automatically
})
```

#### 4. Zustand Stays the Same

```tsx
// Zustand still stores user data for synchronous access
// The only change: no token anywhere

export function useLogin() {
  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.session(), data.user)
      setUser(data.user) // Same as before - just user data
      navigate({ to: '/trade-activity/block-level' })
    },
  })
}
```

#### 5. Auth Check Uses Session Endpoint

```tsx
// src/routes/_authenticated.tsx
function checkAuth(): boolean {
  // With cookies, we can't check client-side
  // Option 1: Assume authenticated, let API return 401
  // Option 2: Check Zustand's isAuthenticated (hydrated from session)

  return useAuthStore.getState().isAuthenticated
}

// Better approach: Use TanStack Router's beforeLoad with async check
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    // This makes a request - cookie sent automatically
    const user = await authApi.getSession()

    if (!user) {
      throw redirect({ to: '/login' })
    }

    // Optionally hydrate Zustand here
    useAuthStore.getState().setUser(user)
  },
})
```

### Cookie Auth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COOKIE-BASED AUTH FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LOGIN:                                                                    │
│   ───────                                                                   │
│   Client                           Server                                   │
│      │                                │                                     │
│      │─── POST /api/auth/login ──────►│                                     │
│      │    { email, password }         │                                     │
│      │                                │                                     │
│      │◄── Set-Cookie: session=xyz ───│  (HttpOnly, Secure, SameSite)       │
│      │    { user: {...} }             │                                     │
│      │                                │                                     │
│                                                                             │
│   SUBSEQUENT REQUESTS:                                                      │
│   ────────────────────                                                      │
│   Client                           Server                                   │
│      │                                │                                     │
│      │─── GET /api/fx-cash ──────────►│                                     │
│      │    Cookie: session=xyz         │  (sent automatically by browser)    │
│      │                                │                                     │
│      │◄── { data: [...] } ───────────│  (server validates session)         │
│      │                                │                                     │
│                                                                             │
│   LOGOUT:                                                                   │
│   ───────                                                                   │
│   Client                           Server                                   │
│      │                                │                                     │
│      │─── POST /api/auth/logout ─────►│                                     │
│      │    Cookie: session=xyz         │                                     │
│      │                                │                                     │
│      │◄── Set-Cookie: session=;      │  (clears cookie)                    │
│      │    expires=past                │                                     │
│      │                                │                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When to Use Which

| Use JWT + localStorage | Use Cookies |
|------------------------|-------------|
| Mobile apps (React Native) | Web-only applications |
| Microservices architecture | Traditional server-rendered apps |
| Need offline capability | Need better XSS protection |
| Stateless requirements | Have session infrastructure |
| Third-party API access | Same-origin API only |

### Security Considerations for Cookies

```tsx
// Server should set these cookie attributes:
Set-Cookie: session=xyz;
  HttpOnly;        // Can't be read by JavaScript (XSS protection)
  Secure;          // Only sent over HTTPS
  SameSite=Strict; // CSRF protection
  Path=/;          // Available to all paths
  Max-Age=86400;   // 24 hours
```

---

## Route Protection

The `_authenticated.tsx` layout route protects all authenticated routes:

```tsx
// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const isAuthenticated = checkAuth()

    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AuthenticatedLayout,
})

function checkAuth(): boolean {
  // Check token existence or Zustand state
  return !!localStorage.getItem('authToken')
}
```

### Route Structure

```
routes/
├── _public/
│   └── login.tsx          # Public login page
├── _authenticated/        # Protected routes
│   └── _app/
│       └── trade-activity/
│           └── ...
└── _authenticated.tsx     # Auth guard layout
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/types/auth.ts` | Type definitions for auth |
| `src/api/auth.ts` | API functions (login, logout, getSession) |
| `src/hooks/useAuth.ts` | TanStack Query hooks (useLogin, useLogout, useSession) |
| `src/stores/authStore.ts` | Zustand store for client-side auth state |
| `src/pages/public/LoginPage.tsx` | Login form UI |
| `src/routes/_authenticated.tsx` | Route protection guard |
| `src/mocks/handlers/auth.ts` | MSW mock handlers for development |

---

## Summary

The login feature demonstrates the recommended pattern of combining TanStack Query and Zustand:

1. **TanStack Query** handles the async operations (login mutation, session queries) with automatic caching, loading states, and error handling

2. **Zustand** provides synchronous access to auth state, works outside React components, and handles client preferences with optional persistence

3. **Both systems stay in sync** - the `useLogin` mutation updates both TanStack Query cache and Zustand store on success

4. **Each serves its strength** - Query for server interactions, Zustand for client-side state

This approach gives you the best of both worlds: powerful server state management and simple, synchronous client state access.
