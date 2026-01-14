# Harmony Navigation Architecture

## Overview

This document outlines the recommended route and navigation structure for the Harmony application, considering:

- Multiple navigation groups (Trade Activity Reports, etc.)
- Pages within groups (Block Level, Allocation Level, Summary)
- Tabs within pages (FX Cash, FX Options)
- Authentication requirements
- Future role-based access control (RBAC)

---

## Table of Contents

1. [Tabs in URL vs UI State](#1-tabs-in-url-vs-ui-state)
2. [Recommended Route Structure](#2-recommended-route-structure)
3. [Layout Hierarchy](#3-layout-hierarchy)
4. [File Structure](#4-file-structure)
5. [Implementation Examples](#5-implementation-examples)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Navigation Configuration](#7-navigation-configuration)
8. [Future Considerations](#8-future-considerations)

---

## 1. Tabs in URL vs UI State

### Recommendation: **Tabs in URL**

For an enterprise reporting application, I strongly recommend reflecting tabs in the URL.

### Trade-off Analysis

| Aspect | Tabs in URL | Tabs as UI State |
|--------|-------------|------------------|
| **Bookmarkable** | ✅ Users can bookmark specific tab | ❌ Always opens default tab |
| **Shareable** | ✅ Can share exact view with colleagues | ❌ Recipient sees default tab |
| **Browser navigation** | ✅ Back/forward works naturally | ❌ Back exits entire page |
| **Analytics** | ✅ Track which tabs are most used | ⚠️ Requires extra tracking |
| **Deep linking** | ✅ Link directly from emails/reports | ❌ Must navigate manually |
| **URL complexity** | ⚠️ Longer URLs | ✅ Shorter URLs |
| **State persistence** | ✅ Survives page refresh | ❌ Resets on refresh |

### Why This Matters for Reports

In a financial reporting application:
- Analysts frequently share specific report views with colleagues
- Users bookmark their frequently accessed reports
- Support tickets reference specific views ("I see an issue on Block Level > FX Options")
- Audit trails benefit from URL-based navigation

---

## 2. Recommended Route Structure

### URL Structure

```
/login                                    → Login page
/logout                                   → Logout page

/trade-activity                           → Redirect to default page
/trade-activity/block-level               → Redirect to default tab
/trade-activity/block-level/fx-cash       → Block Level - FX Cash tab
/trade-activity/block-level/fx-options    → Block Level - FX Options tab
/trade-activity/allocation-level          → Redirect to default tab
/trade-activity/allocation-level/fx-cash  → Allocation Level - FX Cash tab
/trade-activity/allocation-level/fx-options → Allocation Level - FX Options tab
/trade-activity/summary                   → Summary page (no tabs)

/settlements                              → Another group
/settlements/pending                      → Page in Settlements group
/settlements/completed                    → Another page

/settings                                 → Settings page
/settings/profile                         → Profile settings
/settings/preferences                     → User preferences
```

### Route Hierarchy Visualization

```
__root__
├── _public/                          (pathless - public pages)
│   ├── login
│   └── logout
│
└── _authenticated/                   (pathless - protected pages)
    ├── _app/                         (pathless - app layout with sidebar)
    │   ├── trade-activity/
    │   │   ├── block-level/
    │   │   │   ├── fx-cash
    │   │   │   └── fx-options
    │   │   ├── allocation-level/
    │   │   │   ├── fx-cash
    │   │   │   └── fx-options
    │   │   └── summary
    │   │
    │   ├── settlements/
    │   │   ├── pending
    │   │   └── completed
    │   │
    │   └── settings/
    │       ├── profile
    │       └── preferences
    │
    └── (future: other authenticated but non-sidebar pages)
```

---

## 3. Layout Hierarchy

### Layout Nesting

```
┌─────────────────────────────────────────────────────────────┐
│ RootLayout (__root.tsx)                                     │
│ - Error boundary                                            │
│ - Global providers                                          │
│ - DevTools                                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ AuthenticatedLayout (_authenticated.tsx)              │  │
│  │ - Auth guard                                          │  │
│  │ - User context                                        │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ AppLayout (_authenticated/_app.tsx)             │  │  │
│  │  │ - Sidebar navigation                            │  │  │
│  │  │ - Header                                        │  │  │
│  │  │                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │ GroupLayout (trade-activity.tsx)          │  │  │  │
│  │  │  │ - Group header/breadcrumb                 │  │  │  │
│  │  │  │                                           │  │  │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │  │  │
│  │  │  │  │ PageLayout (block-level.tsx)        │  │  │  │  │
│  │  │  │  │ - Page title                        │  │  │  │  │
│  │  │  │  │ - Tab navigation                    │  │  │  │  │
│  │  │  │  │                                     │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │ TabContent (fx-cash.tsx)      │  │  │  │  │  │
│  │  │  │  │  │ - Actual report content       │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Responsibilities

| Layout | File | Responsibilities |
|--------|------|------------------|
| Root | `__root.tsx` | Error boundary, global providers, devtools |
| Public | `_public.tsx` | Minimal layout for auth pages |
| Authenticated | `_authenticated.tsx` | Auth guard, user context, redirect if not logged in |
| App | `_authenticated/_app.tsx` | Sidebar, header, main content area |
| Group | `trade-activity.tsx` | Group-level breadcrumb (optional) |
| Page | `block-level.tsx` | Page title, tab navigation, shared page state |
| Tab | `fx-cash.tsx` | Actual content for the tab |

---

## 4. File Structure

### Routes Structure

```
src/routes/
├── __root.tsx                              # Root layout
├── index.tsx                               # Redirect to /login or /trade-activity
│
├── _public.tsx                             # Public layout (no sidebar)
├── _public/
│   ├── login.tsx                           # /login
│   └── logout.tsx                          # /logout
│
├── _authenticated.tsx                      # Auth guard layout
├── _authenticated/
│   ├── _app.tsx                            # App layout (sidebar + header)
│   ├── _app/
│   │   │
│   │   ├── trade-activity.tsx              # Group layout (optional)
│   │   ├── trade-activity/
│   │   │   ├── index.tsx                   # Redirect to /block-level
│   │   │   │
│   │   │   ├── block-level.tsx             # Page layout with tabs
│   │   │   ├── block-level/
│   │   │   │   ├── index.tsx               # Redirect to /fx-cash
│   │   │   │   ├── fx-cash.tsx             # Tab content
│   │   │   │   └── fx-options.tsx          # Tab content
│   │   │   │
│   │   │   ├── allocation-level.tsx        # Page layout with tabs
│   │   │   ├── allocation-level/
│   │   │   │   ├── index.tsx               # Redirect to /fx-cash
│   │   │   │   ├── fx-cash.tsx             # Tab content
│   │   │   │   └── fx-options.tsx          # Tab content
│   │   │   │
│   │   │   └── summary.tsx                 # Page without tabs
│   │   │
│   │   ├── settlements.tsx                 # Another group layout
│   │   ├── settlements/
│   │   │   ├── index.tsx
│   │   │   ├── pending.tsx
│   │   │   └── completed.tsx
│   │   │
│   │   └── settings/
│   │       ├── index.tsx
│   │       ├── profile.tsx
│   │       └── preferences.tsx
```

### Pages Structure (Components)

```
src/pages/
├── auth/
│   ├── LoginPage.tsx
│   └── LogoutPage.tsx
│
├── trade-activity/
│   ├── BlockLevelPage/
│   │   ├── index.tsx                       # Re-exports
│   │   ├── BlockLevelLayout.tsx            # Page layout with tabs
│   │   ├── FxCashTab.tsx                   # Tab content
│   │   ├── FxOptionsTab.tsx                # Tab content
│   │   └── components/                     # Page-specific components
│   │       ├── TradeTable.tsx
│   │       └── FilterPanel.tsx
│   │
│   ├── AllocationLevelPage/
│   │   ├── index.tsx
│   │   ├── AllocationLevelLayout.tsx
│   │   ├── FxCashTab.tsx
│   │   └── FxOptionsTab.tsx
│   │
│   └── SummaryPage/
│       └── SummaryPage.tsx
│
├── settlements/
│   ├── PendingPage.tsx
│   └── CompletedPage.tsx
│
└── settings/
    ├── ProfilePage.tsx
    └── PreferencesPage.tsx
```

### Shared Components

```
src/shared/
├── components/
│   ├── layout/
│   │   ├── AppLayout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── NavigationItem.tsx
│   │   │
│   │   ├── PageLayout/
│   │   │   ├── PageLayout.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── TabNavigation.tsx
│   │   │
│   │   └── AuthLayout/
│   │       └── AuthLayout.tsx
│   │
│   └── ui/
│       ├── Tabs/
│       ├── Button/
│       └── Table/
```

---

## 5. Implementation Examples

### 5.1 Root Layout

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  )
}
```

### 5.2 Authenticated Layout (Auth Guard)

```typescript
// src/routes/_authenticated.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuth } from '@core/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Check if user is authenticated
    const isAuthenticated = await checkAuth()
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
```

### 5.3 App Layout (Sidebar + Header)

```typescript
// src/routes/_authenticated/_app.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@shared/components/layout/AppLayout'

export const Route = createFileRoute('/_authenticated/_app')({
  component: AppLayoutRoute,
})

function AppLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
```

```typescript
// src/shared/components/layout/AppLayout/AppLayout.tsx
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 5.4 Page Layout with Tabs

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level.tsx
import { createFileRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_app/trade-activity/block-level')({
  component: BlockLevelLayout,
})

function BlockLevelLayout() {
  return (
    <div className="page-layout">
      <header className="page-header">
        <h1>Block Level Report</h1>
      </header>

      <nav className="tab-navigation">
        <Link
          to="/trade-activity/block-level/fx-cash"
          className="tab-link"
          activeProps={{ className: 'tab-link active' }}
        >
          FX Cash
        </Link>
        <Link
          to="/trade-activity/block-level/fx-options"
          className="tab-link"
          activeProps={{ className: 'tab-link active' }}
        >
          FX Options
        </Link>
      </nav>

      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  )
}
```

### 5.5 Tab Content (Route)

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level/fx-cash.tsx
import { createFileRoute } from '@tanstack/react-router'
import { FxCashTab } from '@pages/trade-activity/BlockLevelPage'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-cash'
)({
  component: FxCashTab,
})
```

```typescript
// src/pages/trade-activity/BlockLevelPage/FxCashTab.tsx
import { useQuery } from '@tanstack/react-query'
import { blockLevelQueries } from '@features/trade-activity/services'

export function FxCashTab() {
  const { data, isLoading } = useQuery(
    blockLevelQueries.fxCash()
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fx-cash-content">
      <FilterPanel />
      <TradeTable data={data} />
    </div>
  )
}
```

### 5.6 Index Route (Default Tab Redirect)

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/trade-activity/block-level/fx-cash',
    })
  },
})
```

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

```
User visits /trade-activity/block-level/fx-cash
                    │
                    ▼
        ┌───────────────────────┐
        │  _authenticated.tsx   │
        │  beforeLoad() check   │
        └───────────┬───────────┘
                    │
         Is user authenticated?
                    │
        ┌───────────┴───────────┐
        │                       │
       No                      Yes
        │                       │
        ▼                       ▼
  Redirect to             Continue to
  /login?redirect=        requested page
  /trade-activity/...
```

### 6.2 Role-Based Access Control (RBAC)

For future RBAC implementation, extend the route guards:

```typescript
// types/auth.ts
interface User {
  id: string
  email: string
  roles: Role[]
  permissions: Permission[]
}

type Role = 'admin' | 'analyst' | 'viewer'

type Permission =
  | 'trade-activity:view'
  | 'trade-activity:edit'
  | 'settlements:view'
  | 'settlements:approve'
  | 'settings:manage'
```

```typescript
// src/routes/_authenticated/_app/trade-activity.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { hasPermission } from '@core/auth'

export const Route = createFileRoute('/_authenticated/_app/trade-activity')({
  beforeLoad: async ({ context }) => {
    const user = context.auth.user

    if (!hasPermission(user, 'trade-activity:view')) {
      throw redirect({
        to: '/unauthorized',
      })
    }
  },
  component: () => <Outlet />,
})
```

### 6.3 Permission-Based UI

```typescript
// src/shared/components/PermissionGate.tsx
import { useAuth } from '@core/auth'

interface PermissionGateProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth()

  if (!hasPermission(user, permission)) {
    return fallback
  }

  return children
}

// Usage
<PermissionGate permission="trade-activity:edit">
  <EditButton />
</PermissionGate>
```

### 6.4 Tab-Level Permissions

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level.tsx
function BlockLevelLayout() {
  const { user } = useAuth()

  const tabs = [
    {
      id: 'fx-cash',
      label: 'FX Cash',
      to: '/trade-activity/block-level/fx-cash',
      permission: 'trade-activity:fx-cash:view',
    },
    {
      id: 'fx-options',
      label: 'FX Options',
      to: '/trade-activity/block-level/fx-options',
      permission: 'trade-activity:fx-options:view',
    },
  ]

  const visibleTabs = tabs.filter(tab =>
    hasPermission(user, tab.permission)
  )

  return (
    <div className="page-layout">
      <header className="page-header">
        <h1>Block Level Report</h1>
      </header>

      <nav className="tab-navigation">
        {visibleTabs.map(tab => (
          <Link
            key={tab.id}
            to={tab.to}
            className="tab-link"
            activeProps={{ className: 'tab-link active' }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  )
}
```

---

## 7. Navigation Configuration

### 7.1 Centralized Navigation Config

```typescript
// src/core/config/navigation.ts
import type { Permission } from '@core/auth'

interface NavItem {
  id: string
  label: string
  icon?: string
  to?: string
  permission?: Permission
  children?: NavItem[]
}

interface NavGroup {
  id: string
  label: string
  icon?: string
  permission?: Permission
  items: NavItem[]
}

export const navigationConfig: NavGroup[] = [
  {
    id: 'trade-activity',
    label: 'Trade Activity Reports',
    icon: 'chart-bar',
    permission: 'trade-activity:view',
    items: [
      {
        id: 'block-level',
        label: 'Block Level',
        to: '/trade-activity/block-level',
        children: [
          { id: 'fx-cash', label: 'FX Cash', to: '/trade-activity/block-level/fx-cash' },
          { id: 'fx-options', label: 'FX Options', to: '/trade-activity/block-level/fx-options' },
        ],
      },
      {
        id: 'allocation-level',
        label: 'Allocation Level',
        to: '/trade-activity/allocation-level',
        children: [
          { id: 'fx-cash', label: 'FX Cash', to: '/trade-activity/allocation-level/fx-cash' },
          { id: 'fx-options', label: 'FX Options', to: '/trade-activity/allocation-level/fx-options' },
        ],
      },
      {
        id: 'summary',
        label: 'Summary',
        to: '/trade-activity/summary',
      },
    ],
  },
  {
    id: 'settlements',
    label: 'Settlements',
    icon: 'document-check',
    permission: 'settlements:view',
    items: [
      { id: 'pending', label: 'Pending', to: '/settlements/pending' },
      { id: 'completed', label: 'Completed', to: '/settlements/completed' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'cog',
    items: [
      { id: 'profile', label: 'Profile', to: '/settings/profile' },
      { id: 'preferences', label: 'Preferences', to: '/settings/preferences' },
    ],
  },
]
```

### 7.2 Dynamic Sidebar from Config

```typescript
// src/shared/components/layout/AppLayout/Sidebar.tsx
import { Link } from '@tanstack/react-router'
import { navigationConfig } from '@core/config/navigation'
import { useAuth, hasPermission } from '@core/auth'

export function Sidebar() {
  const { user } = useAuth()

  const visibleGroups = navigationConfig.filter(group =>
    !group.permission || hasPermission(user, group.permission)
  )

  return (
    <aside className="sidebar">
      <nav>
        {visibleGroups.map(group => (
          <NavGroup key={group.id} group={group} user={user} />
        ))}
      </nav>
    </aside>
  )
}

function NavGroup({ group, user }) {
  const visibleItems = group.items.filter(item =>
    !item.permission || hasPermission(user, item.permission)
  )

  if (visibleItems.length === 0) return null

  return (
    <div className="nav-group">
      <h3 className="nav-group-title">
        {group.icon && <Icon name={group.icon} />}
        {group.label}
      </h3>
      <ul className="nav-group-items">
        {visibleItems.map(item => (
          <NavItem key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}

function NavItem({ item }) {
  return (
    <li>
      <Link
        to={item.to}
        className="nav-item"
        activeProps={{ className: 'nav-item active' }}
      >
        {item.label}
      </Link>
    </li>
  )
}
```

---

## 8. Future Considerations

### 8.1 Adding New Groups

To add a new group (e.g., "Risk Reports"):

1. **Add to navigation config:**
```typescript
{
  id: 'risk-reports',
  label: 'Risk Reports',
  icon: 'shield',
  permission: 'risk:view',
  items: [
    { id: 'exposure', label: 'Exposure', to: '/risk-reports/exposure' },
    { id: 'var', label: 'VaR', to: '/risk-reports/var' },
  ],
}
```

2. **Create route files:**
```
src/routes/_authenticated/_app/
├── risk-reports.tsx          # Group layout (optional)
├── risk-reports/
│   ├── index.tsx             # Redirect to default
│   ├── exposure.tsx          # Page
│   └── var.tsx               # Page
```

3. **Create page components:**
```
src/pages/risk-reports/
├── ExposurePage.tsx
└── VarPage.tsx
```

### 8.2 Adding New Tabs to Existing Page

To add a new tab (e.g., "Equities" to Block Level):

1. **Add route file:**
```typescript
// src/routes/_authenticated/_app/trade-activity/block-level/equities.tsx
import { createFileRoute } from '@tanstack/react-router'
import { EquitiesTab } from '@pages/trade-activity/BlockLevelPage'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/equities'
)({
  component: EquitiesTab,
})
```

2. **Add tab to page layout:**
```typescript
// Update block-level.tsx to include the new tab in navigation
```

3. **Add to navigation config (if tabs shown in sidebar):**
```typescript
{
  id: 'block-level',
  label: 'Block Level',
  to: '/trade-activity/block-level',
  children: [
    { id: 'fx-cash', label: 'FX Cash', to: '/trade-activity/block-level/fx-cash' },
    { id: 'fx-options', label: 'FX Options', to: '/trade-activity/block-level/fx-options' },
    { id: 'equities', label: 'Equities', to: '/trade-activity/block-level/equities' },  // New
  ],
}
```

### 8.3 Static/Public Pages

When you need public pages:

```
src/routes/
├── _public/
│   ├── login.tsx
│   ├── logout.tsx
│   ├── about.tsx              # Public about page
│   ├── terms.tsx              # Terms of service
│   └── privacy.tsx            # Privacy policy
```

### 8.4 Search Params for Filters

For report filters that should be shareable:

```typescript
// src/routes/_authenticated/_app/trade-activity/block-level/fx-cash.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum(['all', 'pending', 'completed']).optional(),
})

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-cash'
)({
  validateSearch: searchSchema,
  component: FxCashTab,
})

function FxCashTab() {
  const { dateFrom, dateTo, currency, status } = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateFilters = (newFilters: Partial<typeof searchSchema>) => {
    navigate({
      search: (prev) => ({ ...prev, ...newFilters }),
    })
  }

  // URL: /trade-activity/block-level/fx-cash?dateFrom=2024-01-01&currency=USD
  // This URL can be bookmarked and shared!
}
```

---

## Summary

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tabs in URL | Yes | Bookmarkable, shareable, analytics-friendly |
| Layout nesting | Multi-level | Clean separation, reusable layouts |
| Auth approach | Route guards | Centralized, consistent, redirect-friendly |
| Navigation config | Centralized | Single source of truth, permission-aware |
| RBAC ready | Yes | Guards at route and component level |

### Route Naming Conventions

```
/group-name                     # kebab-case for groups
/group-name/page-name           # kebab-case for pages
/group-name/page-name/tab-name  # kebab-case for tabs
```

### File Naming Conventions

```
Routes:      kebab-case.tsx      (block-level.tsx)
Pages:       PascalCase.tsx      (BlockLevelPage.tsx)
Components:  PascalCase.tsx      (TradeTable.tsx)
```

---

## Quick Reference

```
Adding a new group:
1. Add to navigationConfig
2. Create routes in _authenticated/_app/[group-name]/
3. Create pages in pages/[group-name]/

Adding a new page with tabs:
1. Create [page-name].tsx as layout route
2. Create [page-name]/index.tsx for redirect
3. Create [page-name]/[tab-name].tsx for each tab

Adding permissions:
1. Add permission to route's beforeLoad
2. Add permission to navigation config item
3. Use PermissionGate for UI elements
```
