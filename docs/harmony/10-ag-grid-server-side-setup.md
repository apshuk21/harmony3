# AG Grid Server-Side Row Model Setup Guide

A comprehensive guide explaining how to set up AG Grid with Server-Side Row Model in a React + Vite + TypeScript project, using MSW for API mocking.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Step 1: Install AG Grid Packages](#step-1-install-ag-grid-packages)
5. [Step 2: Create Mock Data](#step-2-create-mock-data)
6. [Step 3: Create MSW Handlers](#step-3-create-msw-handlers)
7. [Step 4: Register Handlers](#step-4-register-handlers)
8. [Step 4.5: Initialize MSW in Your Application](#step-45-initialize-msw-in-your-application) ⭐ Critical Step
9. [Step 5: Create Reusable Grid Component](#step-5-create-reusable-grid-component)
10. [Step 6: Use the Grid in Components](#step-6-use-the-grid-in-components)
11. [Server-Side Row Model Explained](#server-side-row-model-explained)
12. [API Contract](#api-contract)
13. [Common Customizations](#common-customizations)
14. [Troubleshooting](#troubleshooting)

---

## 1. Overview

This guide covers setting up two AG Grid instances:
- **FX Cash Tab** - Displays FX Cash trade data
- **FX Options Tab** - Displays FX Options trade data with Greeks

Both grids use the **Server-Side Row Model** which is ideal for:
- Large datasets (thousands to millions of rows)
- Server-side sorting, filtering, and pagination
- Reducing client memory usage
- Real-time data updates

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION ARCHITECTURE                             │
│                                                                             │
│   ┌─────────────────┐        ┌─────────────────┐        ┌───────────────┐  │
│   │   React Tab     │        │   ServerSideGrid │        │   MSW Handler │  │
│   │   Component     │───────▶│   (Reusable)     │───────▶│   (Mock API)  │  │
│   │                 │        │                  │        │               │  │
│   │ - FxCashTab     │        │ - AG Grid React  │        │ - Sorting     │  │
│   │ - FxOptionsTab  │        │ - Server-Side    │        │ - Filtering   │  │
│   │                 │        │   Row Model      │        │ - Pagination  │  │
│   └─────────────────┘        └─────────────────┘        └───────────────┘  │
│           │                          │                          │           │
│           │                          │                          │           │
│           ▼                          ▼                          ▼           │
│   ┌─────────────────┐        ┌─────────────────┐        ┌───────────────┐  │
│   │ Column Defs     │        │ Datasource      │        │ Mock Data     │  │
│   │ (Per Tab)       │        │ (fetch API)     │        │ (100 records) │  │
│   └─────────────────┘        └─────────────────┘        └───────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prerequisites

Before starting, ensure you have:

- React 18+ project with TypeScript
- Vite as build tool
- MSW (Mock Service Worker) set up for API mocking
- Path aliases configured (`@/` pointing to `src/`)

Reference: [07-test-setup-guide.md](./07-test-setup-guide.md) for MSW setup.

---

## Step 1: Install AG Grid Packages

AG Grid requires three packages for React with Server-Side Row Model:

```bash
npm install ag-grid-community ag-grid-enterprise ag-grid-react
```

| Package | Purpose |
|---------|---------|
| `ag-grid-community` | Core grid functionality (sorting, filtering, pagination) |
| `ag-grid-enterprise` | Advanced features including **Server-Side Row Model** |
| `ag-grid-react` | React wrapper component |

**Why Enterprise?**

The Server-Side Row Model is an Enterprise-only feature. It enables:
- Lazy loading of data from server
- Server-side sorting and filtering
- Infinite scrolling or pagination
- Reduced memory footprint for large datasets

```json
// package.json
{
  "dependencies": {
    "ag-grid-community": "^35.0.0",
    "ag-grid-enterprise": "^35.0.0",
    "ag-grid-react": "^35.0.0"
  }
}
```

---

## Step 2: Create Mock Data

Create TypeScript interfaces and mock data generators for each data type.

### FX Cash Mock Data

**File:** `src/mocks/data/fx-cash.ts`

```typescript
/**
 * Mock FX Cash Trade Data
 */

export interface FxCashTrade {
  id: string
  tradeId: string
  currencyPair: string
  buyCurrency: string
  sellCurrency: string
  buyAmount: number
  sellAmount: number
  rate: number
  valueDate: string
  tradeDate: string
  counterparty: string
  status: 'Completed' | 'Pending' | 'Settled' | 'Cancelled'
  trader: string
  desk: string
}

// Generate 100 mock trades
function generateFxCashTrades(): FxCashTrade[] {
  const currencyPairs = [
    { pair: 'USD/EUR', buy: 'USD', sell: 'EUR' },
    { pair: 'GBP/USD', buy: 'GBP', sell: 'USD' },
    // ... more pairs
  ]

  const trades: FxCashTrade[] = []

  for (let i = 1; i <= 100; i++) {
    const currencyData = currencyPairs[Math.floor(Math.random() * currencyPairs.length)]
    const buyAmount = Math.floor(Math.random() * 10000000) + 100000
    const rate = parseFloat((Math.random() * 0.5 + 0.8).toFixed(4))

    trades.push({
      id: `fx-cash-${i}`,
      tradeId: `FXC-${String(i).padStart(6, '0')}`,
      currencyPair: currencyData.pair,
      buyCurrency: currencyData.buy,
      sellCurrency: currencyData.sell,
      buyAmount,
      sellAmount: Math.floor(buyAmount * rate),
      rate,
      // ... other fields
    })
  }

  return trades
}

export const mockFxCashTrades: FxCashTrade[] = generateFxCashTrades()
```

### FX Options Mock Data

**File:** `src/mocks/data/fx-options.ts`

```typescript
/**
 * Mock FX Options Trade Data
 */

export interface FxOptionTrade {
  id: string
  tradeId: string
  currencyPair: string
  optionType: 'Call' | 'Put'
  strikePrice: number
  spotPrice: number
  premium: number
  notionalAmount: number
  expiryDate: string
  tradeDate: string
  counterparty: string
  status: 'Active' | 'Exercised' | 'Expired' | 'Cancelled'
  trader: string
  desk: string
  // Greeks
  delta: number
  gamma: number
  vega: number
  theta: number
}

// Similar generation function...
export const mockFxOptionsTrades: FxOptionTrade[] = generateFxOptionsTrades()
```

**Why Generate 100 Records?**

- Enough data to test pagination (with page sizes of 10, 20, 50)
- Demonstrates server-side filtering across multiple pages
- Shows realistic scrolling behavior
- Not so large that it slows down tests

---

## Step 3: Create MSW Handlers

MSW handlers simulate the server-side processing for the AG Grid Server-Side Row Model.

### Understanding the Request/Response Contract

AG Grid's Server-Side Row Model sends POST requests with this structure:

```typescript
// Request from AG Grid
interface ServerSideRequest {
  startRow: number      // First row to fetch (0-based)
  endRow: number        // Last row to fetch (exclusive)
  sortModel: Array<{
    colId: string       // Column ID being sorted
    sort: 'asc' | 'desc'
  }>
  filterModel: Record<string, {
    filterType: string  // 'text', 'number', 'set'
    type?: string       // 'contains', 'equals', 'greaterThan', etc.
    filter?: string | number
    filterTo?: number   // For 'inRange' type
    values?: string[]   // For 'set' filter
  }>
}

// Response expected by AG Grid
interface ServerSideResponse<T> {
  rowData: T[]          // The actual data rows
  rowCount: number      // Total count after filtering (for pagination)
}
```

### FX Cash Handler

**File:** `src/mocks/handlers/fx-cash.ts`

```typescript
import { http, HttpResponse, delay } from 'msw'
import { mockFxCashTrades } from '../data/fx-cash'
import type { FxCashTrade } from '../data/fx-cash'

/**
 * Apply sorting to data based on AG Grid sort model
 */
function applySorting(data: FxCashTrade[], sortModel: ServerSideRequest['sortModel']) {
  if (!sortModel || sortModel.length === 0) return data

  return [...data].sort((a, b) => {
    for (const sort of sortModel) {
      const colId = sort.colId as keyof FxCashTrade
      const aVal = a[colId]
      const bVal = b[colId]

      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      }

      if (comparison !== 0) {
        return sort.sort === 'asc' ? comparison : -comparison
      }
    }
    return 0
  })
}

/**
 * Apply filtering to data based on AG Grid filter model
 */
function applyFiltering(
  data: FxCashTrade[],
  filterModel: ServerSideRequest['filterModel']
) {
  if (!filterModel || Object.keys(filterModel).length === 0) return data

  return data.filter((row) => {
    for (const [colId, filter] of Object.entries(filterModel)) {
      const value = row[colId as keyof FxCashTrade]

      // Text filter logic
      if (filter.filterType === 'text' && filter.filter) {
        const filterValue = String(filter.filter).toLowerCase()
        const cellValue = String(value).toLowerCase()

        switch (filter.type) {
          case 'contains':
            if (!cellValue.includes(filterValue)) return false
            break
          case 'equals':
            if (cellValue !== filterValue) return false
            break
          // ... other filter types
        }
      }

      // Number filter logic
      if (filter.filterType === 'number' && filter.filter !== undefined) {
        const filterValue = Number(filter.filter)
        const cellValue = Number(value)

        switch (filter.type) {
          case 'greaterThan':
            if (cellValue <= filterValue) return false
            break
          case 'lessThan':
            if (cellValue >= filterValue) return false
            break
          // ... other filter types
        }
      }
    }
    return true
  })
}

export const fxCashHandlers = [
  // POST /api/fx-cash - Server-Side Row Model endpoint
  http.post('/api/fx-cash', async ({ request }) => {
    await delay(150) // Simulate network latency

    const body = await request.json() as ServerSideRequest
    const { startRow, endRow, sortModel, filterModel } = body

    // 1. Apply filtering first
    let filteredData = applyFiltering(mockFxCashTrades, filterModel)

    // 2. Then apply sorting
    filteredData = applySorting(filteredData, sortModel)

    // 3. Get total count after filtering (before pagination)
    const rowCount = filteredData.length

    // 4. Apply pagination
    const rowData = filteredData.slice(startRow, endRow)

    return HttpResponse.json({
      rowData,
      rowCount,
    })
  }),
]
```

**Key Points:**

1. **Order matters**: Filter → Sort → Paginate
2. **Return total count**: `rowCount` tells AG Grid how many pages exist
3. **Simulate delay**: `await delay(150)` makes loading states visible

---

## Step 4: Register Handlers

Add the new handlers to the MSW configuration.

### Update Handler Index

**File:** `src/mocks/handlers/index.ts`

```typescript
export { tradeHandlers } from './trades'
export { fxCashHandlers } from './fx-cash'
export { fxOptionsHandlers } from './fx-options'
```

### Update Combined Handlers

**File:** `src/mocks/handlers.ts`

```typescript
import { tradeHandlers } from './handlers/trades'
import { fxCashHandlers } from './handlers/fx-cash'
import { fxOptionsHandlers } from './handlers/fx-options'

export const handlers = [
  ...tradeHandlers,
  ...fxCashHandlers,
  ...fxOptionsHandlers,
]
```

---

## Step 4.5: Initialize MSW in Your Application

**This step is critical!** Without proper MSW initialization, the grids will be blank and no network requests will be intercepted.

### Why MSW Needs Initialization

MSW works differently in development (browser) vs tests (Node.js):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MSW INITIALIZATION FLOW                                   │
│                                                                             │
│   Development (Browser)                    Tests (Node.js)                  │
│   ─────────────────────                    ────────────────                 │
│                                                                             │
│   1. Browser loads your app                1. Vitest runs                   │
│          │                                        │                         │
│          ▼                                        ▼                         │
│   2. main.tsx executes                     2. setup.ts executes             │
│          │                                        │                         │
│          ▼                                        ▼                         │
│   3. enableMocking() called                3. server.listen() called        │
│          │                                        │                         │
│          ▼                                        ▼                         │
│   4. Service Worker registered             4. Node interceptors active      │
│      (mockServiceWorker.js)                   (no browser needed)           │
│          │                                        │                         │
│          ▼                                        ▼                         │
│   5. worker.start() completes              5. Tests run with mocked APIs    │
│          │                                                                  │
│          ▼                                                                  │
│   6. React app renders                                                      │
│          │                                                                  │
│          ▼                                                                  │
│   7. fetch('/api/fx-cash') → intercepted by Service Worker                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 4.5.1: Generate the Service Worker File

Run this command to create the MSW service worker:

```bash
npx msw init public/ --save
```

**What this command does:**

1. Creates `public/mockServiceWorker.js` - The service worker script that intercepts requests
2. Updates `package.json` with `msw.workerDirectory` entry to track the location
3. This file should be committed to git (it rarely changes)

**Output:**
```
Copying the worker script at "/your-project/public"...
Worker script successfully copied!
Updating "msw.workerDirectory" at "/your-project/package.json"...
```

### Step 4.5.2: Create Environment Variable

**File:** `.env.development`

```bash
# Development Environment Variables
# Reference: docs/harmony/09-environment-variables-guide.md

# Enable MSW mocking for API calls
VITE_USE_MOCKS=true
```

**Why use an environment variable?**

| `VITE_USE_MOCKS` | Behavior |
|------------------|----------|
| `true` | MSW intercepts all matching requests, returns mock data |
| `false` or unset | MSW not loaded, requests go to real API |

This allows developers to toggle mocking without code changes.

### Step 4.5.3: Update main.tsx to Initialize MSW

**File:** `src/main.tsx`

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'

// Create router instance
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/**
 * Enable MSW mocking in development
 * Reference: docs/harmony/07-test-setup-guide.md
 */
async function enableMocking() {
  // Only enable in development AND when VITE_USE_MOCKS is true
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    // Dynamic import - MSW code is tree-shaken in production
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
    })
  }
  return Promise.resolve()
}

// Wait for MSW to initialize BEFORE rendering
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
})
```

### Understanding the Initialization Code

```typescript
// 1. Check conditions
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
```
- `import.meta.env.DEV` - Only true in development (Vite removes this check in production)
- `import.meta.env.VITE_USE_MOCKS === 'true'` - Opt-in via environment variable

```typescript
// 2. Dynamic import
const { worker } = await import('./mocks/browser')
```
- Dynamic `import()` means MSW code is NOT bundled in production
- Vite tree-shakes the entire `./mocks/` directory in production builds

```typescript
// 3. Start the worker
return worker.start({
  onUnhandledRequest: 'bypass',
})
```
- `worker.start()` registers the Service Worker
- `onUnhandledRequest: 'bypass'` - Requests without handlers pass through to real server
- Returns a Promise that resolves when the worker is ready

```typescript
// 4. Wait before rendering
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(...)
})
```
- **Critical:** Must wait for `enableMocking()` to complete
- If you render before MSW is ready, early requests won't be intercepted

### What Happens When MSW Starts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVICE WORKER REGISTRATION                               │
│                                                                             │
│   1. worker.start() called                                                   │
│          │                                                                  │
│          ▼                                                                  │
│   2. Browser fetches /mockServiceWorker.js from public/                     │
│          │                                                                  │
│          ▼                                                                  │
│   3. Service Worker installed and activated                                 │
│          │                                                                  │
│          ▼                                                                  │
│   4. Console shows: "[MSW] Mocking enabled."                                │
│          │                                                                  │
│          ▼                                                                  │
│   5. All subsequent fetch() calls are intercepted                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │   fetch('/api/fx-cash', { method: 'POST', ... })            │          │
│   │          │                                                   │          │
│   │          ▼                                                   │          │
│   │   Service Worker receives request                            │          │
│   │          │                                                   │          │
│   │          ▼                                                   │          │
│   │   MSW matches against handlers                               │          │
│   │          │                                                   │          │
│   │   ┌──────┴──────┐                                            │          │
│   │   ▼             ▼                                            │          │
│   │   Match found   No match                                     │          │
│   │   │             │                                            │          │
│   │   ▼             ▼                                            │          │
│   │   Return mock   Pass to real                                 │          │
│   │   response      server (bypass)                              │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verifying MSW is Working

1. **Check the console** - You should see:
   ```
   [MSW] Mocking enabled.
   ```

2. **Check Network tab** - Requests to `/api/fx-cash` should show:
   - Status: 200
   - Size: shows actual response size
   - The response should contain your mock data

3. **If you don't see "[MSW] Mocking enabled."**, check:
   - `VITE_USE_MOCKS=true` is set in `.env.development`
   - `public/mockServiceWorker.js` exists
   - You restarted the dev server after adding `.env.development`

### Common MSW Initialization Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Grid is blank, no network requests | MSW not initialized | Add `enableMocking()` to main.tsx |
| "[MSW] Mocking enabled." not shown | Missing env variable | Create `.env.development` with `VITE_USE_MOCKS=true` |
| 404 for mockServiceWorker.js | Service worker not generated | Run `npx msw init public/ --save` |
| Requests not intercepted | Rendered before MSW ready | Use `.then()` to wait for `enableMocking()` |
| Console warning about unhandled request | No handler for URL | Add handler or use `onUnhandledRequest: 'bypass'` |

---

## Step 5: Create Reusable Grid Component

Create a generic, reusable AG Grid component that can be configured for different data types.

**File:** `src/components/ui/ServerSideGrid.tsx`

```typescript
import { useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, IServerSideDatasource } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

// Register AG Grid modules (must be done once)
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

export interface ServerSideGridProps<T> {
  /** Column definitions for the grid */
  columnDefs: ColDef<T>[]
  /** API endpoint URL for fetching data */
  fetchUrl: string
  /** Row selection mode */
  rowSelection?: 'single' | 'multiple'
  /** Callback when row selection changes */
  onRowSelected?: (selectedRows: T[]) => void
  /** Number of rows per request */
  cacheBlockSize?: number
  /** Grid height */
  height?: string | number
  /** Row ID getter */
  getRowId?: (data: T) => string
}

export function ServerSideGrid<T extends object>({
  columnDefs,
  fetchUrl,
  rowSelection,
  onRowSelected,
  cacheBlockSize = 100,
  height = '500px',
  getRowId,
}: ServerSideGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)

  // Default column configuration
  const defaultColDef = useMemo<ColDef<T>>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    flex: 1,
  }), [])

  // Create the server-side datasource
  const createDatasource = useCallback((): IServerSideDatasource => {
    return {
      getRows: async (params) => {
        const { startRow, endRow, sortModel, filterModel } = params.request

        try {
          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startRow: startRow ?? 0,
              endRow: endRow ?? cacheBlockSize,
              sortModel: sortModel ?? [],
              filterModel: filterModel ?? {},
            }),
          })

          const data = await response.json()

          params.success({
            rowData: data.rowData,
            rowCount: data.rowCount,
          })
        } catch (error) {
          console.error('Error fetching data:', error)
          params.fail()
        }
      },
    }
  }, [fetchUrl, cacheBlockSize])

  // Handle grid ready event
  const onGridReady = useCallback((params: GridReadyEvent<T>) => {
    const datasource = createDatasource()
    params.api.setGridOption('serverSideDatasource', datasource)
  }, [createDatasource])

  return (
    <div style={{ height, width: '100%' }}>
      <AgGridReact<T>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowModelType="serverSide"
        cacheBlockSize={cacheBlockSize}
        onGridReady={onGridReady}
        pagination={true}
        paginationPageSize={20}
        paginationPageSizeSelector={[10, 20, 50, 100]}
        // ... other props
      />
    </div>
  )
}
```

### Key Props Explained

| Prop | Purpose |
|------|---------|
| `rowModelType="serverSide"` | Enables Server-Side Row Model |
| `cacheBlockSize` | How many rows to fetch per request |
| `pagination` | Enables pagination UI |
| `paginationPageSize` | Default rows per page |
| `paginationPageSizeSelector` | Dropdown options for page size |

### Export the Component

**File:** `src/components/ui/index.ts`

```typescript
export { ServerSideGrid } from './ServerSideGrid'
export type { ServerSideGridProps } from './ServerSideGrid'
```

---

## Step 6: Use the Grid in Components

### FX Cash Tab

**File:** `src/pages/app/trade-activity/block-level/FxCashTab.tsx`

```typescript
import { useMemo, useState } from 'react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { ServerSideGrid } from '@/components/ui'
import type { FxCashTrade } from '@/mocks/data/fx-cash'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function FxCashTab() {
  const [selectedRows, setSelectedRows] = useState<FxCashTrade[]>([])

  const columnDefs = useMemo<ColDef<FxCashTrade>[]>(() => [
    {
      field: 'tradeId',
      headerName: 'Trade ID',
      filter: 'agTextColumnFilter',
    },
    {
      field: 'currencyPair',
      headerName: 'Currency Pair',
      filter: 'agTextColumnFilter',
    },
    {
      field: 'buyAmount',
      headerName: 'Buy Amount',
      filter: 'agNumberColumnFilter',
      valueFormatter: (params: ValueFormatterParams<FxCashTrade, number>) =>
        params.value != null ? formatCurrency(params.value) : '',
    },
    {
      field: 'status',
      headerName: 'Status',
      cellStyle: (params) => ({
        color: {
          Completed: '#22c55e',
          Pending: '#eab308',
          Settled: '#3b82f6',
          Cancelled: '#ef4444',
        }[params.value as string] ?? 'inherit',
        fontWeight: 500,
      }),
    },
    // ... more columns
  ], [])

  return (
    <div className="tab-panel">
      <h3>FX Cash Trades</h3>
      {selectedRows.length > 0 && (
        <p>{selectedRows.length} trade(s) selected</p>
      )}

      <ServerSideGrid<FxCashTrade>
        columnDefs={columnDefs}
        fetchUrl="/api/fx-cash"
        rowSelection="multiple"
        onRowSelected={setSelectedRows}
        height="calc(100vh - 300px)"
        getRowId={(data) => data.id}
      />
    </div>
  )
}
```

### FX Options Tab

**File:** `src/pages/app/trade-activity/block-level/FxOptionsTab.tsx`

Similar structure with additional columns for Greeks (delta, gamma, vega, theta).

---

## Server-Side Row Model Explained

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE ROW MODEL FLOW                                │
│                                                                             │
│   1. User Action (sort/filter/page)                                         │
│          │                                                                  │
│          ▼                                                                  │
│   2. AG Grid builds request                                                 │
│      {                                                                      │
│        startRow: 0,                                                         │
│        endRow: 20,                                                          │
│        sortModel: [{ colId: 'tradeDate', sort: 'desc' }],                  │
│        filterModel: { status: { filterType: 'text', filter: 'Pending' } }  │
│      }                                                                      │
│          │                                                                  │
│          ▼                                                                  │
│   3. Datasource.getRows() called                                            │
│          │                                                                  │
│          ▼                                                                  │
│   4. POST request to /api/fx-cash                                           │
│          │                                                                  │
│          ▼                                                                  │
│   5. Server (MSW) processes:                                                │
│      - Filter data                                                          │
│      - Sort data                                                            │
│      - Slice for pagination                                                 │
│      - Return { rowData, rowCount }                                        │
│          │                                                                  │
│          ▼                                                                  │
│   6. AG Grid renders rows                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### vs Client-Side Row Model

| Feature | Client-Side | Server-Side |
|---------|-------------|-------------|
| Data loaded | All at once | On demand |
| Sorting | In browser | On server |
| Filtering | In browser | On server |
| Memory usage | High for large data | Low |
| Initial load | Slow for large data | Fast |
| Network requests | 1 (all data) | Many (per page/action) |

---

## API Contract

### Request (POST to endpoint)

```typescript
{
  startRow: number,
  endRow: number,
  sortModel: [
    { colId: string, sort: 'asc' | 'desc' }
  ],
  filterModel: {
    [columnId: string]: {
      filterType: 'text' | 'number' | 'set',
      type?: 'contains' | 'equals' | 'greaterThan' | ...,
      filter?: string | number,
      filterTo?: number,
      values?: string[]
    }
  }
}
```

### Response

```typescript
{
  rowData: T[],      // Array of row objects
  rowCount: number   // Total matching rows (for pagination)
}
```

---

## Common Customizations

### Custom Cell Renderers

```typescript
{
  field: 'status',
  cellRenderer: (params) => {
    const color = statusColors[params.value]
    return `<span style="color: ${color}">${params.value}</span>`
  }
}
```

### Value Formatters

```typescript
{
  field: 'amount',
  valueFormatter: (params) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(params.value)
  }
}
```

### Conditional Cell Styling

```typescript
{
  field: 'delta',
  cellStyle: (params) => ({
    color: params.value > 0 ? 'green' : 'red'
  })
}
```

---

## Troubleshooting

### Issue: Grid is completely blank, no data loads

**Symptom:** Grid renders but shows no rows, and Network tab shows no API requests.

**Cause:** MSW is not initialized or not intercepting requests.

**Solution:** Follow the complete MSW initialization checklist:

1. **Generate service worker:**
   ```bash
   npx msw init public/ --save
   ```

2. **Create environment file** `.env.development`:
   ```bash
   VITE_USE_MOCKS=true
   ```

3. **Update main.tsx** to initialize MSW before rendering:
   ```typescript
   async function enableMocking() {
     if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
       const { worker } = await import('./mocks/browser')
       return worker.start({ onUnhandledRequest: 'bypass' })
     }
     return Promise.resolve()
   }

   enableMocking().then(() => {
     createRoot(document.getElementById('root')!).render(<App />)
   })
   ```

4. **Restart the dev server** (required after adding `.env` files):
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

5. **Verify in console** - Look for `[MSW] Mocking enabled.`

### Issue: Grid shows "Loading..." forever

**Cause:** Datasource never calls `params.success()` or `params.fail()`

**Solution:** Ensure your fetch handler always resolves:
```typescript
try {
  // ... fetch logic
  params.success({ rowData, rowCount })
} catch (error) {
  params.fail()
}
```

### Issue: Sorting/filtering doesn't work

**Cause:** MSW handler not processing sortModel/filterModel

**Solution:** Check handler receives and processes the request body correctly.

### Issue: Row selection not working

**Cause:** Missing `getRowId` prop

**Solution:** Always provide a unique row ID:
```typescript
<ServerSideGrid
  getRowId={(data) => data.id}
  // ...
/>
```

### Issue: Enterprise features not working

**Cause:** Modules not registered

**Solution:** Ensure modules are registered before any grid renders:
```typescript
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])
```

### Issue: TypeScript errors in AG Grid v35

**Common errors and fixes:**

1. **`selection` prop type error:**
   ```typescript
   // ❌ Wrong (v34 API)
   selection={selectionConfig}

   // ✅ Correct (v35 API)
   rowSelection={selectionConfig}
   ```

2. **Type mismatch for sortModel/filterModel:**
   ```typescript
   // ❌ Wrong
   sortModel: sortModel ?? []

   // ✅ Correct (with type assertion)
   sortModel: (sortModel ?? []) as ServerSideRequest['sortModel']
   filterModel: (filterModel ?? {}) as Record<string, unknown>
   ```

3. **Missing type imports:**
   ```typescript
   import type {
     ColDef,
     GridReadyEvent,
     IServerSideDatasource,
     GetRowIdParams,           // For getRowId callback
     SelectionChangedEvent,    // For onSelectionChanged
     RowSelectionOptions,      // For selection config
   } from 'ag-grid-community'
   ```

---

## File Structure Summary

```
src/
├── components/
│   └── ui/
│       ├── ServerSideGrid.tsx    # Reusable grid component
│       └── index.ts              # Exports
├── mocks/
│   ├── data/
│   │   ├── fx-cash.ts            # FX Cash mock data
│   │   └── fx-options.ts         # FX Options mock data
│   ├── handlers/
│   │   ├── fx-cash.ts            # FX Cash API handler
│   │   ├── fx-options.ts         # FX Options API handler
│   │   └── index.ts              # Handler exports
│   ├── handlers.ts               # Combined handlers
│   ├── server.ts                 # MSW server (tests)
│   └── browser.ts                # MSW browser (dev)
└── pages/
    └── app/
        └── trade-activity/
            └── block-level/
                ├── FxCashTab.tsx     # FX Cash grid page
                └── FxOptionsTab.tsx  # FX Options grid page
```

---

## Related Documentation

- [07-test-setup-guide.md](./07-test-setup-guide.md) - MSW setup for testing
- [09-environment-variables-guide.md](./09-environment-variables-guide.md) - Environment configuration
- [AG Grid Documentation](https://www.ag-grid.com/react-data-grid/server-side-model/)
