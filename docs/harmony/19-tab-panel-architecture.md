# Tab Panel Architecture

This document explains the architecture for the Tab Panel system, including the Filter Section, Grid Section, and their communication patterns.

---

## Page Layout Architecture

### Complete Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Title Section (78px fixed)                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Breadcrumbs: Overview > Trade Activity > Block Level           │  │  │
│  │  ├─────────────────────────────────────────────────────────────────┤  │  │
│  │  │  Title: "Block Level"              [Action Buttons if needed]   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  Tab Section (calc(100vh - 78px))                     │  │
│  │                                                                       │  │
│  │    [FX Cash] [FX Options]     ← Tab Navigation (above white card)    │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      White Card                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  Filter Panel (OPTIONAL, content-based height)            │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │ Row 1: Preset Dropdown                              │  │  │  │  │
│  │  │  │  │ Row 2: Chips | Date | Column Filters | Actions      │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  Grid Section (flex: 1, takes remaining height)           │  │  │  │
│  │  │  │                                                           │  │  │  │
│  │  │  │              AG Grid (internal scroll only)               │  │  │  │
│  │  │  │                                                           │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  NO PAGE-LEVEL VERTICAL SCROLL                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layout Rules

| Section | Height | Behavior |
|---------|--------|----------|
| Title Section | `78px` fixed | Includes padding, breadcrumbs + title |
| Tab Section | `calc(100vh - 78px)` | Remaining viewport height |
| Tab Navigation | Content-based | Sits above white card |
| Filter Panel | Content-based (`flex-shrink: 0`) | Optional, takes height as per content |
| Grid Section | `flex: 1` | Takes all remaining height |

### Key Constraints

1. **No page-level scroll** - Only AG Grid has internal scroll
2. **Filter Panel is optional** - When absent, grid takes full tab section height
3. **Side panels overlay** - Don't reduce main content width
4. **Title section is separate** - Not part of TabLayout

### Component Hierarchy

```tsx
// Authenticated Page Structure
<AppLayout>                              // Provides sidebar + header
  <div className="page">                 // Full page container

    {/* Title Section - 78px fixed */}
    <PageTitle
      breadcrumbs={['Overview', 'Trade Activity', 'Block Level']}
      title="Block Level"
    />

    {/* Tab Section - remaining height */}
    <div className="tab-section">
      <TabLayout tabs={tabs}>            // Tab navigation + white card
        <Outlet />                       // Renders active tab content
      </TabLayout>
    </div>

  </div>
</AppLayout>

// Inside each tab route (e.g., FxCashTab):
<TabPanel>                               // Creates store, provides context
  {/* Filter Panel - optional, content-based height */}
  <TabFilterSection>
    <PresetRow />
    <FilterChipsRow />
  </TabFilterSection>

  {/* Grid Section - takes remaining height */}
  <TabGridSection>
    <ServerSideGrid />
  </TabGridSection>
</TabPanel>
```

### Side Panel Overlay Behavior

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Title Section (78px)                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tab Section (full width)                         ┌─────────────────────┐   │
│  ┌─────────────────────────────────────────────┐  │                     │   │
│  │                                             │  │    Side Panel       │   │
│  │    Main Content                             │  │    (Overlay)        │   │
│  │    (does NOT shrink when panel opens)       │  │                     │   │
│  │                                             │  │    width: 320px     │   │
│  │                                             │  │    position: fixed  │   │
│  │                                             │  │    right: 0         │   │
│  │                                             │  │    z-index: 100     │   │
│  │                                             │  │                     │   │
│  └─────────────────────────────────────────────┘  └─────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PageTitle Component

### Implementation

```typescript
// src/components/layout/PageTitle/PageTitle.tsx
import type { ReactNode } from 'react'
import styles from './PageTitle.module.css'

interface PageTitleProps {
  /** Breadcrumb items */
  breadcrumbs?: string[]
  /** Page title */
  title: string
  /** Optional action buttons on the right */
  actions?: ReactNode
}

export function PageTitle({ breadcrumbs, title, actions }: PageTitleProps) {
  return (
    <div className={styles.pageTitle}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index > 0 && <span className={styles.separator}>/</span>}
              <span className={index === breadcrumbs.length - 1 ? styles.current : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
```

### CSS

```css
/* src/components/layout/PageTitle/PageTitle.module.css */
.pageTitle {
  height: 78px;               /* Fixed height */
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.75rem 0;
  gap: 0.25rem;
}

.breadcrumbs {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.separator {
  margin: 0 0.5rem;
  color: var(--color-text-muted);
}

.current {
  color: var(--color-text-primary);
}

.titleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.actions {
  display: flex;
  gap: 0.5rem;
}
```

---

## Tab Section CSS

### Page Styles

```css
/* src/styles/layouts/page.css */
.page {
  display: flex;
  flex-direction: column;
  height: 100%;              /* Fill available height from parent */
  min-height: 0;             /* Allow flex children to shrink */
  overflow: hidden;          /* No page-level scroll */
}

.tab-section {
  display: flex;
  flex-direction: column;
  flex: 1;                   /* Take remaining height after title */
  min-height: 0;             /* Critical for nested flex */
}
```

### TabLayout Updates

```css
/* src/components/layout/TabLayout.module.css */
.tabLayoutWrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.tabNav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0;
  margin-left: 1.5rem;
  flex-shrink: 0;            /* Tab nav doesn't shrink */
}

.tabCard {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;             /* Allow card content to scroll */
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  overflow: hidden;          /* Card itself doesn't scroll */
}
```

### TabPanel Styles

```css
/* src/components/layout/TabPanel/TabPanel.module.css */
.tabPanel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 1rem;
}

.filterSection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-shrink: 0;            /* Filter section doesn't shrink */
}

.gridSection {
  display: flex;
  flex-direction: column;
  flex: 1;                   /* Grid takes remaining space */
  min-height: 0;
}
```

---

## Height Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Viewport: 100vh                                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  App Header (if any): ~60px                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  .app-content (flex: 1)                                   │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  .page (height: 100%)                               │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  PageTitle: 78px (fixed)                      │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  .tab-section (flex: 1)                       │  │  │  │
│  │  │  │                                               │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  TabNav: ~40px (content-based)          │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────┘  │  │  │  │
│  │  │  │                                               │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  .tabCard (flex: 1, with padding)       │  │  │  │  │
│  │  │  │  │                                         │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │  FilterSection: ~80px (optional)  │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────────────┘  │  │  │  │  │
│  │  │  │  │                                         │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │  GridSection (flex: 1)            │  │  │  │  │  │
│  │  │  │  │  │  = remaining height               │  │  │  │  │  │
│  │  │  │  │  │                                   │  │  │  │  │  │
│  │  │  │  │  │  AG Grid (internal scroll)        │  │  │  │  │  │
│  │  │  │  │  │                                   │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────────────┘  │  │  │  │  │
│  │  │  │  │                                         │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────┘  │  │  │  │
│  │  │  │                                               │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │                                                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Critical CSS Properties for No-Scroll Layout

```css
/* Every flex container in the chain must have: */
.container {
  display: flex;
  flex-direction: column;
  min-height: 0;    /* Allows children to shrink below content size */
}

/* The growing element needs: */
.growing-child {
  flex: 1;          /* Take remaining space */
  min-height: 0;    /* Allow shrinking */
  overflow: hidden; /* Or 'auto' if it needs internal scroll */
}

/* Fixed-height elements need: */
.fixed-child {
  flex-shrink: 0;   /* Don't shrink */
  height: 78px;     /* Or content-based */
}
```

---

## Overview

Each tab in our application contains two main sections:

```
┌─────────────────────────────────────────────────────────────┐
│  Tab Navigation (TabLayout)                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Filter Section                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Row 1: Preset Dropdown                          │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │ Row 2: Chips | Date | Column Filters | Actions  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Grid Section                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Column Filters Row                              │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │ AG Grid (Server-Side Row Model)                 │  │  │
│  │  │                                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

1. **Filter Section** must communicate with the **Grid Section**
2. **Sidepanels** (rendered outside tab tree) need access to grid data
3. Each tab has its own independent state (filters, grid API)
4. Architecture should be reusable across all tabs

---

## Communication Pattern: Zustand Store with Context Scoping

We use **Zustand** for state management with **React Context** for scoping stores to each tab instance.

### Why Zustand over React Context?

| Feature | React Context | Zustand |
|---------|---------------|---------|
| Boilerplate | More (Provider, Consumer, hooks) | Less (create store, use hook) |
| Re-renders | All consumers re-render on any change | Selective subscriptions |
| Access outside React | Not possible | Possible |
| DevTools | React DevTools | Zustand DevTools |
| Sidepanel access | Must be child of Provider | Can access via store reference |
| Learning curve | Native React | Minimal API |

### Why not a Global Zustand Store?

Multiple tabs = multiple grids = multiple GridAPIs. A single global store would:
- Mix state from different tabs
- Require complex key-based lookups
- Make cleanup difficult when tabs unmount

### Solution: Scoped Store Instances

Each `TabPanel` creates its own Zustand store instance and provides it via Context. This gives us:
- Zustand's simple API and performance
- Automatic scoping per tab
- Sidepanel access (by passing store reference)

---

## Architecture

### Folder Structure

```
src/components/
├── layout/
│   ├── TabLayout.tsx              # Tab navigation only
│   ├── TabLayout.module.css
│   └── TabPanel/
│       ├── index.ts               # Public exports
│       ├── TabPanel.tsx           # Main wrapper component
│       ├── TabPanelContext.tsx    # Store context + hooks
│       ├── TabPanelStore.ts       # Zustand store factory
│       ├── TabFilterSection.tsx   # Filter section wrapper
│       ├── TabGridSection.tsx     # Grid section wrapper
│       └── TabPanel.module.css    # Styles
│
├── filters/                       # Reusable filter components
│   ├── PresetDropdown/
│   ├── LifecycleChips/
│   ├── DateRangePicker/
│   └── ColumnFiltersDropdown/
│
└── grid/
    └── ServerSideGrid/            # Existing grid component
```

### Component Hierarchy

```
<TabLayout>                        # Tab navigation
  <Outlet />                       # Renders active tab
</TabLayout>

// Inside each tab route (e.g., FxCashTab):
<TabPanel>                         # Creates store, provides context
  <TabFilterSection>               # Filter area wrapper
    <PresetDropdown />             # Uses useTabPanelStore()
    <LifecycleChips />             # Uses useTabPanelStore()
    <DateRangePicker />            # Uses useTabPanelStore()
  </TabFilterSection>
  <TabGridSection>                 # Grid area wrapper
    <ServerSideGrid />             # Registers gridApi to store
  </TabGridSection>
</TabPanel>

// Sidepanel (rendered in portal, outside tab tree):
<RowDetailsSidepanel
  store={tabPanelStore}            # Store passed as prop
/>
```

---

## Implementation Details

### 1. TabPanelStore (Zustand Store Factory)

```typescript
// src/components/layout/TabPanel/TabPanelStore.ts
import { createStore } from 'zustand'
import type { GridApi } from 'ag-grid-community'

// Types for filter state
export interface FilterState {
  preset: string | null
  lifecycleStatus: string[]
  dateRange: { start: Date | null; end: Date | null }
  columnFilters: Record<string, unknown>
}

// Store state and actions
export interface TabPanelState {
  // Grid API reference
  gridApi: GridApi | null

  // Filter state
  filters: FilterState

  // Selected rows (for sidepanel)
  selectedRows: unknown[]

  // Actions
  registerGridApi: (api: GridApi) => void
  unregisterGridApi: () => void

  setPreset: (preset: string | null) => void
  setLifecycleStatus: (status: string[]) => void
  setDateRange: (range: FilterState['dateRange']) => void
  setColumnFilters: (filters: Record<string, unknown>) => void
  resetFilters: () => void

  setSelectedRows: (rows: unknown[]) => void

  // Grid operations (convenience methods)
  refreshGrid: () => void
  exportToExcel: () => void
}

const initialFilterState: FilterState = {
  preset: null,
  lifecycleStatus: [],
  dateRange: { start: null, end: null },
  columnFilters: {},
}

// Factory function to create store instances
export const createTabPanelStore = () => {
  return createStore<TabPanelState>((set, get) => ({
    // Initial state
    gridApi: null,
    filters: initialFilterState,
    selectedRows: [],

    // Grid API management
    registerGridApi: (api) => set({ gridApi: api }),
    unregisterGridApi: () => set({ gridApi: null }),

    // Filter actions
    setPreset: (preset) => {
      set((state) => ({
        filters: { ...state.filters, preset }
      }))
      // Optionally refresh grid when preset changes
      get().refreshGrid()
    },

    setLifecycleStatus: (lifecycleStatus) => {
      set((state) => ({
        filters: { ...state.filters, lifecycleStatus }
      }))
      get().refreshGrid()
    },

    setDateRange: (dateRange) => {
      set((state) => ({
        filters: { ...state.filters, dateRange }
      }))
      get().refreshGrid()
    },

    setColumnFilters: (columnFilters) => {
      set((state) => ({
        filters: { ...state.filters, columnFilters }
      }))
      // Column filters handled by AG Grid directly
    },

    resetFilters: () => {
      set({ filters: initialFilterState })
      get().refreshGrid()
    },

    // Row selection
    setSelectedRows: (selectedRows) => set({ selectedRows }),

    // Grid operations
    refreshGrid: () => {
      const { gridApi } = get()
      if (gridApi) {
        // For server-side row model, purge cache and refetch
        gridApi.refreshServerSide({ purge: true })
      }
    },

    exportToExcel: () => {
      const { gridApi } = get()
      if (gridApi) {
        gridApi.exportDataAsExcel()
      }
    },
  }))
}

// Type for the store instance
export type TabPanelStore = ReturnType<typeof createTabPanelStore>
```

### 2. TabPanelContext (Context + Hooks)

```typescript
// src/components/layout/TabPanel/TabPanelContext.tsx
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { TabPanelStore, TabPanelState } from './TabPanelStore'

// Context holds the store instance (not the state)
const TabPanelContext = createContext<TabPanelStore | null>(null)

// Provider component
export function TabPanelProvider({
  store,
  children
}: {
  store: TabPanelStore
  children: React.ReactNode
}) {
  return (
    <TabPanelContext.Provider value={store}>
      {children}
    </TabPanelContext.Provider>
  )
}

// Hook to access the store
export function useTabPanelStore<T>(
  selector: (state: TabPanelState) => T
): T {
  const store = useContext(TabPanelContext)
  if (!store) {
    throw new Error('useTabPanelStore must be used within TabPanelProvider')
  }
  return useStore(store, selector)
}

// Hook to get the raw store (for passing to sidepanels)
export function useTabPanelStoreInstance(): TabPanelStore {
  const store = useContext(TabPanelContext)
  if (!store) {
    throw new Error('useTabPanelStoreInstance must be used within TabPanelProvider')
  }
  return store
}
```

### 3. TabPanel Component

```typescript
// src/components/layout/TabPanel/TabPanel.tsx
import { useRef, useEffect, type ReactNode } from 'react'
import { createTabPanelStore } from './TabPanelStore'
import { TabPanelProvider } from './TabPanelContext'
import styles from './TabPanel.module.css'

interface TabPanelProps {
  children: ReactNode
}

export function TabPanel({ children }: TabPanelProps) {
  // Create store instance once per TabPanel mount
  // useRef ensures the same store persists across re-renders
  const storeRef = useRef<ReturnType<typeof createTabPanelStore>>()

  if (!storeRef.current) {
    storeRef.current = createTabPanelStore()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unregister grid API to prevent memory leaks
      storeRef.current?.getState().unregisterGridApi()
    }
  }, [])

  return (
    <TabPanelProvider store={storeRef.current}>
      <div className={styles.tabPanel}>
        {children}
      </div>
    </TabPanelProvider>
  )
}
```

### 4. TabFilterSection Component

```typescript
// src/components/layout/TabPanel/TabFilterSection.tsx
import type { ReactNode } from 'react'
import styles from './TabPanel.module.css'

interface TabFilterSectionProps {
  children: ReactNode
}

export function TabFilterSection({ children }: TabFilterSectionProps) {
  return (
    <div className={styles.filterSection}>
      {children}
    </div>
  )
}
```

### 5. TabGridSection Component

```typescript
// src/components/layout/TabPanel/TabGridSection.tsx
import type { ReactNode } from 'react'
import styles from './TabPanel.module.css'

interface TabGridSectionProps {
  children: ReactNode
}

export function TabGridSection({ children }: TabGridSectionProps) {
  return (
    <div className={styles.gridSection}>
      {children}
    </div>
  )
}
```

### 6. CSS Styles

```css
/* src/components/layout/TabPanel/TabPanel.module.css */
.tabPanel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 1rem;
}

.filterSection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-shrink: 0;
}

.gridSection {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
```

---

## Usage Examples

### Example 1: FxCash Tab Implementation

```typescript
// src/pages/app/trade-activity/block-level/fx-cash/FxCashTab.tsx
import { TabPanel, TabFilterSection, TabGridSection } from '@/components/layout/TabPanel'
import { PresetDropdown } from '@/components/filters/PresetDropdown'
import { LifecycleChips } from '@/components/filters/LifecycleChips'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { ColumnFiltersDropdown } from '@/components/filters/ColumnFiltersDropdown'
import { ExportButton } from '@/components/filters/ExportButton'
import { ServerSideGrid } from '@/components/grid/ServerSideGrid'
import { fxCashColumnDefs } from './columnDefs'
import { fxCashDatasource } from './datasource'

export function FxCashTab() {
  return (
    <TabPanel>
      <TabFilterSection>
        {/* Row 1: Preset */}
        <div className="filter-row">
          <PresetDropdown presetKey="fxCash" />
        </div>

        {/* Row 2: Chips + Filters + Actions */}
        <div className="filter-row">
          <LifecycleChips />
          <DateRangePicker />
          <ColumnFiltersDropdown />
          <ExportButton />
        </div>
      </TabFilterSection>

      <TabGridSection>
        <ServerSideGrid
          columnDefs={fxCashColumnDefs}
          datasource={fxCashDatasource}
        />
      </TabGridSection>
    </TabPanel>
  )
}
```

### Example 2: Filter Component Using Store

```typescript
// src/components/filters/LifecycleChips/LifecycleChips.tsx
import { useTabPanelStore } from '@/components/layout/TabPanel'
import styles from './LifecycleChips.module.css'

const LIFECYCLE_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'history', label: 'History', color: 'gray' },
]

export function LifecycleChips() {
  // Subscribe only to the specific state slice
  const selectedStatus = useTabPanelStore((state) => state.filters.lifecycleStatus)
  const setLifecycleStatus = useTabPanelStore((state) => state.setLifecycleStatus)

  const toggleStatus = (value: string) => {
    if (selectedStatus.includes(value)) {
      setLifecycleStatus(selectedStatus.filter((s) => s !== value))
    } else {
      setLifecycleStatus([...selectedStatus, value])
    }
  }

  return (
    <div className={styles.chips}>
      {LIFECYCLE_OPTIONS.map((option) => (
        <button
          key={option.value}
          className={`${styles.chip} ${styles[option.color]} ${
            selectedStatus.includes(option.value) ? styles.selected : ''
          }`}
          onClick={() => toggleStatus(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

### Example 3: ServerSideGrid Registering API

```typescript
// src/components/grid/ServerSideGrid/ServerSideGrid.tsx
import { useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { GridReadyEvent } from 'ag-grid-community'
import { useTabPanelStore } from '@/components/layout/TabPanel'

interface ServerSideGridProps {
  columnDefs: ColDef[]
  datasource: IServerSideDatasource
}

export function ServerSideGrid({ columnDefs, datasource }: ServerSideGridProps) {
  const registerGridApi = useTabPanelStore((state) => state.registerGridApi)
  const filters = useTabPanelStore((state) => state.filters)

  const onGridReady = useCallback((event: GridReadyEvent) => {
    // Register the grid API with the store
    registerGridApi(event.api)

    // Set up the datasource
    event.api.setGridOption('serverSideDatasource', datasource)
  }, [registerGridApi, datasource])

  return (
    <div className="ag-theme-alpine" style={{ flex: 1 }}>
      <AgGridReact
        columnDefs={columnDefs}
        rowModelType="serverSide"
        onGridReady={onGridReady}
        // ... other props
      />
    </div>
  )
}
```

### Example 4: Sidepanel Accessing Grid Data

```typescript
// src/components/sidepanels/RowDetailsSidepanel.tsx
import { useStore } from 'zustand'
import type { TabPanelStore } from '@/components/layout/TabPanel'
import styles from './RowDetailsSidepanel.module.css'

interface RowDetailsSidepanelProps {
  store: TabPanelStore  // Store passed as prop
  onClose: () => void
}

export function RowDetailsSidepanel({ store, onClose }: RowDetailsSidepanelProps) {
  // Use the passed store directly
  const selectedRows = useStore(store, (state) => state.selectedRows)
  const gridApi = useStore(store, (state) => state.gridApi)

  if (selectedRows.length === 0) {
    return (
      <div className={styles.sidepanel}>
        <p>No row selected</p>
      </div>
    )
  }

  const selectedRow = selectedRows[0]

  return (
    <div className={styles.sidepanel}>
      <header>
        <h2>Row Details</h2>
        <button onClick={onClose}>Close</button>
      </header>
      <div className={styles.content}>
        {/* Display row details */}
        <pre>{JSON.stringify(selectedRow, null, 2)}</pre>
      </div>
    </div>
  )
}

// Usage in parent component:
function FxCashTab() {
  const [sidepanelOpen, setSidepanelOpen] = useState(false)
  const store = useTabPanelStoreInstance()

  return (
    <TabPanel>
      {/* ... filter and grid sections ... */}

      {sidepanelOpen && (
        <Portal>
          <RowDetailsSidepanel
            store={store}
            onClose={() => setSidepanelOpen(false)}
          />
        </Portal>
      )}
    </TabPanel>
  )
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           TabPanel                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Zustand Store Instance                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │  gridApi    │  │   filters   │  │    selectedRows     │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │  │
│  └─────────┼────────────────┼────────────────────┼──────────────┘  │
│            │                │                    │                  │
│     ┌──────┴──────┐   ┌─────┴─────┐        ┌─────┴─────┐           │
│     │             │   │           │        │           │           │
│  ┌──▼───────────┐ │ ┌─▼─────────┐ │      ┌─▼─────────┐ │           │
│  │ ServerSide   │ │ │  Preset   │ │      │ Sidepanel │ │           │
│  │ Grid         │◄┼─┤  Dropdown │ │      │ (Portal)  │ │           │
│  │              │ │ └───────────┘ │      └───────────┘ │           │
│  │  registers   │ │ ┌───────────┐ │                    │           │
│  │  gridApi     │ │ │ Lifecycle │ │                    │           │
│  │              │◄┼─┤ Chips     │ │                    │           │
│  │  refreshes   │ │ └───────────┘ │                    │           │
│  │  on filter   │ │ ┌───────────┐ │                    │           │
│  │  changes     │ │ │ Date      │ │                    │           │
│  │              │◄┼─┤ Picker    │ │                    │           │
│  └──────────────┘ │ └───────────┘ │                    │           │
│                   │               │                    │           │
│  TabGridSection   │ TabFilterSection                   │           │
└───────────────────┴───────────────┴────────────────────┴───────────┘

Legend:
  ─────►  Data flow / subscription
  ◄─────  Action dispatch (triggers refresh)
```

---

## Filter to Grid Communication Flow

```
1. User clicks "Pending" chip
         │
         ▼
2. LifecycleChips component calls:
   setLifecycleStatus(['pending'])
         │
         ▼
3. Zustand store updates:
   filters.lifecycleStatus = ['pending']
         │
         ▼
4. setLifecycleStatus action calls:
   get().refreshGrid()
         │
         ▼
5. refreshGrid() calls:
   gridApi.refreshServerSide({ purge: true })
         │
         ▼
6. AG Grid triggers datasource.getRows()
         │
         ▼
7. Datasource reads filters from store:
   const filters = store.getState().filters
         │
         ▼
8. API call with new filters:
   GET /api/trades?lifecycleStatus=pending
         │
         ▼
9. Grid displays filtered data
```

---

## Datasource Integration

The datasource needs access to the store to read current filters:

```typescript
// src/pages/app/trade-activity/block-level/fx-cash/datasource.ts
import type { IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community'
import type { TabPanelStore } from '@/components/layout/TabPanel'
import { api } from '@/api'

export function createFxCashDatasource(store: TabPanelStore): IServerSideDatasource {
  return {
    getRows: async (params: IServerSideGetRowsParams) => {
      const { startRow, endRow, sortModel, filterModel } = params.request

      // Get current filters from store
      const { filters } = store.getState()

      try {
        const response = await api.get('/trades/fx-cash', {
          params: {
            startRow,
            endRow,
            sortModel: JSON.stringify(sortModel),
            filterModel: JSON.stringify(filterModel),
            // Include store filters
            lifecycleStatus: filters.lifecycleStatus,
            dateFrom: filters.dateRange.start?.toISOString(),
            dateTo: filters.dateRange.end?.toISOString(),
            preset: filters.preset,
          },
        })

        params.success({
          rowData: response.data.rows,
          rowCount: response.data.totalCount,
        })
      } catch (error) {
        params.fail()
      }
    },
  }
}
```

---

## Key Benefits of This Architecture

1. **Separation of Concerns**
   - TabLayout: Tab navigation only
   - TabPanel: State management scope
   - TabFilterSection: Filter UI container
   - TabGridSection: Grid UI container
   - Filter components: Individual filter logic

2. **Reusability**
   - Same filter components work across all tabs
   - TabPanel structure is consistent
   - Easy to add new tabs with same pattern

3. **Performance**
   - Zustand's selective subscriptions prevent unnecessary re-renders
   - Only components subscribed to changed state update

4. **Flexibility**
   - Sidepanels can access store via prop
   - Filters can be composed differently per tab
   - Easy to add new filter types

5. **Testability**
   - Store can be tested independently
   - Components can be tested with mock store
   - Clear data flow makes debugging easier

---

## Migration Path

1. **Phase 1**: Create TabPanel infrastructure (store, context, components)
2. **Phase 2**: Update ServerSideGrid to register API with store
3. **Phase 3**: Create basic filter components (preset, chips)
4. **Phase 4**: Integrate filters with existing tabs
5. **Phase 5**: Add sidepanel support

---

## Deep Dive: How Zustand Store and React Context Work Together

This section explains the relationship between Zustand and React Context in our architecture.

### The Problem: Multiple Stores for Multiple Tabs

Consider the BlockLevel page with two tabs: **FxCash** and **FxOptions**.

```
BlockLevel Page
├── FxCash Tab      → needs its own gridApi, filters, selectedRows
└── FxOptions Tab   → needs its own gridApi, filters, selectedRows
```

If we used a **single global Zustand store**, we'd have conflicts:
- Which `gridApi` is active?
- Which `filters` apply to which grid?
- When user switches tabs, state gets mixed up

### The Solution: Store Instances + Context for Scoping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         React Context Layer                             │
│   (Scopes which store instance components should use)                   │
│                                                                         │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │  FxCash Tab Context         │    │  FxOptions Tab Context      │   │
│   │  provides: fxCashStore      │    │  provides: fxOptionsStore   │   │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘   │
│                  │                                  │                   │
└──────────────────┼──────────────────────────────────┼───────────────────┘
                   │                                  │
┌──────────────────▼──────────────────────────────────▼───────────────────┐
│                         Zustand Store Layer                             │
│   (Actual state management - each store is independent)                 │
│                                                                         │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │  fxCashStore (instance)     │    │  fxOptionsStore (instance)  │   │
│   │  ├─ gridApi: GridApi        │    │  ├─ gridApi: GridApi        │   │
│   │  ├─ filters: {...}          │    │  ├─ filters: {...}          │   │
│   │  └─ selectedRows: [...]     │    │  └─ selectedRows: [...]     │   │
│   └─────────────────────────────┘    └─────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step: What Happens When a Tab Renders

```typescript
// When FxCash tab mounts:

1. TabPanel component creates a NEW store instance
   const storeRef = useRef<TabPanelStore>()
   if (!storeRef.current) {
     storeRef.current = createTabPanelStore()  // Creates fresh Zustand store
   }

2. TabPanel wraps children in Context Provider
   <TabPanelContext.Provider value={storeRef.current}>
     {children}
   </TabPanelContext.Provider>

3. Child components use useTabPanelStore() hook
   // Inside LifecycleChips:
   const setLifecycleStatus = useTabPanelStore(state => state.setLifecycleStatus)

   // This hook:
   // a) Gets store instance from Context
   // b) Subscribes to that specific store using Zustand's useStore

4. When user switches to FxOptions tab:
   - FxCash tab unmounts (store instance is garbage collected)
   - FxOptions tab mounts (creates its OWN new store instance)
   - All components now subscribe to FxOptions store
```

### Why Context is Needed (Not Just Zustand)

| Without Context | With Context |
|-----------------|--------------|
| `const gridApi = useFxCashStore(s => s.gridApi)` | `const gridApi = useTabPanelStore(s => s.gridApi)` |
| Component hardcoded to specific store | Component works with ANY tab's store |
| Need different hooks for each tab | Single hook, store determined by context |
| Can't reuse filter components | Same `<LifecycleChips />` works everywhere |

### Visual: Context Lookup Flow

```
Component calls useTabPanelStore(selector)
         │
         ▼
┌─────────────────────────────────────┐
│  1. Get store from Context          │
│     const store = useContext(       │
│       TabPanelContext               │
│     )                               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Subscribe to store with         │
│     Zustand's useStore              │
│     return useStore(store, selector)│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Component re-renders ONLY when  │
│     selected state slice changes    │
│     (Zustand's selective subscribe) │
└─────────────────────────────────────┘
```

### Code: The Hook Implementation Explained

```typescript
// This is the magic that combines Context + Zustand

export function useTabPanelStore<T>(
  selector: (state: TabPanelState) => T
): T {
  // Step 1: Get the store INSTANCE from Context
  // This is NOT the state, it's the store object itself
  const store = useContext(TabPanelContext)

  if (!store) {
    throw new Error('useTabPanelStore must be used within TabPanelProvider')
  }

  // Step 2: Subscribe to that store using Zustand's useStore
  // The selector determines which part of state to subscribe to
  // Component only re-renders when selected value changes
  return useStore(store, selector)
}
```

### Key Insight: Context Holds Store Reference, Not State

```typescript
// WRONG mental model:
// Context holds: { gridApi: GridApi, filters: {...} }

// CORRECT mental model:
// Context holds: store (object with getState, setState, subscribe methods)
// Zustand manages: { gridApi: GridApi, filters: {...} }
```

This is why sidepanels can receive the store as a prop and subscribe independently:

```typescript
// Sidepanel receives store reference, not state
function Sidepanel({ store }: { store: TabPanelStore }) {
  // Subscribe to store directly using Zustand
  const selectedRows = useStore(store, s => s.selectedRows)
}
```

---

## Block Level Page: Complete Architecture Example

### Route Structure

```
/trade-activity/block-level
├── /fx-cash      → FxCashTab component
└── /fx-options   → FxOptionsTab component
```

### Component Tree with Panels

```
<BlockLevelPage>                              # Route: /trade-activity/block-level
│
├── <TabLayout tabs={[...]}>                  # Tab navigation (FX Cash | FX Options)
│   └── <Outlet />                            # Renders active tab
│       │
│       ├── <FxCashTab>                       # Route: .../fx-cash
│       │   └── <TabPanel>                    # Creates fxCashStore
│       │       ├── <TabFilterSection>
│       │       │   ├── <PresetDropdown />
│       │       │   └── <FilterChipsRow />
│       │       └── <TabGridSection>
│       │           └── <ServerSideGrid />
│       │
│       └── <FxOptionsTab>                    # Route: .../fx-options
│           └── <TabPanel>                    # Creates fxOptionsStore
│               ├── <TabFilterSection>
│               │   ├── <PresetDropdown />
│               │   └── <FilterChipsRow />
│               └── <TabGridSection>
│                   └── <ServerSideGrid />
│
├── <SidePanelContainer>                      # Right side panels (0-3 active)
│   ├── <TradeDetailsSidepanel store={...} />
│   ├── <AllocationSidepanel store={...} />
│   └── <AuditHistorySidepanel store={...} />
│
└── <BottomPanelContainer>                    # Bottom panel (0-1 active)
    └── <BulkEditBottomPanel store={...} />
```

---

## Panel System Architecture

### Requirements

1. **Sidepanels** (from right): Up to 2-3 can be open simultaneously
2. **Bottom panel**: Only 1 can be open at a time
3. **Mutual exclusivity**: When bottom panel opens, sidepanels close (and vice versa)
4. **Grid access**: All panels need access to the current tab's store

### Panel State Store

We need a **separate global store** for panel management (not per-tab):

```typescript
// src/stores/panelStore.ts
import { create } from 'zustand'
import type { TabPanelStore } from '@/components/layout/TabPanel'

// Panel type definitions
export type SidePanelType =
  | 'trade-details'
  | 'allocation'
  | 'audit-history'
  | 'counterparty'

export type BottomPanelType =
  | 'bulk-edit'
  | 'comparison'

interface PanelState {
  // Active panels
  activeSidePanels: SidePanelType[]      // Max 3 panels
  activeBottomPanel: BottomPanelType | null

  // Reference to current tab's store (for panels to access grid)
  currentTabStore: TabPanelStore | null

  // Side panel actions
  openSidePanel: (panel: SidePanelType) => void
  closeSidePanel: (panel: SidePanelType) => void
  toggleSidePanel: (panel: SidePanelType) => void
  closeAllSidePanels: () => void

  // Bottom panel actions
  openBottomPanel: (panel: BottomPanelType) => void
  closeBottomPanel: () => void
  toggleBottomPanel: (panel: BottomPanelType) => void

  // Tab store registration
  setCurrentTabStore: (store: TabPanelStore | null) => void
}

const MAX_SIDE_PANELS = 3

export const usePanelStore = create<PanelState>((set, get) => ({
  activeSidePanels: [],
  activeBottomPanel: null,
  currentTabStore: null,

  // Side panel actions
  openSidePanel: (panel) => {
    const { activeSidePanels, activeBottomPanel } = get()

    // If bottom panel is open, close it first
    if (activeBottomPanel) {
      set({ activeBottomPanel: null })
    }

    // Don't add if already open
    if (activeSidePanels.includes(panel)) return

    // Enforce max limit (remove oldest if at limit)
    let newPanels = [...activeSidePanels, panel]
    if (newPanels.length > MAX_SIDE_PANELS) {
      newPanels = newPanels.slice(-MAX_SIDE_PANELS)
    }

    set({ activeSidePanels: newPanels })
  },

  closeSidePanel: (panel) => {
    set((state) => ({
      activeSidePanels: state.activeSidePanels.filter(p => p !== panel)
    }))
  },

  toggleSidePanel: (panel) => {
    const { activeSidePanels } = get()
    if (activeSidePanels.includes(panel)) {
      get().closeSidePanel(panel)
    } else {
      get().openSidePanel(panel)
    }
  },

  closeAllSidePanels: () => {
    set({ activeSidePanels: [] })
  },

  // Bottom panel actions
  openBottomPanel: (panel) => {
    // Close all side panels when opening bottom panel
    set({
      activeBottomPanel: panel,
      activeSidePanels: []
    })
  },

  closeBottomPanel: () => {
    set({ activeBottomPanel: null })
  },

  toggleBottomPanel: (panel) => {
    const { activeBottomPanel } = get()
    if (activeBottomPanel === panel) {
      get().closeBottomPanel()
    } else {
      get().openBottomPanel(panel)
    }
  },

  // Tab store registration (called when tab mounts/unmounts)
  setCurrentTabStore: (store) => {
    set({ currentTabStore: store })
  },
}))
```

### Visual: Panel Layout (Overlay Style)

Side panels are **overlays** - they don't reduce main content width.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Title Section (78px)                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │              Main Content Area (FULL WIDTH)                           │  │
│  │           (TabLayout + TabPanel)                                      │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Filter Section                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                                 │  │  │
│  │  │              AG Grid                                            │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                         ┌─────────────────┐ │
│                                                         │  Side Panel 1   │ │
│       Side panels OVERLAY on top                        │  (Overlay)      │ │
│       position: fixed, right: 0                         ├─────────────────┤ │
│       z-index: 100                                      │  Side Panel 2   │ │
│                                                         │  (Overlay)      │ │
│                                                         ├─────────────────┤ │
│                                                         │  Side Panel 3   │ │
│                                                         │  (Overlay)      │ │
│                                                         └─────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Bottom Panel (Bulk Edit)                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Bulk edit controls, preview, etc.                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### States: Side Panels OR Bottom Panel (Mutually Exclusive)

```
State A: Side Panels Open (Bottom Panel Hidden)
┌─────────────────────────────────────────────────────────────────┐
│  Title (78px)                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │          Main Content (FULL WIDTH)                        │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                             ┌─────┬─────┬─────┐ │
│                                             │ SP1 │ SP2 │ SP3 │ │
│         Overlays on right                   │     │     │     │ │
│                                             └─────┴─────┴─────┘ │
└─────────────────────────────────────────────────────────────────┘

State B: Bottom Panel Open (Side Panels Hidden)
┌─────────────────────────────────────────────────────────────────┐
│  Title (78px)                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Main Content                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Bottom Panel (250px)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Connecting TabPanel Store to Panel System

When a tab mounts, it registers its store with the panel system:

```typescript
// src/components/layout/TabPanel/TabPanel.tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { createTabPanelStore } from './TabPanelStore'
import { TabPanelProvider } from './TabPanelContext'
import { usePanelStore } from '@/stores/panelStore'
import styles from './TabPanel.module.css'

export function TabPanel({ children }: { children: ReactNode }) {
  const storeRef = useRef<ReturnType<typeof createTabPanelStore>>()
  const setCurrentTabStore = usePanelStore(s => s.setCurrentTabStore)

  if (!storeRef.current) {
    storeRef.current = createTabPanelStore()
  }

  // Register this tab's store with the panel system
  useEffect(() => {
    setCurrentTabStore(storeRef.current!)

    return () => {
      // Unregister when tab unmounts
      setCurrentTabStore(null)
      storeRef.current?.getState().unregisterGridApi()
    }
  }, [setCurrentTabStore])

  return (
    <TabPanelProvider store={storeRef.current}>
      <div className={styles.tabPanel}>
        {children}
      </div>
    </TabPanelProvider>
  )
}
```

### Side Panel Component Example

```typescript
// src/components/panels/TradeDetailsSidepanel.tsx
import { useStore } from 'zustand'
import { usePanelStore } from '@/stores/panelStore'
import styles from './Sidepanel.module.css'

export function TradeDetailsSidepanel() {
  // Get the current tab's store from panel store
  const tabStore = usePanelStore(s => s.currentTabStore)
  const closeSidePanel = usePanelStore(s => s.closeSidePanel)

  // Subscribe to the tab's selected rows
  const selectedRows = tabStore
    ? useStore(tabStore, s => s.selectedRows)
    : []

  const selectedRow = selectedRows[0]

  if (!selectedRow) {
    return (
      <div className={styles.sidepanel}>
        <header>
          <h3>Trade Details</h3>
          <button onClick={() => closeSidePanel('trade-details')}>×</button>
        </header>
        <div className={styles.empty}>
          Select a row to view details
        </div>
      </div>
    )
  }

  return (
    <div className={styles.sidepanel}>
      <header>
        <h3>Trade Details</h3>
        <button onClick={() => closeSidePanel('trade-details')}>×</button>
      </header>
      <div className={styles.content}>
        <dl>
          <dt>Trade ID</dt>
          <dd>{selectedRow.tradeId}</dd>
          <dt>Status</dt>
          <dd>{selectedRow.status}</dd>
          {/* ... more fields */}
        </dl>
      </div>
    </div>
  )
}
```

### Bottom Panel Component Example

```typescript
// src/components/panels/BulkEditBottomPanel.tsx
import { useStore } from 'zustand'
import { usePanelStore } from '@/stores/panelStore'
import styles from './BottomPanel.module.css'

export function BulkEditBottomPanel() {
  const tabStore = usePanelStore(s => s.currentTabStore)
  const closeBottomPanel = usePanelStore(s => s.closeBottomPanel)

  const selectedRows = tabStore
    ? useStore(tabStore, s => s.selectedRows)
    : []

  const gridApi = tabStore
    ? useStore(tabStore, s => s.gridApi)
    : null

  const handleBulkUpdate = async (field: string, value: unknown) => {
    // 1. Call API to update rows
    // 2. Refresh grid
    gridApi?.refreshServerSide({ purge: true })
  }

  return (
    <div className={styles.bottomPanel}>
      <header>
        <h3>Bulk Edit ({selectedRows.length} rows selected)</h3>
        <button onClick={closeBottomPanel}>×</button>
      </header>
      <div className={styles.content}>
        {/* Bulk edit form */}
        <select>
          <option>Update Status</option>
          <option>Update Counterparty</option>
        </select>
        <button onClick={() => handleBulkUpdate('status', 'confirmed')}>
          Apply
        </button>
      </div>
    </div>
  )
}
```

### Panel Container in BlockLevel Page

```typescript
// src/pages/app/trade-activity/block-level/BlockLevelPage.tsx
import { Outlet } from '@tanstack/react-router'
import { TabLayout } from '@/components/layout/TabLayout'
import { PageTitle } from '@/components/layout/PageTitle'
import { usePanelStore } from '@/stores/panelStore'
import { TradeDetailsSidepanel } from '@/components/panels/TradeDetailsSidepanel'
import { AllocationSidepanel } from '@/components/panels/AllocationSidepanel'
import { AuditHistorySidepanel } from '@/components/panels/AuditHistorySidepanel'
import { BulkEditBottomPanel } from '@/components/panels/BulkEditBottomPanel'
import styles from './BlockLevelPage.module.css'

const tabs = [
  { label: 'FX Cash', to: '/trade-activity/block-level/fx-cash', count: 100 },
  { label: 'FX Options', to: '/trade-activity/block-level/fx-options', count: 45 },
]

// Map panel types to components
const SIDE_PANEL_COMPONENTS: Record<string, React.ComponentType> = {
  'trade-details': TradeDetailsSidepanel,
  'allocation': AllocationSidepanel,
  'audit-history': AuditHistorySidepanel,
}

const BOTTOM_PANEL_COMPONENTS: Record<string, React.ComponentType> = {
  'bulk-edit': BulkEditBottomPanel,
}

export function BlockLevelPage() {
  const activeSidePanels = usePanelStore(s => s.activeSidePanels)
  const activeBottomPanel = usePanelStore(s => s.activeBottomPanel)

  const hasSidePanels = activeSidePanels.length > 0
  const hasBottomPanel = activeBottomPanel !== null

  return (
    <div className={styles.blockLevelPage}>
      {/* Title Section - 78px fixed height */}
      <PageTitle
        breadcrumbs={['Overview', 'Trade Activity', 'Block Level']}
        title="Block Level"
      />

      {/* Tab Section - remaining height */}
      <div className={styles.tabSection}>
        <TabLayout tabs={tabs}>
          <Outlet />
        </TabLayout>
      </div>

      {/* Bottom panel - mutually exclusive with side panels */}
      {hasBottomPanel && (
        <div className={styles.bottomPanelContainer}>
          {(() => {
            const PanelComponent = BOTTOM_PANEL_COMPONENTS[activeBottomPanel]
            return <PanelComponent />
          })()}
        </div>
      )}

      {/* Side panels container - OVERLAY (position: fixed) */}
      {hasSidePanels && (
        <div className={styles.sidePanelsContainer}>
          {activeSidePanels.map(panelType => {
            const PanelComponent = SIDE_PANEL_COMPONENTS[panelType]
            return <PanelComponent key={panelType} />
          })}
        </div>
      )}
    </div>
  )
}
```

### CSS for Panel Layout (Overlay Style)

```css
/* src/pages/app/trade-activity/block-level/BlockLevelPage.module.css */
.blockLevelPage {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative;        /* For overlay positioning context */
}

.mainContent {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Side panels container - OVERLAY on right */
.sidePanelsContainer {
  position: fixed;
  top: 78px;                 /* Below title section */
  right: 0;
  bottom: 0;
  display: flex;
  gap: 0;
  z-index: 100;
  pointer-events: none;      /* Allow clicks through container */
}

.sidePanelsContainer > * {
  pointer-events: auto;      /* But panels themselves are clickable */
}

/* Bottom panel container */
.bottomPanelContainer {
  flex-shrink: 0;
  height: 250px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
}
```

### Side Panel Component CSS

```css
/* src/components/panels/Sidepanel.module.css */
.sidepanel {
  width: 320px;
  height: 100%;
  background-color: #fff;
  border-left: 1px solid var(--color-border);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidepanel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidepanel header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-muted);
}
```

### Multiple Side Panels Stacked Horizontally

```css
/* When multiple panels are open, they stack horizontally from right */
.sidePanelsContainer {
  /* Panels render in DOM order: first panel appears leftmost */
  /* Visual order from right: SP3 | SP2 | SP1 (newest on left) */
  flex-direction: row-reverse;
}

/* Alternative: Stack vertically (if screen height allows) */
.sidePanelsContainerVertical {
  flex-direction: column;
  width: 320px;
}

.sidePanelsContainerVertical > * {
  flex: 1;
  min-height: 200px;
}
```

---

## Complete Data Flow: From Grid Selection to Side Panel

```
1. User clicks row in AG Grid (FxCash tab)
         │
         ▼
2. Grid's onSelectionChanged fires
   gridApi.getSelectedRows() → [rowData]
         │
         ▼
3. ServerSideGrid calls store action:
   setSelectedRows([rowData])
         │
         ▼
4. FxCash TabPanel store updates:
   selectedRows = [rowData]
         │
         ▼
5. TabPanel registered with PanelStore:
   currentTabStore = fxCashStore
         │
         ▼
6. TradeDetailsSidepanel subscribes to currentTabStore:
   const selectedRows = useStore(tabStore, s => s.selectedRows)
         │
         ▼
7. Sidepanel re-renders with selected row data
         │
         ▼
8. User sees trade details in sidepanel
```

### When User Switches Tabs

```
1. User clicks "FX Options" tab
         │
         ▼
2. FxCash tab unmounts:
   - TabPanel cleanup runs
   - setCurrentTabStore(null)
         │
         ▼
3. FxOptions tab mounts:
   - New TabPanel creates fxOptionsStore
   - setCurrentTabStore(fxOptionsStore)
         │
         ▼
4. Sidepanel now subscribed to fxOptionsStore:
   - selectedRows from FxOptions (likely empty)
   - Sidepanel shows "Select a row to view details"
```

---

## Summary: Store + Context Architecture

| Layer | Responsibility | Scope |
|-------|---------------|-------|
| **Zustand Store Factory** | Creates store instances with state + actions | Per-tab |
| **React Context** | Provides store instance to child components | Per-tab subtree |
| **useTabPanelStore hook** | Gets store from context, subscribes with selector | Component |
| **Panel Store** | Manages which panels are open, holds current tab store reference | Global |
| **Panels** | Subscribe to currentTabStore from Panel Store | Global |

This architecture provides:
- **Isolation**: Each tab has its own store instance
- **Flexibility**: Sidepanels/bottom panels can access any tab's store
- **Performance**: Selective subscriptions prevent unnecessary re-renders
- **Scalability**: Easy to add new panel types or filter components

---

## Related Documentation

- [TanStack Query Cache Deep Dive](./18-tanstack-query-cache-deep-dive.md)
- [API Layer Architecture](./03-api-layer.md)
- [AG Grid Server-Side Row Model](./14-ag-grid-ssrm.md)
