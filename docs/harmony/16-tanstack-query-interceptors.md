# TanStack Query Global Interceptors

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Architecture](#architecture)
4. [Key Components](#key-components)
   - [ApiError Class](#apierror-class)
   - [QueryCache & MutationCache](#querycache--mutationcache)
   - [apiFetch Wrapper](#apifetch-wrapper)
5. [Login Page Example](#login-page-example)
6. [Common Use Cases](#common-use-cases)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Best Practices](#best-practices)

---

## Overview

TanStack Query doesn't have built-in request/response interceptors like Axios. However, we can achieve the same functionality using:

1. **QueryCache & MutationCache** - Global callbacks for all queries and mutations
2. **Custom fetch wrapper (`apiFetch`)** - Request/response interception at the HTTP level
3. **ApiError class** - Structured error handling across the application

This setup provides:
- Centralized error handling (no need to handle errors in every component)
- Request/response logging for debugging
- Automatic auth token injection
- Request tracing with unique IDs
- Smart retry logic (don't retry 4xx errors)
- Request timeout handling
- Network error detection

---

## File Structure

The API layer follows separation of concerns:

```
src/lib/
├── api/
│   ├── errors.ts      # Error classes (ApiError, NetworkError, TimeoutError)
│   ├── client.ts      # HTTP client (apiFetch, api convenience methods)
│   └── index.ts       # Barrel export
└── queryClient.ts     # TanStack Query configuration
```

### Why This Structure?

| File | Responsibility | Benefits |
|------|----------------|----------|
| `errors.ts` | Error class definitions | Can be imported anywhere without circular dependencies |
| `client.ts` | HTTP fetch wrapper | Reusable outside TanStack Query (WebSockets, file uploads) |
| `queryClient.ts` | QueryClient configuration | Single responsibility, easy to test |
| `index.ts` | Public API | Clean imports, hide implementation details |

### Import Patterns

```typescript
// Import from the api module (recommended)
import { apiFetch, api, ApiError, isApiError } from '@/lib/api'

// Import QueryClient separately
import { queryClient, queryKeys } from '@/lib/queryClient'

// For type-only imports
import type { ApiFetchOptions } from '@/lib/api'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TANSTACK QUERY INTERCEPTOR ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   COMPONENT LAYER                                                           │
│   ───────────────                                                           │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  LoginPage.tsx                                                       │  │
│   │                                                                      │  │
│   │  const loginMutation = useMutation({                                │  │
│   │    mutationFn: (credentials) => apiFetch('/api/auth/login', {...}) │  │
│   │  })                                                                  │  │
│   │                                                                      │  │
│   │  // Component only handles UI logic                                  │  │
│   │  // All error handling happens globally!                            │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│   REQUEST LAYER (apiFetch)                                                  │
│   ────────────────────────                                                  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  REQUEST INTERCEPTOR                                                 │  │
│   │  ────────────────────                                                │  │
│   │  • Add Content-Type header                                          │  │
│   │  • Add Authorization header (Bearer token)                          │  │
│   │  • Add X-Request-ID for tracing                                     │  │
│   │  • Log request details                                              │  │
│   │  • Start performance timer                                          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│                        fetch(url, options)                                  │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  RESPONSE INTERCEPTOR                                                │  │
│   │  ─────────────────────                                               │  │
│   │  • Log response status and duration                                 │  │
│   │  • Parse error responses → throw ApiError                           │  │
│   │  • Handle empty responses (204)                                     │  │
│   │  • Parse JSON response                                              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                    ┌─────────┴─────────┐                                   │
│                    ▼                   ▼                                   │
│               SUCCESS              ERROR                                   │
│                    │                   │                                   │
│                    ▼                   ▼                                   │
│   CACHE LAYER (QueryCache / MutationCache)                                 │
│   ────────────────────────────────────────                                 │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  GLOBAL CALLBACKS                                                    │  │
│   │  ────────────────                                                    │  │
│   │                                                                      │  │
│   │  onSuccess:                                                          │  │
│   │    • Log success for debugging                                      │  │
│   │    • Track analytics                                                │  │
│   │                                                                      │  │
│   │  onError:                                                            │  │
│   │    • Log error with query/mutation key                              │  │
│   │    • Handle 401 → Redirect to login                                 │  │
│   │    • Handle 403 → Show forbidden message                            │  │
│   │    • Handle 5xx → Show server error toast                           │  │
│   │    • Dispatch to notification system                                │  │
│   │                                                                      │  │
│   │  onSettled:                                                          │  │
│   │    • Cleanup operations                                             │  │
│   │    • Performance tracking                                           │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│                    Component receives result                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### ApiError Class

A custom error class that provides structured error information:

```typescript
// src/lib/api/errors.ts

export class ApiError extends Error {
  status: number      // HTTP status code (401, 404, 500, etc.)
  code?: string       // Application-specific error code
  details?: unknown   // Additional error details from API
  requestId?: string  // Request ID for tracing

  constructor(message: string, status: number, code?: string, details?: unknown, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }

  // Helper methods
  isClientError(): boolean { return this.status >= 400 && this.status < 500 }
  isServerError(): boolean { return this.status >= 500 }
  isAuthError(): boolean { return this.status === 401 }
  toUserMessage(): string { /* Returns user-friendly message */ }
}

// Additional error classes
export class NetworkError extends Error { /* No internet, DNS failure */ }
export class TimeoutError extends Error { /* Request timeout */ }
export class ValidationError extends Error { /* Client-side validation */ }

// Type guards
export function isApiError(error: unknown): error is ApiError
export function isNetworkError(error: unknown): error is NetworkError
export function getErrorMessage(error: unknown): string
```
```

**Why use a custom error class?**

```typescript
import { apiFetch, ApiError, isApiError, NetworkError, TimeoutError } from '@/lib/api'

// ❌ Without ApiError - generic error, no context
try {
  await fetch('/api/users')
} catch (error) {
  // What kind of error? 401? 500? Network error?
  console.log(error.message) // "Failed to fetch" - not helpful!
}

// ✅ With ApiError - structured, actionable
try {
  await apiFetch('/api/users')
} catch (error) {
  if (isApiError(error)) {
    console.log(error.status)     // 401
    console.log(error.code)       // "TOKEN_EXPIRED"
    console.log(error.details)    // { expiresAt: "2024-01-01" }
    console.log(error.requestId)  // "abc-123" (for debugging)

    if (error.isAuthError()) {
      redirectToLogin()
    }
  }

  if (error instanceof NetworkError) {
    console.log('No internet connection')
  }

  if (error instanceof TimeoutError) {
    console.log(`Request timed out after ${error.timeout}ms`)
  }
}
```

### QueryCache & MutationCache

Global interceptors that catch ALL queries and mutations:

```typescript
// src/lib/queryClient.ts

const queryCache = new QueryCache({
  // Called when ANY query fails
  onError: (error, query) => {
    handleGlobalError(error, { queryKey: query.queryKey })
  },

  // Called when ANY query succeeds
  onSuccess: (_data, query) => {
    console.debug('[Query Success]', query.queryKey)
  },

  // Called when ANY query completes (success or error)
  onSettled: (_data, _error, query) => {
    console.debug('[Query Settled]', query.queryKey)
  },
})

const mutationCache = new MutationCache({
  // Called when ANY mutation fails
  onError: (error, _variables, _context, mutation) => {
    handleGlobalError(error, { mutationKey: mutation.options.mutationKey })
  },

  // Called when ANY mutation succeeds
  onSuccess: (_data, _variables, _context, mutation) => {
    console.debug('[Mutation Success]', mutation.options.mutationKey)
  },
})

// Pass caches to QueryClient
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  // ... other options
})
```

**Global Error Handler:**

```typescript
function handleGlobalError(error: unknown, context?: { queryKey?: unknown; mutationKey?: unknown }) {
  console.error('[API Error]', { error, ...context })

  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        // Session expired - redirect to login
        // window.location.href = '/login'
        break

      case 403:
        // Access denied
        // toast.error('You do not have permission to perform this action')
        break

      case 404:
        // Resource not found
        break

      case 500:
      case 502:
      case 503:
        // Server error
        // toast.error('Server error. Please try again later.')
        break
    }
  }
}
```

### apiFetch Wrapper

A fetch wrapper that handles request/response interception:

```typescript
// src/lib/api/client.ts

import { ApiError, NetworkError, TimeoutError } from './errors'

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: RequestInit['body'] | Record<string, unknown>  // Auto-stringify objects
  timeout?: number           // Request timeout (default: 30000ms)
  skipContentType?: boolean  // Skip auto Content-Type header
  baseUrl?: string           // Override base URL
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options

  // ===== REQUEST INTERCEPTOR =====
  const headers = new Headers(fetchOptions.headers)

  // Add default Content-Type for JSON
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  // Add auth token automatically
  const token = localStorage.getItem('authToken')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Add request ID for tracing
  const requestId = crypto.randomUUID()
  headers.set('X-Request-ID', requestId)

  // Auto-stringify object bodies
  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body)
  }

  // ===== EXECUTE WITH TIMEOUT =====
  try {
    const response = await fetchWithTimeout(url, { ...fetchOptions, headers, body }, timeout)
    // ... response handling
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new TimeoutError(url, timeout)
    }
    throw new NetworkError('Unable to connect to the server.', error)
  }

  // ... error and success handling
}

// Convenience methods
export const api = {
  get<T>(url: string, options?): Promise<T>,
  post<T>(url: string, body?, options?): Promise<T>,
  put<T>(url: string, body?, options?): Promise<T>,
  patch<T>(url: string, body?, options?): Promise<T>,
  delete<T>(url: string, options?): Promise<T>,
}
```

**Usage Examples:**

```typescript
import { apiFetch, api } from '@/lib/api'

// Using apiFetch directly
const users = await apiFetch<User[]>('/api/users')

// Using convenience methods (cleaner)
const user = await api.get<User>('/api/users/1')
const newUser = await api.post<User>('/api/users', { name: 'John', email: 'john@example.com' })
await api.delete('/api/users/1')

// With custom options
const data = await apiFetch<Data>('/api/data', {
  timeout: 60000,  // 60 second timeout
  headers: { 'X-Custom-Header': 'value' },
})
```

---

## Login Page Example

This project includes a **fully working login implementation**. Here's how the pieces fit together:

### Implementation Files

| File | Purpose |
|------|---------|
| `src/types/auth.ts` | Type definitions for auth data structures |
| `src/api/auth.ts` | Auth API functions (login, logout, getSession) |
| `src/hooks/useAuth.ts` | React hooks (useLogin, useLogout, useSession) |
| `src/pages/public/LoginPage.tsx` | Login page component |
| `src/pages/public/LoginPage.module.css` | Login page styles |
| `src/mocks/handlers/auth.ts` | MSW mock handlers for development |

### Demo Credentials

The mock server accepts these credentials:

| Email | Password | Description |
|-------|----------|-------------|
| `demo@harmony.com` | `demo123` | Regular user account |
| `admin@harmony.com` | `admin123` | Admin user account |
| `locked@harmony.com` | `locked123` | Locked account (for testing error handling) |

### Complete Login Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE LOGIN FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. USER ACTION                                                            │
│      User fills in email/password and clicks "Sign In"                     │
│      │                                                                      │
│      ▼                                                                      │
│   2. COMPONENT (LoginPage.tsx)                                             │
│      loginMutation.mutate({ email, password })                             │
│      │                                                                      │
│      ▼                                                                      │
│   3. HOOK (useAuth.ts → useLogin)                                          │
│      Calls authApi.login(credentials)                                      │
│      │                                                                      │
│      ▼                                                                      │
│   4. API LAYER (api/auth.ts)                                               │
│      Calls api.post('/api/auth/login', credentials)                        │
│      │                                                                      │
│      ▼                                                                      │
│   5. HTTP CLIENT (lib/api/client.ts)                                       │
│      ├── REQUEST INTERCEPTOR                                               │
│      │   • Adds Content-Type: application/json                             │
│      │   • Adds X-Request-ID: abc-123                                      │
│      │   • Logs: [API Request] { url, method, requestId }                 │
│      │                                                                      │
│      ▼                                                                      │
│   6. MSW MOCK (mocks/handlers/auth.ts) or REAL SERVER                      │
│      ├── Validates credentials                                             │
│      ├── Returns { user, token, expiresAt }                                │
│      │                                                                      │
│      ▼                                                                      │
│   7. HTTP CLIENT - RESPONSE                                                │
│      ├── RESPONSE INTERCEPTOR                                              │
│      │   • Logs: [API Response] { url, status, duration }                 │
│      │   • Parses JSON response                                            │
│      │                                                                      │
│      ▼                                                                      │
│   8. API LAYER (api/auth.ts)                                               │
│      ├── Stores tokens in localStorage                                     │
│      │   localStorage.setItem('authToken', token)                          │
│      │                                                                      │
│      ▼                                                                      │
│   9. HOOK (useAuth.ts)                                                     │
│      ├── onSuccess callback                                                │
│      │   • Updates session cache: queryClient.setQueryData(...)           │
│      │   • Redirects to app: navigate({ to: '/trade-activity/...' })      │
│      │                                                                      │
│      ▼                                                                      │
│   10. USER IS LOGGED IN                                                    │
│       User sees the main application                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Code Walkthrough

Here's a complete example of how to implement a login page using the interceptor architecture:

### Step 1: Define API Types

```typescript
// src/types/auth.ts

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'user'
  }
  token: string
  expiresAt: string
}

export interface AuthError {
  code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'EMAIL_NOT_VERIFIED'
  message: string
  attemptsRemaining?: number
}
```

### Step 2: Create Auth API Functions

```typescript
// src/api/auth.ts

import { api, ApiError, isApiError } from '@/lib/api'
import type { LoginCredentials, LoginResponse } from '@/types/auth'

export const authApi = {
  /**
   * Login with email and password
   */
  login: (credentials: LoginCredentials): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/api/auth/login', credentials)
  },

  /**
   * Logout current user
   */
  logout: (): Promise<void> => {
    return api.post('/api/auth/logout')
  },

  /**
   * Get current user session
   */
  getSession: async (): Promise<LoginResponse['user'] | null> => {
    try {
      return await api.get<LoginResponse['user']>('/api/auth/session')
    } catch (error) {
      if (isApiError(error) && error.isAuthError()) {
        return null // Not logged in
      }
      throw error
    }
  },
}
```

### Step 3: Create Custom Hooks

```typescript
// src/hooks/useAuth.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/lib/queryClient'
import type { LoginCredentials } from '@/types/auth'

/**
 * Query key for auth
 */
export const authKeys = {
  session: ['auth', 'session'] as const,
}

/**
 * Hook to get current user session
 */
export function useSession() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: authApi.getSession,
    staleTime: 5 * 60 * 1000, // Consider session fresh for 5 minutes
    retry: false, // Don't retry auth checks
  })
}

/**
 * Hook to handle login
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),

    onSuccess: (data) => {
      // Store token
      localStorage.setItem('authToken', data.token)

      // Update session cache
      queryClient.setQueryData(authKeys.session, data.user)

      // Redirect to app
      navigate({ to: '/' })
    },

    // Note: onError is NOT needed here!
    // Global error handler in MutationCache will handle it
  })
}

/**
 * Hook to handle logout
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: authApi.logout,

    onSuccess: () => {
      // Clear token
      localStorage.removeItem('authToken')

      // Clear all cached data
      queryClient.clear()

      // Redirect to login
      navigate({ to: '/login' })
    },
  })
}
```

### Step 4: Implement Login Page

```typescript
// src/pages/public/LoginPage.tsx

import { useState } from 'react'
import { useLogin } from '@/hooks/useAuth'
import { ApiError, isApiError } from '@/lib/api'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email, password })
  }

  // Get user-friendly error message
  const getLoginErrorMessage = () => {
    const error = loginMutation.error

    if (isApiError(error)) {
      // Handle specific error codes from API
      switch (error.code) {
        case 'INVALID_CREDENTIALS':
          return 'Invalid email or password'
        case 'ACCOUNT_LOCKED':
          const details = error.details as { attemptsRemaining?: number } | undefined
          return `Account locked. ${details?.attemptsRemaining ?? 0} attempts remaining.`
        case 'EMAIL_NOT_VERIFIED':
          return 'Please verify your email before logging in'
        default:
          return error.toUserMessage() // Use built-in user message
      }
    }

    return 'An unexpected error occurred'
  }

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>

        {/* Error display */}
        {loginMutation.isError && (
          <div className="error-message">
            {getLoginErrorMessage()}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loginMutation.isPending}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginMutation.isPending}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
```

### What Happens When Login Fails?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOGIN ERROR FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. User clicks "Login" with wrong password                                │
│      │                                                                      │
│      ▼                                                                      │
│   2. loginMutation.mutate({ email, password })                             │
│      │                                                                      │
│      ▼                                                                      │
│   3. apiFetch('/api/auth/login', { method: 'POST', body: ... })           │
│      │                                                                      │
│      ├── REQUEST INTERCEPTOR                                               │
│      │   • Adds Content-Type: application/json                             │
│      │   • Adds X-Request-ID: abc-123                                      │
│      │   • Logs: [Request] { url: '/api/auth/login', method: 'POST' }     │
│      │                                                                      │
│      ▼                                                                      │
│   4. Server returns 401 with error body:                                   │
│      {                                                                      │
│        "code": "INVALID_CREDENTIALS",                                       │
│        "message": "Invalid email or password"                               │
│      }                                                                      │
│      │                                                                      │
│      ├── RESPONSE INTERCEPTOR                                              │
│      │   • Logs: [Response] { status: 401, duration: '150ms' }            │
│      │   • Parses error body                                               │
│      │   • Throws: new ApiError('Invalid email or password', 401,         │
│      │                          'INVALID_CREDENTIALS')                     │
│      │                                                                      │
│      ▼                                                                      │
│   5. MutationCache.onError is called                                       │
│      │                                                                      │
│      ├── GLOBAL ERROR HANDLER                                              │
│      │   • Logs: [API Error] { error: ApiError, mutationKey: [...] }      │
│      │   • 401 handling (but we don't redirect for login page)            │
│      │                                                                      │
│      ▼                                                                      │
│   6. loginMutation.isError = true                                          │
│      loginMutation.error = ApiError { status: 401, code: 'INVALID_...' }  │
│      │                                                                      │
│      ▼                                                                      │
│   7. Component re-renders, shows error message                             │
│      "Invalid email or password"                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Common Use Cases

### 1. Fetching User Data with Auto-Retry

```typescript
// This query will:
// - Retry 3 times on 5xx errors (server errors)
// - NOT retry on 4xx errors (client errors like 401, 403)
// - Show loading state automatically
// - Cache results for 1 minute

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => apiFetch<User>(`/api/users/${userId}`),
  })

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return <div>{user.name}</div>
}
```

### 2. Creating Resources with Optimistic Updates

```typescript
function CreatePost() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationKey: ['posts', 'create'],
    mutationFn: (newPost: CreatePostInput) =>
      apiFetch<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(newPost),
      }),

    // Optimistic update
    onMutate: async (newPost) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })

      const previousPosts = queryClient.getQueryData<Post[]>(['posts'])

      queryClient.setQueryData<Post[]>(['posts'], (old) => [
        ...(old ?? []),
        { ...newPost, id: 'temp-id', createdAt: new Date().toISOString() },
      ])

      return { previousPosts }
    },

    // Rollback on error
    onError: (_error, _newPost, context) => {
      queryClient.setQueryData(['posts'], context?.previousPosts)
    },

    // Refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  // ... form handling
}
```

### 3. File Upload with Progress

```typescript
// For file uploads, you might need a custom fetch without apiFetch
// since file uploads need FormData and progress tracking

async function uploadFile(file: File, onProgress: (percent: number) => void) {
  return new Promise<{ url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new ApiError('Upload failed', xhr.status))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new ApiError('Network error', 0))
    })

    const formData = new FormData()
    formData.append('file', file)

    xhr.open('POST', '/api/upload')
    xhr.send(formData)
  })
}
```

### 4. Dependent Queries (Waterfall Pattern)

```typescript
// First fetch config, then fetch data that depends on config
function Dashboard() {
  // First query: Get configuration
  const configQuery = useQuery({
    queryKey: ['dashboard', 'config'],
    queryFn: () => apiFetch<DashboardConfig>('/api/dashboard/config'),
  })

  // Second query: Get data using config (only runs when config is available)
  const dataQuery = useQuery({
    queryKey: ['dashboard', 'data', configQuery.data?.dataSourceId],
    queryFn: () =>
      apiFetch<DashboardData>(`/api/data/${configQuery.data!.dataSourceId}`),
    enabled: !!configQuery.data?.dataSourceId, // Only run when we have the ID
  })

  // Both errors will be caught by global handler
  // But you can also handle them locally:
  if (configQuery.error) {
    return <div>Failed to load configuration</div>
  }

  if (dataQuery.error) {
    return <div>Failed to load data</div>
  }

  // ...
}
```

### 5. Polling for Real-Time Updates

```typescript
function LiveOrderStatus({ orderId }: { orderId: string }) {
  const { data: order } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch<Order>(`/api/orders/${orderId}`),
    refetchInterval: (query) => {
      // Poll every 5 seconds if order is pending
      // Stop polling when order is complete
      if (query.state.data?.status === 'complete') {
        return false
      }
      return 5000
    },
  })

  return <OrderStatusDisplay order={order} />
}
```

---

## Storing User Data (TanStack Query + Zustand)

After login, user data needs to be accessible throughout the app. We use a **hybrid approach** combining TanStack Query (server state) with Zustand (client state).

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTH STATE ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LOGIN SUCCESS                                                             │
│         │                                                                   │
│         ├──────────────────────┬──────────────────────┐                    │
│         ▼                      ▼                      ▼                    │
│   TanStack Query          Zustand Store         localStorage               │
│   (Server State)         (Client State)         (Token Storage)            │
│                                                                             │
│   queryClient.setData     setUser(user, token)   authToken                 │
│   - Auto refetch          - Synchronous access   - Used by apiFetch        │
│   - Cache invalidation    - Outside React        - Persists across tabs    │
│   - Loading/error states  - User preferences                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Files

| File | Purpose |
|------|---------|
| `src/stores/authStore.ts` | Zustand store for synchronous user access |
| `src/hooks/useAuth.ts` | Hooks that sync both stores on login/logout |

### When to Use Each Approach

| Need | Use | Import |
|------|-----|--------|
| Component with loading state | `useSession()` | `@/hooks/useAuth` |
| Quick synchronous access | `useCurrentUser()` | `@/stores/authStore` |
| User's display name | `useUserName()` | `@/stores/authStore` |
| User's role for permissions | `useUserRole()` | `@/stores/authStore` |
| Outside React (interceptors) | `getCurrentUser()` | `@/stores/authStore` |
| User preferences | `useUserPreferences()` | `@/stores/authStore` |

### Usage Examples

```typescript
// ============================================================
// OPTION 1: TanStack Query (with loading/error states)
// ============================================================
import { useSession } from '@/hooks/useAuth'

function UserProfile() {
  const { data: user, isLoading, error } = useSession()

  if (isLoading) return <Spinner />
  if (error) return <Error error={error} />
  if (!user) return <LoginPrompt />

  return <div>Welcome, {user.name}!</div>
}

// ============================================================
// OPTION 2: Zustand (synchronous, no loading state)
// ============================================================
import { useCurrentUser, useUserName, useUserRole } from '@/stores/authStore'

function Header() {
  const user = useCurrentUser()       // Full user object or null
  const name = useUserName()          // "Demo User" or null
  const role = useUserRole()          // "admin" | "user" | null

  return (
    <header>
      {name && <span>Hello, {name}</span>}
      {role === 'admin' && <AdminBadge />}
    </header>
  )
}

// ============================================================
// OPTION 3: Outside React (API interceptors, utilities)
// ============================================================
import { getCurrentUser, isAuthenticated, getAuthToken } from '@/stores/authStore'

// In an API interceptor or utility function
function addCustomHeaders(headers: Headers) {
  const user = getCurrentUser()

  if (user?.role === 'admin') {
    headers.set('X-Admin-Access', 'true')
  }

  return headers
}

// Check auth synchronously
if (isAuthenticated()) {
  const token = getAuthToken()
  // Use token...
}
```

### How Login Syncs Both Stores

```typescript
// src/hooks/useAuth.ts - useLogin hook

export function useLogin() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),

    onSuccess: (data) => {
      // 1. Update TanStack Query cache (for useSession hook)
      queryClient.setQueryData<User>(authKeys.session(), data.user)

      // 2. Update Zustand store (for synchronous access)
      setUser(data.user, data.token)

      // 3. Token is stored in localStorage by authApi.login()
    },
  })
}
```

### Zustand Store Features

The `authStore` provides:

```typescript
// State
user: User | null              // Current user
isAuthenticated: boolean       // Quick auth check
token: string | null           // JWT token
preferences: {                 // User preferences (persisted)
  rememberMe: boolean
  defaultView: string
}

// Actions
setUser(user, token)           // Called on login
clearUser()                    // Called on logout
updateUser(updates)            // Partial user updates
setPreference(key, value)      // Update preferences

// Selector Hooks (optimized re-renders)
useCurrentUser()               // Full user object
useUserName()                  // Just the name
useUserRole()                  // Just the role
useIsLoggedIn()                // Boolean auth check
useUserPreferences()           // Preferences object

// Outside React
getCurrentUser()               // Sync access to user
isAuthenticated()              // Sync auth check
getAuthToken()                 // Sync token access
```

### Why Both TanStack Query AND Zustand?

| TanStack Query | Zustand |
|----------------|---------|
| Ideal for **server state** (data from APIs) | Ideal for **client state** (UI preferences) |
| Handles refetching, cache invalidation | Synchronous, no async overhead |
| Provides loading/error states | Available outside React components |
| Can check if session expired via refetch | Persists preferences across sessions |

**Together they provide:**
- `useSession()` for components that need loading states
- `useCurrentUser()` for components that just need the user
- `getCurrentUser()` for non-React code (interceptors, utilities)

---

## Error Handling Patterns

### Pattern 1: Global Only (Recommended for Most Cases)

Let the global handler deal with all errors. Component just shows loading/error states:

```typescript
function UserList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/api/users'),
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorFallback /> // Generic error UI

  return <ul>{data.map(user => <li key={user.id}>{user.name}</li>)}</ul>
}
```

### Pattern 2: Global + Local Handling

Global handles logging/toasts, local handles UI-specific logic:

```typescript
function DeleteUserButton({ userId }: { userId: string }) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Local: close dialog, show success message
      setShowConfirmDialog(false)
    },
    // onError not needed - global handler logs and shows toast
  })

  return (
    <>
      <button onClick={() => setShowConfirmDialog(true)}>Delete</button>
      {showConfirmDialog && (
        <ConfirmDialog
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowConfirmDialog(false)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
```

### Pattern 3: Override Global for Specific Cases

Sometimes you want to handle an error differently than the global handler:

```typescript
function SearchUsers() {
  const [query, setQuery] = useState('')

  const searchQuery = useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => apiFetch<User[]>(`/api/users/search?q=${query}`),
    enabled: query.length >= 2,

    // Prevent global error handler for 404 (no results)
    // by catching and returning empty array
    queryFn: async () => {
      try {
        return await apiFetch<User[]>(`/api/users/search?q=${query}`)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return [] // Treat "not found" as empty results
        }
        throw error // Re-throw other errors for global handling
      }
    },
  })

  // No error state needed - 404 returns empty array
  if (searchQuery.isLoading) return <Spinner />

  return (
    <div>
      {searchQuery.data?.length === 0
        ? 'No users found'
        : searchQuery.data?.map(user => <UserCard key={user.id} user={user} />)
      }
    </div>
  )
}
```

---

## Best Practices

### 1. Always Use apiFetch for API Calls

```typescript
// ✅ Good - uses apiFetch, errors are handled globally
useQuery({
  queryKey: ['users'],
  queryFn: () => apiFetch<User[]>('/api/users'),
})

// ❌ Bad - bypasses interceptors
useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json()),
})
```

### 2. Use Mutation Keys for Better Debugging

```typescript
// ✅ Good - mutation key helps identify errors in logs
useMutation({
  mutationKey: ['users', 'create'],
  mutationFn: (user) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(user) }),
})

// ❌ Less helpful - no mutation key in error logs
useMutation({
  mutationFn: (user) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(user) }),
})
```

### 3. Don't Retry Mutations

Mutations might have side effects, so retrying could cause duplicates:

```typescript
// Already configured in queryClient:
mutations: {
  retry: false, // Don't retry mutations by default
}
```

### 4. Check for ApiError Instance

```typescript
// ✅ Good - type-safe error checking
if (error instanceof ApiError) {
  if (error.status === 401) {
    // Handle auth error
  }
}

// ❌ Risky - error might not have these properties
if (error.status === 401) {
  // TypeScript error or runtime error
}
```

### 5. Add Auth Token in apiFetch (When Ready)

Uncomment the auth token section in `apiFetch` when you implement authentication:

```typescript
// In src/lib/queryClient.ts - apiFetch function

// Add auth token if available
const token = localStorage.getItem('authToken')
if (token) {
  headers.set('Authorization', `Bearer ${token}`)
}
```

---

## Summary

### File Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── errors.ts      # ApiError, NetworkError, TimeoutError, ValidationError
│   │   ├── client.ts      # apiFetch, api convenience methods, interceptors
│   │   └── index.ts       # Barrel export (public API)
│   └── queryClient.ts     # QueryClient, QueryCache, MutationCache, queryKeys
├── stores/
│   ├── appStore.ts        # UI state (sidebar, theme, toasts)
│   └── authStore.ts       # Auth state (user, token, preferences)
├── hooks/
│   └── useAuth.ts         # Auth hooks (useLogin, useLogout, useSession)
├── api/
│   └── auth.ts            # Auth API functions
├── types/
│   └── auth.ts            # Auth type definitions
└── mocks/handlers/
    └── auth.ts            # MSW mock handlers for auth
```

### Exports by File

| File | Exports | Purpose |
|------|---------|---------|
| `@/lib/api` | `ApiError`, `NetworkError`, `TimeoutError`, `ValidationError` | Error classes |
| `@/lib/api` | `isApiError`, `isNetworkError`, `getErrorMessage` | Type guards & utilities |
| `@/lib/api` | `apiFetch`, `api`, `addRequestInterceptor`, `addResponseInterceptor` | HTTP client |
| `@/lib/queryClient` | `queryClient`, `queryKeys` | TanStack Query configuration |
| `@/stores/authStore` | `useCurrentUser`, `useUserName`, `useUserRole`, `useIsLoggedIn` | User state selectors |
| `@/stores/authStore` | `getCurrentUser`, `isAuthenticated`, `getAuthToken` | Sync access (outside React) |
| `@/hooks/useAuth` | `useLogin`, `useLogout`, `useSession` | Auth mutations & queries |
| `@/api/auth` | `authApi` | Auth API functions |

### Import Cheatsheet

```typescript
// API & Error handling
import { api, ApiError, isApiError } from '@/lib/api'
import { queryClient, queryKeys } from '@/lib/queryClient'

// Auth hooks (with loading states)
import { useLogin, useLogout, useSession } from '@/hooks/useAuth'

// Auth state (synchronous access)
import { useCurrentUser, useUserName, useUserRole } from '@/stores/authStore'

// Auth outside React
import { getCurrentUser, isAuthenticated, getAuthToken } from '@/stores/authStore'

// Auth API directly
import { authApi } from '@/api/auth'
```

### Quick Reference: Accessing User Data

```typescript
// In components - with loading state
const { data: user, isLoading } = useSession()

// In components - synchronous
const user = useCurrentUser()
const name = useUserName()
const role = useUserRole()

// Outside React
const user = getCurrentUser()
if (isAuthenticated()) { /* ... */ }
```

This architecture provides:
- **Separation of concerns** - HTTP client separate from query configuration
- **Centralized error handling** - One place to handle all API errors
- **Consistent logging** - All requests/responses are logged (in development)
- **Request tracing** - X-Request-ID for debugging
- **Smart retries** - Don't retry client errors (4xx)
- **Type safety** - Error classes with type guards
- **Timeout handling** - Configurable request timeouts
- **Network error detection** - Distinguish between API errors and network failures
- **Hybrid auth state** - TanStack Query for server state, Zustand for client state
- **Synchronous user access** - Available inside and outside React components
