# 07 - Test Setup Guide

A comprehensive guide for setting up Vitest with React Testing Library and MSW for this project.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Install Dependencies](#2-install-dependencies)
3. [Vitest Configuration](#3-vitest-configuration)
4. [Test Setup File](#4-test-setup-file)
5. [MSW Setup for Testing](#5-msw-setup-for-testing)
6. [MSW Setup for Development](#6-msw-setup-for-development)
7. [Environment Separation](#7-environment-separation)
8. [Writing Tests](#8-writing-tests)
9. [Running Tests](#9-running-tests)
10. [Best Practices](#10-best-practices)

---

## 1. Overview

This guide sets up:

| Tool                          | Purpose                               |
| ----------------------------- | ------------------------------------- |
| **Vitest**                    | Fast, Vite-native test runner         |
| **React Testing Library**     | Component testing utilities           |
| **MSW (Mock Service Worker)** | API mocking for tests and development |
| **jsdom**                     | DOM environment for component tests   |

### Environment Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                        MSW Handlers                             │
│                    (src/mocks/handlers.ts)                      │
│                         SHARED                                  │
└─────────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
┌─────────────────────────────┐ ┌─────────────────────────────────┐
│      DEVELOPMENT            │ │           TESTS                 │
│   (Browser Environment)     │ │    (Node.js Environment)        │
├─────────────────────────────┤ ├─────────────────────────────────┤
│ src/mocks/browser.ts        │ │ src/mocks/server.ts             │
│ setupWorker()               │ │ setupServer()                   │
│ Service Worker intercepts   │ │ Node.js intercepts              │
│ Only when VITE_USE_MOCKS=   │ │ Always active in tests          │
│   true                      │ │                                 │
└─────────────────────────────┘ └─────────────────────────────────┘
                    │                       │
                    ▼                       ▼
┌─────────────────────────────┐ ┌─────────────────────────────────┐
│      PRODUCTION             │ │                                 │
├─────────────────────────────┤ │   MSW NOT included in bundle    │
│ MSW is NOT started          │ │   (tree-shaken out)             │
│ Real API calls go through   │ │                                 │
└─────────────────────────────┘ └─────────────────────────────────┘
```

---

## 2. Install Dependencies

```bash
# Testing framework
npm install -D vitest

# React Testing Library
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# DOM environment for tests
npm install -D jsdom

# MSW for API mocking
npm install -D msw
```

Or all at once:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

---

## 3. Vitest Configuration

### Single File vs Separate Files

You have two options for configuring Vitest:

| Approach                        | When to Use                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| **Single `vite.config.ts`**     | Most projects. Simpler setup, all config in one place.                                     |
| **Separate `vitest.config.ts`** | When you need different plugins for testing vs building, or prefer separation of concerns. |

---

### Option 1: Single `vite.config.ts` (Recommended)

Add the `test` configuration directly to your existing Vite config:

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config' // Use vitest's defineConfig
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vitest configuration
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'src/mocks/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/routeTree.gen.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
```

**Why this works:** Vitest's `defineConfig` is a superset of Vite's `defineConfig`. It accepts all Vite options plus the `test` property.

---

### Option 2: Separate `vitest.config.ts`

Use this when you need different configurations for building vs testing:

```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          'src/mocks/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/routeTree.gen.ts',
        ],
      },
    },
  })
)
```

**When to use separate files:**

- You have test-specific plugins that shouldn't run during build
- Your Vite config is complex and you want to keep it focused on building
- Your team prefers clear separation of concerns
- You need to override Vite plugins specifically for tests

---

### Update `tsconfig.json`

Add Vitest types for global test APIs:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

**Why is this needed?**

Since we configured `globals: true` in our Vitest config, test functions like `describe`, `it`, `expect`, `beforeEach`, etc. are available globally without needing to import them. However, TypeScript doesn't recognize these global types by default, which would cause errors like "Cannot find name 'describe'" or "Cannot find name 'expect'".

Adding these types tells TypeScript to:
- **vitest/globals** - Recognize Vitest's global test APIs (`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`, etc.)
- **@testing-library/jest-dom** - Recognize custom DOM matchers like `.toBeInTheDocument()`, `.toHaveClass()`, `.toBeVisible()`, etc.

---

## 4. Test Setup File

Create the test setup file that runs before each test:

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from '../mocks/server'

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  })
})

// Reset handlers after each test (important for test isolation)
afterEach(() => {
  server.resetHandlers()
  cleanup() // Clean up React Testing Library
})

// Clean up after all tests
afterAll(() => {
  server.close()
})
```

---

## 5. MSW Setup for Testing

### Directory Structure

```
src/
├── mocks/
│   ├── handlers/
│   │   ├── index.ts           # Export all handlers
│   │   └── trades.ts          # Trade-related handlers
│   ├── data/
│   │   └── trades.ts          # Mock data
│   ├── handlers.ts            # Combined handlers (shared)
│   ├── server.ts              # Node.js setup (tests)
│   └── browser.ts             # Browser setup (development)
├── test/
│   └── setup.ts               # Vitest setup file
```

### Mock Data

```typescript
// src/mocks/data/trades.ts
export const mockTrades = [
  {
    id: '1',
    symbol: 'AAPL',
    quantity: 100,
    price: 150.25,
    side: 'BUY',
    timestamp: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    symbol: 'GOOGL',
    quantity: 50,
    price: 2750.5,
    side: 'SELL',
    timestamp: '2024-01-15T11:45:00Z',
  },
  // Add more mock data as needed
]

export const mockTradesSummary = {
  totalTrades: 150,
  totalVolume: 1250000,
  averagePrice: 425.75,
}
```

### Handlers

```typescript
// src/mocks/handlers/trades.ts
import { http, HttpResponse, delay } from 'msw'
import { mockTrades, mockTradesSummary } from '../data/trades'

export const tradeHandlers = [
  // GET /api/trades - List trades with pagination
  http.get('/api/trades', async ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')

    // Simulate network delay (optional, useful for loading states)
    await delay(100)

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedTrades = mockTrades.slice(start, end)

    return HttpResponse.json({
      data: paginatedTrades,
      total: mockTrades.length,
      page,
      pageSize,
    })
  }),

  // GET /api/trades/:id - Get single trade
  http.get('/api/trades/:id', async ({ params }) => {
    const { id } = params
    const trade = mockTrades.find((t) => t.id === id)

    if (!trade) {
      return HttpResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return HttpResponse.json(trade)
  }),

  // GET /api/trades/summary - Get trades summary
  http.get('/api/trades/summary', () => {
    return HttpResponse.json(mockTradesSummary)
  }),

  // POST /api/trades - Create trade
  http.post('/api/trades', async ({ request }) => {
    const newTrade = await request.json()

    return HttpResponse.json({ id: crypto.randomUUID(), ...newTrade }, { status: 201 })
  }),
]
```

### Combined Handlers

```typescript
// src/mocks/handlers.ts
import { tradeHandlers } from './handlers/trades'
// Import other handlers as needed
// import { userHandlers } from './handlers/users'

export const handlers = [
  ...tradeHandlers,
  // ...userHandlers,
]
```

### Server Setup (Tests)

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Create the server instance with handlers
export const server = setupServer(...handlers)
```

---

## 6. MSW Setup for Development

### Browser Worker Setup

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Create the browser worker with the same handlers
export const worker = setupWorker(...handlers)
```

### Initialize MSW in Development

Update your main entry file to conditionally start MSW:

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function enableMocking() {
  // Only enable MSW in development when explicitly requested
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')

    return worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
  }

  return Promise.resolve()
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
```

**Why this pattern?**

| Code | Purpose |
|------|---------|
| `import.meta.env.DEV` | Only run in development mode (Vite removes this in production) |
| `import.meta.env.VITE_USE_MOCKS === 'true'` | Opt-in mocking via environment variable |
| `await import('./mocks/browser')` | Dynamic import - only loads MSW code when needed |
| `enableMocking().then(...)` | Wait for service worker to register before rendering |

**Why dynamic import is critical:**

```typescript
// ❌ BAD: Static import - MSW is always bundled
import { worker } from './mocks/browser'

// ✅ GOOD: Dynamic import - MSW is tree-shaken in production
const { worker } = await import('./mocks/browser')
```

With dynamic import inside the `if (import.meta.env.DEV)` check, Vite completely removes the MSW code from production builds.

**Verify MSW is working:**

When MSW starts successfully, you'll see this in the browser console:

```
[MSW] Mocking enabled.
```

If you don't see this message, check:
1. `VITE_USE_MOCKS=true` is set in `.env.development`
2. `mockServiceWorker.js` exists in `public/`
3. No console errors during service worker registration

### Generate MSW Service Worker

Run this command to generate the service worker file:

```bash
npx msw init public/ --save
```

This creates `public/mockServiceWorker.js`.

**What does this command do?**

1. **Creates `mockServiceWorker.js`** - A pre-built service worker script that MSW uses to intercept network requests in the browser
2. **Adds to `package.json`** - The `--save` flag adds an `msw.workerDirectory` entry to track where the worker is located
3. **Required for browser mocking** - Without this file, MSW cannot intercept requests in development mode

**Why a Service Worker?**

```
┌─────────────────────────────────────────────────────────────────┐
│                   Browser with MSW                              │
│                                                                 │
│   Your React App                                                │
│       │                                                         │
│       │ fetch('/api/trades')                                    │
│       ▼                                                         │
│   ┌─────────────────────┐                                       │
│   │   Service Worker    │  ◄── mockServiceWorker.js             │
│   │   (MSW intercepts)  │                                       │
│   └──────────┬──────────┘                                       │
│              │                                                  │
│       ┌──────┴──────┐                                           │
│       ▼             ▼                                           │
│   Handler found?  No handler?                                   │
│       │             │                                           │
│       ▼             ▼                                           │
│   Return mock    Pass through                                   │
│   response       to real server                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** This file should be committed to git. It's a static file that doesn't change often.

### Environment Variables

Create `.env` files:

```bash
# .env.development
VITE_USE_MOCKS=true

# .env.development.local (optional, for when you want real APIs in dev)
VITE_USE_MOCKS=false

# .env.production
# VITE_USE_MOCKS is not set, MSW won't be included
```

**Why use environment variables?**

| Scenario | `VITE_USE_MOCKS` | What Happens |
|----------|------------------|--------------|
| Backend not ready | `true` | Use mock data to build UI |
| Backend ready, testing integration | `false` | Call real APIs |
| Production | Not set | MSW code is tree-shaken out |

**File priority (Vite loads in this order):**

```
.env                    # Loaded in all cases
.env.local              # Loaded in all cases, ignored by git
.env.[mode]             # Only loaded in specified mode (development/production)
.env.[mode].local       # Only loaded in specified mode, ignored by git
```

**Tip:** Use `.env.development.local` (gitignored) to override mocking behavior locally without affecting teammates.

---

## 7. Environment Separation

### How It Works

| Environment           | `VITE_USE_MOCKS` | MSW Active?              | API Calls Go To |
| --------------------- | ---------------- | ------------------------ | --------------- |
| **Tests**             | N/A              | Always (via `server.ts`) | Mock handlers   |
| **Dev with mocks**    | `true`           | Yes (via `browser.ts`)   | Mock handlers   |
| **Dev without mocks** | `false`          | No                       | Real backend    |
| **Production**        | Not set          | No                       | Real backend    |

### Production Safety

MSW is **never included in the production build** because:

1. Dynamic imports are used (`await import('./mocks/browser')`)
2. The import is inside an `if (import.meta.env.DEV)` block
3. Vite tree-shakes this code out during production builds

### Verifying Production Build

```bash
# Build for production
npm run build

# Check bundle - MSW should NOT be present
grep -r "msw" dist/
# Should return nothing

# Or check bundle size
npx vite-bundle-visualizer
```

---

## 8. Writing Tests

### Test File Structure

```
src/
├── components/
│   ├── TradeList.tsx
│   └── TradeList.test.tsx      # Co-located test
├── pages/
│   └── app/
│       └── trade-activity/
│           └── summary/
│               ├── SummaryPage.tsx
│               └── SummaryPage.test.tsx
```

### Example Component Test

```typescript
// src/components/TradeList.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { TradeList } from './TradeList'

describe('TradeList', () => {
  it('renders loading state initially', () => {
    render(<TradeList />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders trades after loading', async () => {
    render(<TradeList />)

    // Wait for trades to load (MSW will intercept the API call)
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    expect(screen.getByText('GOOGL')).toBeInTheDocument()
  })

  it('handles empty state', async () => {
    // Override handler for this specific test
    const { server } = await import('../mocks/server')
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get('/api/trades', () => {
        return HttpResponse.json({ data: [], total: 0 })
      })
    )

    render(<TradeList />)

    await waitFor(() => {
      expect(screen.getByText(/no trades found/i)).toBeInTheDocument()
    })
  })
})
```

### Testing Error States

```typescript
// src/components/TradeList.test.tsx
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

describe('TradeList - Error Handling', () => {
  it('shows error message on API failure', async () => {
    // Override handler to return error
    server.use(
      http.get('/api/trades', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        )
      })
    )

    render(<TradeList />)

    await waitFor(() => {
      expect(screen.getByText(/error loading trades/i)).toBeInTheDocument()
    })
  })

  it('shows network error message', async () => {
    server.use(
      http.get('/api/trades', () => {
        return HttpResponse.error() // Simulate network error
      })
    )

    render(<TradeList />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })
})
```

### Testing with TanStack Query

If using TanStack Query, wrap components with QueryClientProvider:

```typescript
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        gcTime: 0,    // Disable garbage collection
      },
    },
  })
}

interface WrapperProps {
  children: ReactNode
}

function AllTheProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render function
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
```

Use in tests:

```typescript
// Use custom render instead of @testing-library/react
import { render, screen, waitFor } from '../test/utils'

describe('TradeList', () => {
  it('renders trades', async () => {
    render(<TradeList />)
    // ...
  })
})
```

---

## 9. Running Tests

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Commands

```bash
# Watch mode (re-runs on file changes)
npm test

# Run once and exit
npm run test:run

# With UI (interactive browser interface)
npm run test:ui

# With coverage report
npm run test:coverage
```

---

## 10. Best Practices

### Handler Organization

```typescript
// Keep handlers modular and organized by feature
src/mocks/
├── handlers/
│   ├── index.ts       # Combines all handlers
│   ├── trades.ts      # Trade endpoints
│   ├── users.ts       # User endpoints
│   └── auth.ts        # Auth endpoints
├── data/
│   ├── trades.ts      # Trade mock data
│   └── users.ts       # User mock data
```

### Test Isolation

```typescript
// Each test should be independent
// The setup file already handles this:
afterEach(() => {
  server.resetHandlers() // Reset to default handlers
  cleanup() // Clean up rendered components
})
```

### Per-Test Handler Overrides

```typescript
// Only affects the current test, resets automatically after
server.use(
  http.get('/api/trades', () => {
    return HttpResponse.json({ data: [] })
  })
)
```

### Delay for Loading States

```typescript
// Test loading states with delay
server.use(
  http.get('/api/trades', async () => {
    await delay(100) // Short delay for tests
    return HttpResponse.json({ data: mockTrades })
  })
)
```

### Gradual Migration to Real APIs

When backend endpoints become available:

```typescript
// src/mocks/handlers.ts
import { http, passthrough } from 'msw'

export const handlers = [
  // Real API is ready - pass through
  http.get('/api/users', () => passthrough()),

  // Still mocking trades
  ...tradeHandlers,
]
```

Or use environment-based selection:

```typescript
// src/mocks/handlers.ts
const shouldMockTrades = import.meta.env.VITE_MOCK_TRADES !== 'false'

export const handlers = [
  ...(shouldMockTrades ? tradeHandlers : []),
  ...userHandlers, // Always mock users
]
```

---

## Summary

| Concern                      | Solution                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| **Test isolation**           | `server.resetHandlers()` after each test                       |
| **Dev mocking**              | Environment variable `VITE_USE_MOCKS=true`                     |
| **Production safety**        | Dynamic imports inside `import.meta.env.DEV` check             |
| **Shared handlers**          | Single `handlers.ts` used by both `server.ts` and `browser.ts` |
| **Per-test overrides**       | `server.use()` for test-specific responses                     |
| **Real API migration**       | Remove handlers or use `passthrough()`                         |
| **Service worker conflicts** | MSW only in dev, your SW only in prod                          |

### File Checklist

After setup, you should have:

- [ ] `vitest.config.ts` - Vitest configuration
- [ ] `src/test/setup.ts` - Test setup with MSW
- [ ] `src/test/utils.tsx` - Custom render with providers
- [ ] `src/mocks/handlers.ts` - Combined handlers
- [ ] `src/mocks/server.ts` - Node.js MSW setup (tests)
- [ ] `src/mocks/browser.ts` - Browser MSW setup (dev)
- [ ] `src/mocks/handlers/*.ts` - Handler modules
- [ ] `src/mocks/data/*.ts` - Mock data
- [ ] `public/mockServiceWorker.js` - Generated service worker
- [ ] `.env.development` - With `VITE_USE_MOCKS=true`
