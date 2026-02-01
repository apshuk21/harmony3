# Page with Tab Layout - Complete Guide

This document explains the page layout architecture using the **Block Level** page as an example. It covers both the current implementation and the planned TabPanel architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [Visual Layout](#visual-layout)
3. [Component Hierarchy](#component-hierarchy)
4. [Current Implementation](#current-implementation)
5. [CSS Flex Chain](#css-flex-chain)
6. [Code Flow: From Route to Render](#code-flow-from-route-to-render)
7. [Future: TabPanel Architecture](#future-tabpanel-architecture)
8. [File Reference](#file-reference)

---

## Overview

Every authenticated page with tabs follows this structure:

```
┌─────────────────────────────────────────────────────────────┐
│  PageTitle (78px fixed)                                     │
│  - Breadcrumbs                                              │
│  - Title + optional action buttons                          │
├─────────────────────────────────────────────────────────────┤
│  Tab Section (remaining height = 100% - 78px)               │
│                                                             │
│  [Tab 1] [Tab 2]     ← TabNav (content-based height)       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  White Card (flex: 1)                                 │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Filter Section (optional, content-based)       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Grid Section (flex: 1, takes remaining space)  │  │  │
│  │  │                                                 │  │  │
│  │  │  Only this section scrolls (AG Grid internal)   │  │  │
│  │  │                                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

NO PAGE-LEVEL SCROLL - Only AG Grid has internal scroll
```

---

## Visual Layout

### Block Level Page Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Overview / Trade Activity / Block Level          ← Breadcrumbs        │
│  Block Level                                      ← Title (h1)         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    [FX Cash 100] [FX Options 45]                  ← Tab buttons        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  Status: [All ▼]  Search: [____________]                    │  │  │
│  │  │  (Current filter controls in FxCashTab)                     │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  Trade ID │ Currency │ Buy CCY │ Sell CCY │ Amount │ ...    │  │  │
│  │  ├─────────────────────────────────────────────────────────────┤  │  │
│  │  │  FX-001   │ EUR/USD  │ EUR     │ USD      │ 1,000  │ ...    │  │  │
│  │  │  FX-002   │ GBP/USD  │ GBP     │ USD      │ 2,500  │ ...    │  │  │
│  │  │  FX-003   │ USD/JPY  │ USD     │ JPY      │ 5,000  │ ...    │  │  │
│  │  │  ...      │ ...      │ ...     │ ...      │ ...    │ ...    │  │  │
│  │  │           │          │         │          │        │        │  │  │
│  │  │                    AG Grid scrolls here                     │  │  │
│  │  │                                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### Current Implementation

```
AppLayout                           # src/routes/_authenticated/_app.tsx
└── .app-layout
    ├── Sidebar                     # Fixed width: 250px
    └── .app-main
        ├── .app-header             # Header with user info
        └── .app-content            # Gray background, flex: 1
            │
            └── <Outlet />          # Renders the page component
                │
                └── BlockLevelPage  # /trade-activity/block-level route
                    │
                    └── PageLayout
                        ├── PageTitle           # 78px fixed
                        │   ├── Breadcrumbs
                        │   └── Title
                        │
                        └── .tab-section        # flex: 1
                            │
                            └── TabLayout
                                ├── .tabNav     # Tab buttons
                                │   ├── Link (FX Cash)
                                │   └── Link (FX Options)
                                │
                                └── .tabCard    # White card, flex: 1
                                    │
                                    └── .tab-content
                                        │
                                        └── <Outlet />  # Active tab
                                            │
                                            └── FxCashTab
                                                ├── Filter controls
                                                └── ServerSideGrid
```

### File Locations

```
src/
├── routes/
│   └── _authenticated/
│       └── _app/
│           └── trade-activity/
│               └── block-level/
│                   ├── route.tsx          # BlockLevelPage
│                   ├── fx-cash/
│                   │   └── route.tsx      # FxCashTab
│                   └── fx-options/
│                       └── route.tsx      # FxOptionsTab
│
├── pages/
│   └── app/
│       └── trade-activity/
│           └── block-level/
│               ├── BlockLevelPage.tsx
│               ├── FxCashTab.tsx
│               ├── FxCashTab.module.css
│               └── FxOptionsTab.tsx
│
└── components/
    └── layout/
        ├── index.ts
        ├── PageLayout.tsx
        ├── PageTitle.tsx
        ├── PageTitle.module.css
        ├── TabLayout.tsx
        └── TabLayout.module.css
```

---

## Current Implementation

### 1. BlockLevelPage.tsx

The entry point for the Block Level page. Composes `PageLayout` and `TabLayout`.

```tsx
// src/pages/app/trade-activity/block-level/BlockLevelPage.tsx

import { Outlet } from '@tanstack/react-router'
import { PageLayout, TabLayout } from '@/components/layout'

const tabs = [
  { label: 'FX Cash', to: '/trade-activity/block-level/fx-cash', count: 100 },
  { label: 'FX Options', to: '/trade-activity/block-level/fx-options', count: 45 },
]

export function BlockLevelPage() {
  return (
    <PageLayout title="Block Level" breadcrumbs={['Overview', 'Trade Activity', 'Block Level']}>
      <TabLayout tabs={tabs}>
        <Outlet /> {/* Renders FxCashTab or FxOptionsTab based on route */}
      </TabLayout>
    </PageLayout>
  )
}
```

### 2. PageLayout.tsx

Wraps every page with consistent structure: PageTitle (78px) + tab-section.

```tsx
// src/components/layout/PageLayout.tsx

import type { ReactNode } from 'react'
import { PageTitle } from './PageTitle'

interface PageLayoutProps {
  title: string
  breadcrumbs?: string[]
  actions?: ReactNode
  children: ReactNode
}

export function PageLayout({ title, breadcrumbs, actions, children }: PageLayoutProps) {
  return (
    <div className="page">
      {/* Fixed 78px height */}
      <PageTitle title={title} breadcrumbs={breadcrumbs} actions={actions} />

      {/* Takes remaining height */}
      <div className="tab-section">{children}</div>
    </div>
  )
}
```

### 3. PageTitle.tsx

Fixed 78px height section with breadcrumbs and title.

```tsx
// src/components/layout/PageTitle.tsx

import type { ReactNode } from 'react'
import styles from './PageTitle.module.css'

interface PageTitleProps {
  breadcrumbs?: string[]
  title: string
  actions?: ReactNode
}

export function PageTitle({ breadcrumbs, title, actions }: PageTitleProps) {
  return (
    <div className={styles.pageTitle}>
      {' '}
      {/* height: 78px, flex-shrink: 0 */}
      {breadcrumbs && (
        <nav className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.separator}>/</span>}
              <span className={i === breadcrumbs.length - 1 ? styles.current : ''}>{crumb}</span>
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

### 4. TabLayout.tsx

Renders tab navigation above a white card. Children (Outlet) render inside the card.

```tsx
// src/components/layout/TabLayout.tsx

import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import styles from './TabLayout.module.css'

interface Tab {
  label: string
  to: string
  count?: number
}

interface TabLayoutProps {
  tabs: Tab[]
  children: ReactNode
}

export function TabLayout({ tabs, children }: TabLayoutProps) {
  return (
    <div className={styles.tabLayoutWrapper}>
      {' '}
      {/* flex: 1, min-height: 0 */}
      {/* Tab buttons - sits above the white card */}
      <nav className={styles.tabNav}>
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={styles.tabLink}
            activeProps={{ className: `${styles.tabLink} ${styles.tabLinkActive}` }}
          >
            {tab.label}
            {tab.count !== undefined && <span className={styles.tabCount}>{tab.count}</span>}
          </Link>
        ))}
      </nav>
      {/* White card containing tab content */}
      <div className={styles.tabCard}>
        {' '}
        {/* flex: 1, white background */}
        <div className="tab-content">
          {' '}
          {/* flex: 1, min-height: 0 */}
          {children}
        </div>
      </div>
    </div>
  )
}
```

### 5. FxCashTab.tsx (Current Structure)

The actual tab content. Currently has inline filter controls and grid.

```tsx
// src/pages/app/trade-activity/block-level/FxCashTab.tsx (simplified)

export function FxCashTab() {
  return (
    <div
      className="tab-panel"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* Filter controls - currently inline */}
      <div className={styles.tabHeader}>
        <select>...</select>
        <input type="text" placeholder="Search..." />
      </div>

      {/* Grid container - takes remaining space */}
      <div className={localStyles.gridContainer}>
        {' '}
        {/* flex: 1, min-height: 0 */}
        <ServerSideGrid columnDefs={columnDefs} fetchUrl="/api/fx-cash" height="100%" />
      </div>
    </div>
  )
}
```

---

## CSS Flex Chain

For the grid to fill available space without page scroll, every container in the chain must propagate height correctly.

### The Chain

```
.app-layout          height: 100vh
    │
    └── .app-main    flex: 1, min-height: 0
        │
        └── .app-content    flex: 1, min-height: 0
            │
            └── .page       height: 100%, min-height: 0
                │
                ├── PageTitle       height: 78px, flex-shrink: 0
                │
                └── .tab-section    flex: 1, min-height: 0
                    │
                    └── .tabLayoutWrapper    flex: 1, min-height: 0
                        │
                        ├── .tabNav          flex-shrink: 0
                        │
                        └── .tabCard         flex: 1, min-height: 0
                            │
                            └── .tab-content    flex: 1, min-height: 0
                                │
                                └── .tab-panel    flex: 1, min-height: 0
                                    │
                                    ├── Filter      flex-shrink: 0
                                    │
                                    └── Grid        flex: 1, min-height: 0
```

### Key CSS Properties

| Property                                | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `display: flex; flex-direction: column` | Enables vertical flex layout                   |
| `flex: 1`                               | Grow to fill available space                   |
| `min-height: 0`                         | Allow shrinking below content size (critical!) |
| `flex-shrink: 0`                        | Prevent shrinking (for fixed-height elements)  |
| `overflow: hidden`                      | Prevent scroll at this level                   |

### Why `min-height: 0` Matters

By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. This breaks the height chain because a parent can't constrain its children.

```css
/* Without min-height: 0 */
.container {
  height: 500px;
  display: flex;
  flex-direction: column;
}
.child {
  flex: 1;
  /* Child won't shrink if content is > 500px */
  /* Results in overflow/scroll at page level */
}

/* With min-height: 0 */
.child {
  flex: 1;
  min-height: 0; /* Now child can shrink, content scrolls inside */
}
```

---

## Code Flow: From Route to Render

### Step 1: Route Definition

```tsx
// src/routes/_authenticated/_app/trade-activity/block-level/route.tsx

import { createFileRoute } from '@tanstack/react-router'
import { BlockLevelPage } from '@/pages/app/trade-activity/block-level/BlockLevelPage'

export const Route = createFileRoute('/_authenticated/_app/trade-activity/block-level')({
  component: BlockLevelPage,
})
```

### Step 2: User Navigates to `/trade-activity/block-level/fx-cash`

```
URL: /trade-activity/block-level/fx-cash

Route matching:
1. /_authenticated          → Auth check, wraps with auth context
2. /_authenticated/_app     → AppLayout (sidebar + header + content area)
3. .../block-level          → BlockLevelPage (PageLayout + TabLayout)
4. .../block-level/fx-cash  → FxCashTab (rendered in Outlet)
```

### Step 3: Component Render Tree

```tsx
// Final rendered structure:

<AuthProvider>                          {/* From _authenticated */}
  <div className="app-layout">          {/* From _app */}
    <Sidebar />
    <main className="app-main">
      <header className="app-header">...</header>
      <div className="app-content">

        {/* BlockLevelPage starts here */}
        <div className="page">
          <div className="pageTitle">     {/* PageTitle */}
            <nav>Overview / Trade Activity / Block Level</nav>
            <h1>Block Level</h1>
          </div>

          <div className="tab-section">
            <div className="tabLayoutWrapper">  {/* TabLayout */}
              <nav className="tabNav">
                <a href=".../fx-cash" class="tabLink tabLinkActive">FX Cash 100</a>
                <a href=".../fx-options" class="tabLink">FX Options 45</a>
              </nav>

              <div className="tabCard">
                <div className="tab-content">

                  {/* FxCashTab starts here (from Outlet) */}
                  <div className="tab-panel">
                    <div className="tabHeader">
                      <select>...</select>
                      <input />
                    </div>
                    <div className="gridContainer">
                      <ServerSideGrid ... />
                    </div>
                  </div>
                  {/* FxCashTab ends */}

                </div>
              </div>
            </div>
          </div>
        </div>
        {/* BlockLevelPage ends */}

      </div>
    </main>
  </div>
</AuthProvider>
```

---

## Future: TabPanel Architecture

When implemented, `TabPanel`, `TabFilterSection`, and `TabGridSection` will provide:

1. **Structure** - Consistent layout for all tabs
2. **State Management** - Zustand store for grid API and filters
3. **Communication** - Filters can control the grid

### Planned Component Structure

```tsx
// Future FxCashTab structure:

<TabPanel>                           {/* Creates Zustand store, provides context */}
  <TabFilterSection>                 {/* flex-shrink: 0, content-based height */}
    <PresetRow />                    {/* Row 1: Preset dropdown */}
    <FilterChipsRow />               {/* Row 2: Chips, date, column filters */}
  </TabFilterSection>

  <TabGridSection>                   {/* flex: 1, takes remaining height */}
    <ServerSideGrid ... />
  </TabGridSection>
</TabPanel>
```

### Pseudocode: TabPanel

```tsx
// src/components/layout/TabPanel/TabPanel.tsx (FUTURE)

function TabPanel({ children }) {
  // Create a Zustand store instance for this tab
  const storeRef = useRef()
  if (!storeRef.current) {
    storeRef.current = createTabPanelStore()
  }

  // Provide store via context so children can access it
  return (
    <TabPanelContext.Provider value={storeRef.current}>
      <div className={styles.tabPanel}>
        {' '}
        {/* flex: 1, min-height: 0, gap: 1rem */}
        {children}
      </div>
    </TabPanelContext.Provider>
  )
}
```

### Pseudocode: TabFilterSection

```tsx
// src/components/layout/TabPanel/TabFilterSection.tsx (FUTURE)

function TabFilterSection({ children }) {
  return (
    <div className={styles.filterSection}>
      {' '}
      {/* flex-shrink: 0, content-based */}
      {children}
    </div>
  )
}
```

### Pseudocode: TabGridSection

```tsx
// src/components/layout/TabPanel/TabGridSection.tsx (FUTURE)

function TabGridSection({ children }) {
  return (
    <div className={styles.gridSection}>
      {' '}
      {/* flex: 1, min-height: 0 */}
      {children}
    </div>
  )
}
```

### Pseudocode: TabPanelStore

```tsx
// src/components/layout/TabPanel/TabPanelStore.ts (FUTURE)

const createTabPanelStore = () =>
  createStore((set, get) => ({
    // Grid API reference - set when grid mounts
    gridApi: null,
    registerGridApi: (api) => set({ gridApi: api }),

    // Filter state
    filters: {
      preset: null,
      lifecycleStatus: [],
      dateRange: { start: null, end: null },
    },
    setFilters: (filters) => {
      set({ filters })
      get().refreshGrid()
    },

    // Grid operations
    refreshGrid: () => {
      const { gridApi } = get()
      gridApi?.refreshServerSide({ purge: true })
    },

    // Selected rows (for sidepanels)
    selectedRows: [],
    setSelectedRows: (rows) => set({ selectedRows: rows }),
  }))
```

### Pseudocode: useTabPanelStore Hook

```tsx
// src/components/layout/TabPanel/TabPanelContext.tsx (FUTURE)

const TabPanelContext = createContext(null)

// Hook for components inside TabPanel to access the store
function useTabPanelStore(selector) {
  const store = useContext(TabPanelContext)
  if (!store) throw new Error('Must be inside TabPanel')
  return useStore(store, selector)
}

// Example usage in a filter component:
function LifecycleChips() {
  const status = useTabPanelStore((s) => s.filters.lifecycleStatus)
  const setFilters = useTabPanelStore((s) => s.setFilters)
  // ...
}
```

### Future Component Hierarchy

```
BlockLevelPage
└── PageLayout
    ├── PageTitle (78px)
    └── .tab-section
        └── TabLayout
            ├── .tabNav
            └── .tabCard
                └── <Outlet />
                    │
                    └── FxCashTab
                        │
                        └── TabPanel              {/* NEW: Creates store */}
                            │
                            ├── TabFilterSection  {/* NEW: flex-shrink: 0 */}
                            │   ├── PresetRow
                            │   └── FilterChipsRow
                            │       ├── LifecycleChips
                            │       ├── DateRangePicker
                            │       └── ColumnFiltersDropdown
                            │
                            └── TabGridSection    {/* NEW: flex: 1 */}
                                └── ServerSideGrid
```

### CSS for TabPanel Components

```css
/* TabPanel.module.css (FUTURE) */

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
  flex-shrink: 0; /* Don't shrink - height based on content */
}

.gridSection {
  display: flex;
  flex-direction: column;
  flex: 1; /* Take remaining space */
  min-height: 0; /* Allow AG Grid to scroll internally */
}
```

---

## File Reference

### Current Files

| File                                         | Purpose                                     |
| -------------------------------------------- | ------------------------------------------- |
| `src/components/layout/PageLayout.tsx`       | Page wrapper with PageTitle + tab-section   |
| `src/components/layout/PageTitle.tsx`        | 78px fixed header with breadcrumbs          |
| `src/components/layout/PageTitle.module.css` | PageTitle styles                            |
| `src/components/layout/TabLayout.tsx`        | Tab navigation + white card wrapper         |
| `src/components/layout/TabLayout.module.css` | TabLayout styles                            |
| `src/styles/layouts/page.css`                | `.page` and `.tab-section` styles           |
| `src/styles/layouts/app.css`                 | App shell styles (sidebar, header, content) |

### Future Files (To Be Created)

| File                                                  | Purpose                |
| ----------------------------------------------------- | ---------------------- |
| `src/components/layout/TabPanel/index.ts`             | Public exports         |
| `src/components/layout/TabPanel/TabPanel.tsx`         | Store provider wrapper |
| `src/components/layout/TabPanel/TabPanelStore.ts`     | Zustand store factory  |
| `src/components/layout/TabPanel/TabPanelContext.tsx`  | Context + hooks        |
| `src/components/layout/TabPanel/TabFilterSection.tsx` | Filter area wrapper    |
| `src/components/layout/TabPanel/TabGridSection.tsx`   | Grid area wrapper      |
| `src/components/layout/TabPanel/TabPanel.module.css`  | Styles                 |

---

## Related Documentation

- [Tab Panel Architecture](./19-tab-panel-architecture.md) - Full architecture with state management
- [TanStack Query Cache Deep Dive](./18-tanstack-query-cache-deep-dive.md) - Data fetching patterns
- [AG Grid Server-Side Row Model](./14-ag-grid-ssrm.md) - Grid implementation details
