# Header User Display: TanStack Query vs Zustand

This document explains how the logged-in user's name is displayed in the application header and the reasoning behind choosing Zustand over TanStack Query for this use case.

## Implementation

The user name is displayed in the app header at [_app.tsx](../../src/routes/_authenticated/_app.tsx):

```tsx
import { useUserName } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'

function AppLayout() {
  // Using Zustand selector for synchronous access to user name
  const userName = useUserName()
  const logoutMutation = useLogout()

  return (
    <header className="app-header">
      <h1>Harmony App</h1>
      <div className="app-header-user">
        {userName && (
          <>
            <span className="user-greeting">Welcome, {userName}</span>
            <button onClick={() => logoutMutation.mutate()}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  )
}
```

## Why Zustand Instead of TanStack Query?

We chose to read the user name from **Zustand** (`useUserName()`) rather than TanStack Query (`useSession()`) for several important reasons:

### 1. Synchronous Access

**Zustand:**
```tsx
const userName = useUserName()
// userName is immediately available (string | undefined)
```

**TanStack Query:**
```tsx
const { data: session, isLoading, error } = useSession()
// Need to handle loading and error states
```

The header is a persistent UI element that should display immediately without loading spinners. Zustand provides synchronous access to the cached user data.

### 2. No Loading States Required

With TanStack Query, you'd need to handle:
- `isLoading` - Show a skeleton or spinner
- `isError` - Show an error state
- `data` - Finally show the user name

For a simple header greeting, this complexity is unnecessary. The user data was already fetched and validated during login.

### 3. Optimized Re-renders

Zustand selectors only trigger re-renders when the selected value changes:

```tsx
// Only re-renders when user.name changes
const userName = useUserName()

// Re-renders on ANY session data change
const { data } = useSession()
```

This is more performant for the header, which only needs the user's name.

### 4. Persistence Across Page Refreshes

The Zustand auth store uses `persist` middleware:

```tsx
// From src/stores/authStore.ts
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({ /* ... */ }),
      { name: 'auth-storage' }
    )
  )
)
```

This means:
- User data survives page refreshes
- No need to re-fetch session on every page load
- Instant header display without API calls

## Data Flow Comparison

### Reading from Zustand (Current Implementation)

```
┌─────────────────────────────────────────────────────────┐
│                      Page Load                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Zustand reads from localStorage                 │
│         (persisted from previous session)               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Header displays user name immediately           │
│         No loading state, no API call                   │
└─────────────────────────────────────────────────────────┘
```

### If We Used TanStack Query

```
┌─────────────────────────────────────────────────────────┐
│                      Page Load                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         useSession() hook executes                      │
│         isLoading = true                                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Header shows loading spinner or skeleton        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         API call: GET /api/auth/session                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Response received, isLoading = false            │
│         Header finally displays user name               │
└─────────────────────────────────────────────────────────┘
```

## When to Use Each

| Use Case | Recommended Store | Reason |
|----------|-------------------|--------|
| Display user name in header | Zustand | Synchronous, no loading state |
| Show user profile page | TanStack Query | May need fresh data, can show loading |
| Check if authenticated (in components) | Zustand | Synchronous check |
| Check if authenticated (in route guards) | Either | Both work, Zustand is simpler |
| Update user settings | TanStack Query | Server state, needs invalidation |
| Access user data outside React | Zustand | Has non-hook exports |

## Code Locations

| File | Purpose |
|------|---------|
| [src/stores/authStore.ts](../../src/stores/authStore.ts) | Zustand store with user state and selectors |
| [src/hooks/useAuth.ts](../../src/hooks/useAuth.ts) | TanStack Query hooks that sync to Zustand |
| [src/routes/_authenticated/_app.tsx](../../src/routes/_authenticated/_app.tsx) | Header implementation using Zustand |

## Zustand Selectors Available

```tsx
import {
  useCurrentUser,  // Full user object
  useUserName,     // Just the name
  useUserRole,     // Just the role
  useIsAuthenticated
} from '@/stores/authStore'

// For use outside React components
import {
  getCurrentUser,
  isAuthenticated
} from '@/stores/authStore'
```

## Summary

For the header user display, Zustand is the better choice because:

1. **Immediate rendering** - No loading states for a simple greeting
2. **Persistence** - Survives page refreshes via localStorage
3. **Performance** - Selective re-renders with granular selectors
4. **Simplicity** - No async state management in the header

TanStack Query is still the right choice for:
- Initial login/session validation
- Fetching fresh user data when needed
- Any user data that requires server-side validation

The hybrid approach gives us the best of both worlds: TanStack Query manages the server state and authentication flow, while Zustand provides fast, synchronous access for UI rendering.
