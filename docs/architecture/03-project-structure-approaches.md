# 03 - Project Structure Approaches

A comprehensive guide to organizing your React/TypeScript project files.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Layer-Based Architecture](#2-layer-based-architecture)
3. [Feature-Based Architecture](#3-feature-based-architecture)
4. [Hybrid Architecture](#4-hybrid-architecture)
5. [Comparison Table](#5-comparison-table)
6. [Decision Framework](#6-decision-framework)
7. [Recommendation for Harmony](#7-recommendation-for-harmony)

---

## 1. Overview

There are three main approaches to organizing a React project:

| Approach | Core Idea | Best For |
|----------|-----------|----------|
| **Layer-Based** | Group by technical responsibility | Small-medium apps, heavy code sharing |
| **Feature-Based** | Group by business domain | Large apps, multiple teams |
| **Hybrid** | Combine both approaches | Medium-large apps, single team |

---

## 2. Layer-Based Architecture

### Core Concept

Files are organized by their **technical role** (what they do), not by feature.

### Structure

```
src/
├── routes/                    # TanStack Router files only
│   ├── __root.tsx
│   ├── _public.tsx
│   ├── _public/
│   │   ├── login.tsx
│   │   └── logout.tsx
│   ├── _authenticated.tsx
│   └── _authenticated/
│       └── _app.tsx
│           └── _app/
│               └── trade-activity/
│                   ├── block-level.tsx
│                   └── block-level/
│                       ├── fx-cash.tsx
│                       └── fx-options.tsx
│
├── components/                # Reusable UI components
│   ├── ui/                    # Primitive components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   └── Tabs.tsx
│   ├── layout/                # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── PageLayout.tsx
│   │   └── TabLayout.tsx
│   └── forms/                 # Form components
│       ├── DateRangePicker.tsx
│       └── FilterPanel.tsx
│
├── pages/                     # Page-level components
│   ├── LoginPage.tsx
│   ├── LogoutPage.tsx
│   └── trade-activity/
│       ├── BlockLevelPage.tsx
│       ├── FxCashTab.tsx
│       └── FxOptionsTab.tsx
│
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts
│   ├── usePagination.ts
│   └── useDebounce.ts
│
├── services/                  # API calls & external services
│   ├── api/
│   │   ├── client.ts          # Axios/fetch setup
│   │   ├── tradeActivity.ts
│   │   └── auth.ts
│   └── queryKeys.ts           # TanStack Query keys
│
├── stores/                    # Global state (if needed)
│   └── userPreferences.ts
│
├── types/                     # TypeScript types
│   ├── api.ts                 # API response types
│   ├── trade.ts               # Domain types
│   └── common.ts              # Shared types
│
├── utils/                     # Pure utility functions
│   ├── formatters.ts          # Date, currency formatting
│   ├── validators.ts
│   └── constants.ts
│
└── styles/                    # Global styles
    └── index.css
```

### How It Works

**Route files are thin** - they only handle routing concerns:

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level/fx-cash.tsx
import { createFileRoute } from '@tanstack/react-router'
import { FxCashTab } from '@/pages/trade-activity/FxCashTab'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-cash'
)({
  component: FxCashTab,
})
```

**Page components contain the logic**:

```typescript
// src/pages/trade-activity/FxCashTab.tsx
import { useQuery } from '@tanstack/react-query'
import { Table } from '@/components/ui/Table'
import { getFxCashData } from '@/services/api/tradeActivity'
import { fxCashQueryKey } from '@/services/queryKeys'

export function FxCashTab() {
  const { data, isLoading } = useQuery({
    queryKey: fxCashQueryKey(),
    queryFn: getFxCashData,
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="tab-panel">
      <h3>FX Cash Report</h3>
      <Table data={data} columns={columns} />
    </div>
  )
}
```

### Pros

- **Maximum code reuse**: Components, hooks, and services are naturally shared
- **Clear technical boundaries**: Easy to find "all hooks" or "all API calls"
- **Simpler mental model**: One place for each type of code
- **Great for single teams**: Everyone knows where everything is
- **Easier refactoring**: Move UI without touching business logic

### Cons

- **Feature changes touch many folders**: Adding a feature = changes in routes/, pages/, services/, types/
- **Can become unwieldy at scale**: Folders get very large
- **Less encapsulation**: Related code is spread across folders
- **Harder for multiple teams**: Teams step on each other's toes

---

## 3. Feature-Based Architecture

### Core Concept

Files are organized by **business domain** (what they relate to).

### Structure

```
src/
├── routes/                    # TanStack Router files only
│   └── (same structure)
│
├── features/                  # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── LogoutButton.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── authApi.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts           # Public exports
│   │
│   ├── trade-activity/
│   │   ├── components/
│   │   │   ├── BlockLevelPage.tsx
│   │   │   ├── FxCashTab.tsx
│   │   │   ├── FxOptionsTab.tsx
│   │   │   └── TradeTable.tsx
│   │   ├── hooks/
│   │   │   └── useTradeFilters.ts
│   │   ├── services/
│   │   │   └── tradeApi.ts
│   │   ├── types/
│   │   │   └── trade.types.ts
│   │   └── index.ts
│   │
│   └── settlement/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.ts
│
├── shared/                    # Truly shared code
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   └── Table.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── PageLayout.tsx
│   ├── hooks/
│   │   └── useDebounce.ts
│   ├── utils/
│   │   └── formatters.ts
│   └── types/
│       └── common.ts
│
└── styles/
    └── index.css
```

### How It Works

**Features are self-contained modules**:

```typescript
// src/features/trade-activity/index.ts
// Only export what other features need
export { FxCashTab } from './components/FxCashTab'
export { FxOptionsTab } from './components/FxOptionsTab'
export { BlockLevelPage } from './components/BlockLevelPage'
export type { Trade, TradeFilter } from './types/trade.types'
```

**Route files import from features**:

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level/fx-cash.tsx
import { createFileRoute } from '@tanstack/react-router'
import { FxCashTab } from '@/features/trade-activity'

export const Route = createFileRoute(...)({
  component: FxCashTab,
})
```

### Pros

- **Feature encapsulation**: All related code in one place
- **Team scalability**: Teams own features, minimal conflicts
- **Easier to understand a feature**: One folder tells the whole story
- **Clear ownership**: "Who owns trade-activity? Team X."
- **Delete/refactor features easily**: Remove one folder

### Cons

- **Code duplication risk**: Similar code in multiple features
- **Shared code decisions**: "Is this shared or feature-specific?"
- **More boilerplate**: Each feature has similar folder structure
- **Harder for single team**: More jumping between folders

---

## 4. Hybrid Architecture

### Core Concept

Combine **layer-based for shared code** with **feature-based for domain code**.

### Structure

```
src/
├── routes/                    # TanStack Router files only
│   └── (same structure)
│
├── components/                # SHARED UI components
│   ├── ui/                    # Primitives (Button, Input, Table)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table/
│   │   │   ├── Table.tsx
│   │   │   ├── TableHeader.tsx
│   │   │   └── index.ts
│   │   └── Tabs/
│   │       ├── Tabs.tsx
│   │       └── index.ts
│   │
│   └── layout/                # Shared layouts
│       ├── Sidebar/
│       │   ├── Sidebar.tsx
│       │   ├── SidebarNav.tsx
│       │   └── index.ts
│       ├── Header.tsx
│       ├── PageLayout.tsx     # Reusable page wrapper
│       └── TabLayout.tsx      # Reusable tab wrapper
│
├── pages/                     # PAGE components (organized by route)
│   ├── public/
│   │   ├── LoginPage.tsx
│   │   └── LogoutPage.tsx
│   │
│   └── app/                   # Authenticated app pages
│       ├── trade-activity/
│       │   ├── block-level/
│       │   │   ├── BlockLevelPage.tsx
│       │   │   ├── FxCashTab.tsx
│       │   │   ├── FxOptionsTab.tsx
│       │   │   └── components/      # Page-specific components
│       │   │       └── TradeFilters.tsx
│       │   │
│       │   ├── allocation-level/
│       │   │   ├── AllocationLevelPage.tsx
│       │   │   ├── FxCashTab.tsx    # Different from block-level
│       │   │   └── FxOptionsTab.tsx
│       │   │
│       │   └── summary/
│       │       └── SummaryPage.tsx
│       │
│       └── settlement/
│           └── ...
│
├── hooks/                     # SHARED hooks
│   ├── useAuth.ts
│   ├── usePagination.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
│
├── services/                  # ALL API services
│   ├── api/
│   │   ├── client.ts
│   │   ├── tradeActivity.ts
│   │   ├── settlement.ts
│   │   └── auth.ts
│   ├── queries/               # TanStack Query hooks
│   │   ├── useTradeQueries.ts
│   │   └── useAuthQueries.ts
│   └── queryKeys.ts
│
├── types/                     # SHARED types
│   ├── api.ts
│   ├── common.ts
│   └── domain/
│       ├── trade.ts
│       └── settlement.ts
│
├── utils/                     # SHARED utilities
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
│
└── styles/
    └── index.css
```

### Key Decisions in Hybrid

**1. Where does UI code live?**

| Code Type | Location | Example |
|-----------|----------|---------|
| Primitive UI | `components/ui/` | Button, Input, Table |
| Layouts | `components/layout/` | Sidebar, PageLayout |
| Page components | `pages/` | FxCashTab, LoginPage |
| Page-specific UI | `pages/.../components/` | TradeFilters |

**2. Where does logic code live?**

| Code Type | Location | Example |
|-----------|----------|---------|
| Shared hooks | `hooks/` | useDebounce, usePagination |
| API calls | `services/api/` | tradeActivity.ts |
| Query hooks | `services/queries/` | useTradeQueries.ts |
| Shared types | `types/` | trade.ts, api.ts |
| Utilities | `utils/` | formatters.ts |

**3. Page-specific vs Shared?**

```
Is it used in multiple pages?
├── YES → Put in shared folder (components/, hooks/, etc.)
└── NO  → Put in pages/.../components/ or inline
```

### Code Examples

**Shared layout component with composition:**

```typescript
// src/components/layout/PageLayout.tsx
interface PageLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="page">
      <header className="page-header">
        <h2>{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </header>
      {children}
    </div>
  )
}
```

**Shared tab layout component:**

```typescript
// src/components/layout/TabLayout.tsx
import { Link } from '@tanstack/react-router'

interface Tab {
  label: string
  to: string
}

interface TabLayoutProps {
  tabs: Tab[]
  children: React.ReactNode  // The <Outlet />
}

export function TabLayout({ tabs, children }: TabLayoutProps) {
  return (
    <>
      <nav className="tab-nav">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="tab-link"
            activeProps={{ className: 'tab-link active' }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="tab-content">{children}</div>
    </>
  )
}
```

**Page using composition:**

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
      title="Block Level Report"
      description="View block-level trading activity"
    >
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </PageLayout>
  )
}
```

**Route file (thin):**

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level.tsx
import { createFileRoute } from '@tanstack/react-router'
import { BlockLevelPage } from '@/pages/app/trade-activity/block-level/BlockLevelPage'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level'
)({
  component: BlockLevelPage,
})
```

### Pros

- **Best of both worlds**: Shared code is easy to find, pages are organized
- **Composition-friendly**: Layouts are reusable building blocks
- **Works well for single team**: Clear structure without over-engineering
- **Scales reasonably**: Can evolve toward more feature-based if needed
- **Pages mirror routes**: Easy to find the component for any URL

### Cons

- **More decisions**: "Is this shared or page-specific?"
- **Potential for inconsistency**: Teams might organize pages differently
- **Medium complexity**: More folders than layer-based

---

## 5. Comparison Table

| Criteria | Layer-Based | Feature-Based | Hybrid |
|----------|-------------|---------------|--------|
| **Code sharing** | Excellent | Requires discipline | Very good |
| **Feature isolation** | Poor | Excellent | Good |
| **Single team** | Excellent | Overkill | Excellent |
| **Multiple teams** | Poor | Excellent | Good |
| **Learning curve** | Low | Medium | Medium |
| **Refactoring** | Easy (UI) | Easy (features) | Easy (both) |
| **Finding code** | By type | By feature | By type + feature |
| **Scalability** | Medium | High | High |
| **Composition patterns** | Natural | Requires shared/ | Natural |

---

## 6. Decision Framework

### Choose Layer-Based if:

- Small to medium application (< 50 routes)
- Single team
- Heavy code sharing between features
- Components are highly reusable
- You want simplicity

### Choose Feature-Based if:

- Large application (100+ routes)
- Multiple teams with clear ownership
- Features are independent
- You want to scale to many developers
- Features might become separate apps

### Choose Hybrid if:

- Medium to large application
- Single team or small number of teams
- Mix of shared and specific code
- You want composition patterns
- Pages vary in structure but share UI components

---

## 7. Recommendation for Harmony

Based on your requirements:

| Requirement | Implication |
|-------------|-------------|
| Single team | No need for strict feature boundaries |
| Layouts independent of groups | Composition-based layouts in shared components |
| Significant code sharing | Layer-based for shared code |
| Pages may have identical layouts | Reusable layout components |
| Tabs vary by page | Flexible TabLayout component |

### Recommended: Hybrid Architecture

```
src/
├── routes/                    # Routing only
├── components/                # Shared UI (including layouts)
├── pages/                     # Page components (mirror route structure)
├── hooks/                     # Shared hooks
├── services/                  # API layer
├── types/                     # TypeScript types
├── utils/                     # Utilities
└── styles/                    # Global styles
```

### Key Principles for Harmony

1. **Routes are thin**: Only routing logic, import components from `pages/`

2. **Layouts are composable**: Build pages from `PageLayout`, `TabLayout`, etc.

3. **Pages mirror routes**: `pages/app/trade-activity/block-level/` matches route structure

4. **Shared UI in components/**: All reusable UI, including layouts

5. **Page-specific code stays local**: `pages/.../components/` for one-off components

6. **Services are shared**: All API calls in `services/`, organized by domain

### Example Flow

```
URL: /trade-activity/block-level/fx-cash

Route file:
  src/routes/_authenticated/_app/trade-activity/block-level/fx-cash.tsx
  └── imports FxCashTab from pages/

Page component:
  src/pages/app/trade-activity/block-level/FxCashTab.tsx
  └── uses Table from components/ui/
  └── uses useTradeQuery from services/queries/

Shared components:
  src/components/ui/Table.tsx
  src/components/layout/TabLayout.tsx

API layer:
  src/services/api/tradeActivity.ts
  src/services/queries/useTradeQueries.ts
```

This structure gives you:
- Maximum code reuse (layer-based shared code)
- Clear organization (pages mirror routes)
- Composition patterns (layouts as building blocks)
- Room to grow (can add feature-specific folders later if needed)

---

## Next Steps

1. Create the folder structure
2. Set up path aliases in tsconfig.json (`@/components`, `@/pages`, etc.)
3. Move existing components to appropriate locations
4. Create shared layout components (PageLayout, TabLayout)
5. Refactor route files to be thin wrappers
