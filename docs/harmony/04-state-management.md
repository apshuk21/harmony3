# 04 - State Management in Harmony

A comprehensive guide to managing UI state, server state, and state preservation across navigation.

---

## Table of Contents

1. [State Categories](#1-state-categories)
2. [Technology Choices](#2-technology-choices)
3. [State Preservation Strategy](#3-state-preservation-strategy)
4. [Implementation Architecture](#4-implementation-architecture)
5. [Zustand Store Design](#5-zustand-store-design)
6. [TanStack Query Integration](#6-tanstack-query-integration)
7. [Page Component Pattern](#7-page-component-pattern)
8. [State Flow Diagram](#8-state-flow-diagram)
9. [Common Patterns](#9-common-patterns)

---

## 1. State Categories

Understanding what type of state you're dealing with is crucial for choosing the right management approach.

### UI State vs Server State

| Category | Examples | Characteristics | Tool |
|----------|----------|-----------------|------|
| **UI State** | Selected tab, active filters, sort direction, expanded rows | Synchronous, local, user-driven | Zustand |
| **Server State** | Trade data, View configurations, user preferences | Async, remote, shared | TanStack Query |

### State Scope Levels

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL STATE                                               │
│  • User session/auth                                        │
│  • App-wide preferences                                     │
│  • Navigation state                                         │
├─────────────────────────────────────────────────────────────┤
│  PAGE STATE (preserved across tab switches)                 │
│  • Selected View dropdown                                   │
│  • Date range filter                                        │
│  • Counterparty filter                                      │
│  • Status pills selection (multi-select)                    │
├─────────────────────────────────────────────────────────────┤
│  TAB STATE (preserved when navigating away)                 │
│  • Column filters                                           │
│  • Sort column & direction                                  │
│  • Current page / pagination                                │
│  • Expanded/collapsed rows                                  │
│  • Row selection                                            │
└─────────────────────────────────────────────────────────────┘
```

### Harmony Page State Breakdown

Based on the FX Trade Confirmations page:

| Element | State Type | Scope | Preserve? |
|---------|------------|-------|-----------|
| Selected tab (FX Cash/Options) | UI | Page | ✅ Yes |
| View dropdown selection | UI | Page | ✅ Yes |
| View dropdown data | Server | Page | Re-fetch |
| Status pills (multi-select) | UI | Page | ✅ Yes |
| Date range | UI | Page | ✅ Yes |
| Counterparty filter | UI | Page | ✅ Yes |
| Column filters | UI | Tab | ✅ Yes |
| Sort state | UI | Tab | ✅ Yes |
| Pagination | UI | Tab | ✅ Yes |
| Grid data | Server | Tab | Re-fetch |

---

## 2. Technology Choices

### TanStack Query - Server State

**Purpose**: Fetching, caching, synchronizing server data

```typescript
// What TanStack Query handles:
- Fetching grid data based on filters
- Fetching View configurations
- Caching responses (configurable staleTime)
- Background refetching
- Loading/error states
- Optimistic updates
```

### Zustand - UI/Client State

**Purpose**: Managing UI state that needs to persist across navigation

```typescript
// What Zustand handles:
- Filter selections (status pills, date range, counterparty)
- Selected View
- Table state (column filters, sort, pagination)
- Selected tab
- Any UI state that should survive navigation
```

### Why This Combination Works

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ZUSTAND STORE                          │    │
│  │  • Stores filter values                             │    │
│  │  • Stores table state                               │    │
│  │  • Persists across navigation                       │    │
│  │  • Triggers re-renders                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            │ filters as query params         │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           TANSTACK QUERY                            │    │
│  │  • Uses Zustand state as queryKey                   │    │
│  │  • Fetches when filters change                      │    │
│  │  • Caches responses                                 │    │
│  │  • Provides loading/error states                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│                        RENDER UI                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. State Preservation Strategy

### The Challenge

When user navigates:
1. `/trade-activity/block-level/fx-cash` → `/settlement/pending`
2. Then back to `/trade-activity/block-level/fx-cash`

**Expected behavior**:
- UI state (filters, sort, pagination) should be exactly as they left it
- Server data should re-fetch with the preserved filter values

### Solution: Route-Keyed Zustand Stores

Each page/tab combination gets its own slice of state, keyed by route.

```typescript
// State is stored with route-based keys
{
  // Page-level state (shared across tabs)
  'trade-activity/block-level': {
    selectedView: 'default',
    statusFilters: ['pending', 'confirmed'],
    dateRange: { start: '2024-01-01', end: '2024-01-15' },
    counterparty: 'all',
  },

  // Tab-level state (specific to each tab)
  'trade-activity/block-level/fx-cash': {
    columnFilters: { tradeId: 'FX2024' },
    sortBy: 'tradeDate',
    sortDirection: 'desc',
    currentPage: 1,
    pageSize: 25,
  },

  'trade-activity/block-level/fx-options': {
    columnFilters: {},
    sortBy: 'valueDate',
    sortDirection: 'asc',
    currentPage: 3,
    pageSize: 50,
  },
}
```

### Why Route-Keyed?

1. **Isolation**: Different pages don't interfere with each other
2. **Preservation**: State naturally persists when navigating away
3. **Scalability**: Add new pages without changing store structure
4. **Cleanup**: Can clear state for specific routes if needed

---

## 4. Implementation Architecture

### Folder Structure

```
src/
├── stores/
│   ├── index.ts                    # Re-exports all stores
│   │
│   ├── pageState/                  # Page-level UI state
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── createPageStore.ts      # Factory for page stores
│   │   └── usePageState.ts         # Hook with route-key logic
│   │
│   ├── tableState/                 # Table/tab-level UI state
│   │   ├── types.ts
│   │   ├── createTableStore.ts
│   │   └── useTableState.ts
│   │
│   └── global/                     # Global app state
│       ├── authStore.ts
│       └── preferencesStore.ts
│
├── services/
│   └── queries/
│       ├── useTradeQueries.ts      # TanStack Query hooks
│       └── useViewQueries.ts
```

---

## 5. Zustand Store Design

### Global Store (Simple)

```typescript
// src/stores/global/authStore.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}))
```

### Page State Store (Route-Keyed)

```typescript
// src/stores/pageState/types.ts
export interface PageFilters {
  selectedView: string
  statusFilters: string[]        // Multi-select: ['confirmed', 'pending', 'rejected']
  dateRange: {
    start: string
    end: string
  }
  counterparty: string
}

export interface PageStateSlice {
  filters: PageFilters
  setFilter: <K extends keyof PageFilters>(key: K, value: PageFilters[K]) => void
  setFilters: (filters: Partial<PageFilters>) => void
  resetFilters: () => void
}
```

```typescript
// src/stores/pageState/createPageStore.ts
import { create } from 'zustand'
import type { PageFilters, PageStateSlice } from './types'

const defaultFilters: PageFilters = {
  selectedView: 'default',
  statusFilters: [],
  dateRange: {
    start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  counterparty: 'all',
}

// Store that holds state for ALL pages, keyed by route
interface PageStateStore {
  pages: Record<string, PageFilters>
  getPageFilters: (routeKey: string) => PageFilters
  setPageFilter: <K extends keyof PageFilters>(
    routeKey: string,
    key: K,
    value: PageFilters[K]
  ) => void
  setPageFilters: (routeKey: string, filters: Partial<PageFilters>) => void
  resetPageFilters: (routeKey: string) => void
}

export const usePageStateStore = create<PageStateStore>((set, get) => ({
  pages: {},

  getPageFilters: (routeKey) => {
    return get().pages[routeKey] ?? defaultFilters
  },

  setPageFilter: (routeKey, key, value) => {
    set((state) => ({
      pages: {
        ...state.pages,
        [routeKey]: {
          ...(state.pages[routeKey] ?? defaultFilters),
          [key]: value,
        },
      },
    }))
  },

  setPageFilters: (routeKey, filters) => {
    set((state) => ({
      pages: {
        ...state.pages,
        [routeKey]: {
          ...(state.pages[routeKey] ?? defaultFilters),
          ...filters,
        },
      },
    }))
  },

  resetPageFilters: (routeKey) => {
    set((state) => ({
      pages: {
        ...state.pages,
        [routeKey]: defaultFilters,
      },
    }))
  },
}))
```

```typescript
// src/stores/pageState/usePageState.ts
import { useMemo } from 'react'
import { usePageStateStore } from './createPageStore'

/**
 * Hook to access page-level state for a specific route
 *
 * @param routeKey - The route identifier (e.g., 'trade-activity/block-level')
 */
export function usePageState(routeKey: string) {
  const store = usePageStateStore()

  return useMemo(() => ({
    filters: store.getPageFilters(routeKey),
    setFilter: <K extends keyof PageFilters>(key: K, value: PageFilters[K]) =>
      store.setPageFilter(routeKey, key, value),
    setFilters: (filters: Partial<PageFilters>) =>
      store.setPageFilters(routeKey, filters),
    resetFilters: () => store.resetPageFilters(routeKey),
  }), [routeKey, store])
}
```

### Table State Store (Route-Keyed)

```typescript
// src/stores/tableState/types.ts
export interface TableState {
  columnFilters: Record<string, string>
  sortBy: string | null
  sortDirection: 'asc' | 'desc'
  currentPage: number
  pageSize: number
  selectedRows: string[]
  expandedRows: string[]
}

export interface TableStateActions {
  setColumnFilter: (column: string, value: string) => void
  clearColumnFilter: (column: string) => void
  clearAllColumnFilters: () => void
  setSort: (column: string, direction?: 'asc' | 'desc') => void
  clearSort: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  toggleRowSelection: (rowId: string) => void
  setSelectedRows: (rowIds: string[]) => void
  clearSelection: () => void
  toggleRowExpanded: (rowId: string) => void
  resetTableState: () => void
}
```

```typescript
// src/stores/tableState/createTableStore.ts
import { create } from 'zustand'
import type { TableState } from './types'

const defaultTableState: TableState = {
  columnFilters: {},
  sortBy: null,
  sortDirection: 'asc',
  currentPage: 1,
  pageSize: 25,
  selectedRows: [],
  expandedRows: [],
}

interface TableStateStore {
  tables: Record<string, TableState>
  getTableState: (routeKey: string) => TableState
  setColumnFilter: (routeKey: string, column: string, value: string) => void
  clearColumnFilter: (routeKey: string, column: string) => void
  clearAllColumnFilters: (routeKey: string) => void
  setSort: (routeKey: string, column: string, direction?: 'asc' | 'desc') => void
  clearSort: (routeKey: string) => void
  setPage: (routeKey: string, page: number) => void
  setPageSize: (routeKey: string, size: number) => void
  toggleRowSelection: (routeKey: string, rowId: string) => void
  setSelectedRows: (routeKey: string, rowIds: string[]) => void
  clearSelection: (routeKey: string) => void
  toggleRowExpanded: (routeKey: string, rowId: string) => void
  resetTableState: (routeKey: string) => void
}

export const useTableStateStore = create<TableStateStore>((set, get) => ({
  tables: {},

  getTableState: (routeKey) => {
    return get().tables[routeKey] ?? defaultTableState
  },

  setColumnFilter: (routeKey, column, value) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: {
            ...current,
            columnFilters: { ...current.columnFilters, [column]: value },
            currentPage: 1, // Reset to first page when filtering
          },
        },
      }
    })
  },

  clearColumnFilter: (routeKey, column) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      const { [column]: _, ...rest } = current.columnFilters
      return {
        tables: {
          ...state.tables,
          [routeKey]: {
            ...current,
            columnFilters: rest,
            currentPage: 1,
          },
        },
      }
    })
  },

  clearAllColumnFilters: (routeKey) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: {
            ...current,
            columnFilters: {},
            currentPage: 1,
          },
        },
      }
    })
  },

  setSort: (routeKey, column, direction) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      // Toggle direction if same column, otherwise default to 'asc'
      const newDirection = direction ??
        (current.sortBy === column && current.sortDirection === 'asc' ? 'desc' : 'asc')
      return {
        tables: {
          ...state.tables,
          [routeKey]: {
            ...current,
            sortBy: column,
            sortDirection: newDirection,
          },
        },
      }
    })
  },

  clearSort: (routeKey) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: {
            ...current,
            sortBy: null,
            sortDirection: 'asc',
          },
        },
      }
    })
  },

  setPage: (routeKey, page) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: { ...current, currentPage: page },
        },
      }
    })
  },

  setPageSize: (routeKey, size) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: {
            ...current,
            pageSize: size,
            currentPage: 1, // Reset to first page when changing page size
          },
        },
      }
    })
  },

  toggleRowSelection: (routeKey, rowId) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      const selected = current.selectedRows.includes(rowId)
        ? current.selectedRows.filter((id) => id !== rowId)
        : [...current.selectedRows, rowId]
      return {
        tables: {
          ...state.tables,
          [routeKey]: { ...current, selectedRows: selected },
        },
      }
    })
  },

  setSelectedRows: (routeKey, rowIds) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: { ...current, selectedRows: rowIds },
        },
      }
    })
  },

  clearSelection: (routeKey) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      return {
        tables: {
          ...state.tables,
          [routeKey]: { ...current, selectedRows: [] },
        },
      }
    })
  },

  toggleRowExpanded: (routeKey, rowId) => {
    set((state) => {
      const current = state.tables[routeKey] ?? defaultTableState
      const expanded = current.expandedRows.includes(rowId)
        ? current.expandedRows.filter((id) => id !== rowId)
        : [...current.expandedRows, rowId]
      return {
        tables: {
          ...state.tables,
          [routeKey]: { ...current, expandedRows: expanded },
        },
      }
    })
  },

  resetTableState: (routeKey) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [routeKey]: defaultTableState,
      },
    }))
  },
}))
```

```typescript
// src/stores/tableState/useTableState.ts
import { useMemo } from 'react'
import { useTableStateStore } from './createTableStore'
import type { TableState } from './types'

/**
 * Hook to access table state for a specific route/tab
 *
 * @param routeKey - The route identifier (e.g., 'trade-activity/block-level/fx-cash')
 */
export function useTableState(routeKey: string) {
  const store = useTableStateStore()

  return useMemo(() => ({
    ...store.getTableState(routeKey),
    setColumnFilter: (column: string, value: string) =>
      store.setColumnFilter(routeKey, column, value),
    clearColumnFilter: (column: string) =>
      store.clearColumnFilter(routeKey, column),
    clearAllColumnFilters: () =>
      store.clearAllColumnFilters(routeKey),
    setSort: (column: string, direction?: 'asc' | 'desc') =>
      store.setSort(routeKey, column, direction),
    clearSort: () => store.clearSort(routeKey),
    setPage: (page: number) => store.setPage(routeKey, page),
    setPageSize: (size: number) => store.setPageSize(routeKey, size),
    toggleRowSelection: (rowId: string) =>
      store.toggleRowSelection(routeKey, rowId),
    setSelectedRows: (rowIds: string[]) =>
      store.setSelectedRows(routeKey, rowIds),
    clearSelection: () => store.clearSelection(routeKey),
    toggleRowExpanded: (rowId: string) =>
      store.toggleRowExpanded(routeKey, rowId),
    resetTableState: () => store.resetTableState(routeKey),
  }), [routeKey, store])
}
```

---

## 6. TanStack Query Integration

### Query Key Strategy

Query keys should include all parameters that affect the data:

```typescript
// src/services/queryKeys.ts
export const queryKeys = {
  // Views (dropdown options)
  views: {
    all: ['views'] as const,
    byPage: (pageType: string) => ['views', pageType] as const,
  },

  // Trade data
  trades: {
    all: ['trades'] as const,

    // List with filters
    list: (filters: {
      view: string
      statuses: string[]
      dateRange: { start: string; end: string }
      counterparty: string
      page: number
      pageSize: number
      sortBy: string | null
      sortDirection: 'asc' | 'desc'
      columnFilters: Record<string, string>
    }) => ['trades', 'list', filters] as const,

    // Single trade detail
    detail: (tradeId: string) => ['trades', 'detail', tradeId] as const,
  },
}
```

### Query Hooks

```typescript
// src/services/queries/useTradeQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { fetchTrades, fetchTradeDetail, updateTradeStatus } from '../api/trades'
import type { PageFilters } from '@/stores/pageState/types'
import type { TableState } from '@/stores/tableState/types'

interface UseTradesParams {
  pageFilters: PageFilters
  tableState: TableState
  enabled?: boolean
}

/**
 * Fetch paginated trade list based on filters
 */
export function useTrades({ pageFilters, tableState, enabled = true }: UseTradesParams) {
  return useQuery({
    queryKey: queryKeys.trades.list({
      view: pageFilters.selectedView,
      statuses: pageFilters.statusFilters,
      dateRange: pageFilters.dateRange,
      counterparty: pageFilters.counterparty,
      page: tableState.currentPage,
      pageSize: tableState.pageSize,
      sortBy: tableState.sortBy,
      sortDirection: tableState.sortDirection,
      columnFilters: tableState.columnFilters,
    }),
    queryFn: () => fetchTrades({
      view: pageFilters.selectedView,
      statuses: pageFilters.statusFilters,
      startDate: pageFilters.dateRange.start,
      endDate: pageFilters.dateRange.end,
      counterparty: pageFilters.counterparty,
      page: tableState.currentPage,
      pageSize: tableState.pageSize,
      sortBy: tableState.sortBy,
      sortDirection: tableState.sortDirection,
      columnFilters: tableState.columnFilters,
    }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds - data is fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
  })
}

/**
 * Fetch available views for dropdown
 */
export function useViews(pageType: string) {
  return useQuery({
    queryKey: queryKeys.views.byPage(pageType),
    queryFn: () => fetchViews(pageType),
    staleTime: 5 * 60 * 1000, // Views rarely change
  })
}

/**
 * Update trade status mutation
 */
export function useUpdateTradeStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTradeStatus,
    onSuccess: () => {
      // Invalidate all trade lists to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all })
    },
  })
}
```

### Key Points

1. **Query keys include all filter params**: This ensures automatic refetch when filters change
2. **staleTime controls freshness**: Data won't refetch if still fresh
3. **gcTime controls cache retention**: Data stays in cache even after unmount
4. **When navigating back**: Query checks cache first, uses if fresh, refetches if stale

---

## 7. Page Component Pattern

### Complete Page Example

```typescript
// src/pages/app/trade-activity/block-level/FxCashTab.tsx
import { usePageState } from '@/stores/pageState/usePageState'
import { useTableState } from '@/stores/tableState/useTableState'
import { useTrades } from '@/services/queries/useTradeQueries'
import { DataTable } from '@/components/ui/Table'
import { FilterBar } from './components/FilterBar'
import { StatusPills } from './components/StatusPills'

// Route keys for this page
const PAGE_KEY = 'trade-activity/block-level'
const TABLE_KEY = 'trade-activity/block-level/fx-cash'

export function FxCashTab() {
  // Get preserved page-level state (shared with FX Options tab)
  const { filters, setFilter } = usePageState(PAGE_KEY)

  // Get preserved table state (specific to this tab)
  const tableState = useTableState(TABLE_KEY)

  // Fetch data using both UI states
  // Query key includes all params, so changing any filter triggers refetch
  const { data, isLoading, isError, error } = useTrades({
    pageFilters: filters,
    tableState,
  })

  if (isError) {
    return <div className="error">Error loading trades: {error.message}</div>
  }

  return (
    <div className="tab-panel">
      {/* Page-level filters (shared state) */}
      <FilterBar
        selectedView={filters.selectedView}
        onViewChange={(view) => setFilter('selectedView', view)}
        dateRange={filters.dateRange}
        onDateRangeChange={(range) => setFilter('dateRange', range)}
        counterparty={filters.counterparty}
        onCounterpartyChange={(cp) => setFilter('counterparty', cp)}
      />

      {/* Multi-select status pills */}
      <StatusPills
        selected={filters.statusFilters}
        onChange={(statuses) => setFilter('statusFilters', statuses)}
        counts={data?.statusCounts}
      />

      {/* Data table with preserved state */}
      <DataTable
        data={data?.trades ?? []}
        isLoading={isLoading}
        columns={columns}
        // Table state from Zustand
        columnFilters={tableState.columnFilters}
        onColumnFilterChange={tableState.setColumnFilter}
        sortBy={tableState.sortBy}
        sortDirection={tableState.sortDirection}
        onSort={tableState.setSort}
        currentPage={tableState.currentPage}
        pageSize={tableState.pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={tableState.setPage}
        onPageSizeChange={tableState.setPageSize}
        selectedRows={tableState.selectedRows}
        onSelectionChange={tableState.setSelectedRows}
      />
    </div>
  )
}
```

### Shared Page-Level Layout

```typescript
// src/pages/app/trade-activity/block-level/BlockLevelPage.tsx
import { Outlet } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout/PageLayout'
import { TabLayout } from '@/components/layout/TabLayout'

const tabs = [
  { label: 'FX Cash', to: '/trade-activity/block-level/fx-cash' },
  { label: 'FX Options', to: '/trade-activity/block-level/fx-options' },
]

export function BlockLevelPage() {
  return (
    <PageLayout
      title="FX Trade Confirmations"
      breadcrumbs={['Home', 'Trade Activity', 'FX Confirmations']}
      actions={<CashEntryButton />}
      lastUpdated={new Date()}
    >
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </PageLayout>
  )
}
```

---

## 8. State Flow Diagram

### Navigation Flow

```
USER: Navigates to /trade-activity/block-level/fx-cash
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. ROUTE RENDERS                                           │
│     FxCashTab component mounts                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ZUSTAND PROVIDES STATE                                  │
│     usePageState('trade-activity/block-level')              │
│     useTableState('trade-activity/block-level/fx-cash')     │
│     │                                                       │
│     ├─ First visit? Returns defaults                        │
│     └─ Return visit? Returns preserved state                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. TANSTACK QUERY FETCHES                                  │
│     Query key = ['trades', 'list', { ...all filters }]      │
│     │                                                       │
│     ├─ In cache + fresh? Use cached data                    │
│     ├─ In cache + stale? Show cached, refetch background    │
│     └─ Not in cache? Fetch from server                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. UI RENDERS                                              │
│     - Filters show preserved values                         │
│     - Table shows data (cached or fresh)                    │
│     - Loading state if fetching                             │
└─────────────────────────────────────────────────────────────┘
```

### Filter Change Flow

```
USER: Clicks "Pending" status pill to add it to selection
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. EVENT HANDLER                                           │
│     setFilter('statusFilters', ['confirmed', 'pending'])    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ZUSTAND UPDATES                                         │
│     Store state changes, triggers re-render                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. QUERY KEY CHANGES                                       │
│     Old: ['trades', 'list', { statuses: ['confirmed'] }]    │
│     New: ['trades', 'list', { statuses: ['confirmed',       │
│                                           'pending'] }]     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. TANSTACK QUERY REFETCHES                                │
│     - Shows loading indicator                               │
│     - Fetches new data from server                          │
│     - Updates UI with results                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Common Patterns

### Pattern 1: Multi-Select Status Pills

```typescript
// src/components/filters/StatusPills.tsx
interface StatusPillsProps {
  selected: string[]
  onChange: (selected: string[]) => void
  counts?: Record<string, number>
}

export function StatusPills({ selected, onChange, counts }: StatusPillsProps) {
  const statuses = ['confirmed', 'pending', 'rejected', 'history']

  const toggle = (status: string) => {
    if (selected.includes(status)) {
      onChange(selected.filter((s) => s !== status))
    } else {
      onChange([...selected, status])
    }
  }

  return (
    <div className="status-pills">
      {statuses.map((status) => (
        <button
          key={status}
          className={`status-pill ${selected.includes(status) ? 'active' : ''}`}
          onClick={() => toggle(status)}
        >
          {counts?.[status] ?? 0} {status}
        </button>
      ))}
    </div>
  )
}
```

### Pattern 2: View Dropdown with Server Data

```typescript
// src/components/filters/ViewDropdown.tsx
import { useViews } from '@/services/queries/useViewQueries'

interface ViewDropdownProps {
  pageType: string
  value: string
  onChange: (view: string) => void
}

export function ViewDropdown({ pageType, value, onChange }: ViewDropdownProps) {
  // Server data - fetched once, cached
  const { data: views, isLoading } = useViews(pageType)

  if (isLoading) {
    return <select disabled><option>Loading...</option></select>
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {views?.map((view) => (
        <option key={view.id} value={view.id}>
          {view.name}
        </option>
      ))}
    </select>
  )
}
```

### Pattern 3: Reset All Filters

```typescript
// In page component
const { resetFilters } = usePageState(PAGE_KEY)
const { resetTableState } = useTableState(TABLE_KEY)

const handleResetAll = () => {
  resetFilters()
  resetTableState()
  // TanStack Query will automatically refetch due to query key change
}
```

### Pattern 4: Debounced Column Filters

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Usage in column filter input
function ColumnFilterInput({ column, value, onChange }) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, 300)

  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue])

  return (
    <input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder="Filter..."
    />
  )
}
```

---

## Summary

| Concern | Solution |
|---------|----------|
| **UI State (filters, table)** | Zustand with route-keyed stores |
| **Server State (data)** | TanStack Query with filter-based query keys |
| **State Preservation** | Zustand stores persist in memory across navigation |
| **Data Refresh** | TanStack Query refetches when filters change or data goes stale |
| **Page vs Tab state** | Different route keys: page uses parent path, tab uses full path |
| **Multi-select filters** | Array-based state in Zustand |

This architecture gives you:
- ✅ Preserved UI state when navigating away and back
- ✅ Automatic data refetch with preserved filter values
- ✅ Clear separation of UI state (Zustand) and server state (Query)
- ✅ Scalable pattern for adding new pages/tabs
- ✅ Session-only persistence (resets on refresh)
