# 06 - Summary Route Explained

A detailed explanation of the `/trade-activity/summary` route — a simple leaf route without children.

---

## Table of Contents

1. [Route Overview](#1-route-overview)
2. [Common Misconception: Does `index.tsx` Always Run?](#2-common-misconception-does-indextsx-always-run)
3. [File Structure](#3-file-structure)
4. [Route Matching for `/trade-activity/summary`](#4-route-matching-for-trade-activitysummary)
5. [Comparison: Leaf Route vs Layout Route](#5-comparison-leaf-route-vs-layout-route)
6. [Code Walkthrough](#6-code-walkthrough)
7. [Key Takeaways](#7-key-takeaways)

---

## 1. Route Overview

The `/trade-activity/summary` route is a **leaf route** — it has no children and renders a simple page directly. This contrasts with `/trade-activity/block-level`, which is a **layout route** with child tab routes.

| Aspect           | Value                                          |
| ---------------- | ---------------------------------------------- |
| **URL**          | `/trade-activity/summary`                      |
| **Route ID**     | `/_authenticated/_app/trade-activity/summary`  |
| **Route Type**   | Leaf route (no children)                       |
| **Component**    | `SummaryPage`                                  |
| **Has Tabs?**    | No                                             |
| **Has Outlet?**  | No                                             |

---

## 2. Common Misconception: Does `index.tsx` Always Run?

### The Misconception

> "When I visit `/trade-activity/summary`, shouldn't `trade-activity/index.tsx` run first since the URL contains `/trade-activity`? Wouldn't that redirect me to `/block-level` instead?"

### The Answer: No!

`trade-activity/index.tsx` does **NOT** run for every URL that contains `/trade-activity`. It only runs when the URL is **exactly** `/trade-activity` with nothing after it.

### How Index Routes Work

| URL                              | What Matches                  | Result                     |
| -------------------------------- | ----------------------------- | -------------------------- |
| `/trade-activity` (exact)        | `trade-activity/index.tsx`    | Runs redirect to block-level |
| `/trade-activity/summary`        | `trade-activity/summary.tsx`  | Renders SummaryPage directly |
| `/trade-activity/block-level`    | `block-level.tsx` + `block-level/index.tsx` | Layout + redirect |

### The Trailing Slash is the Key

```typescript
// trade-activity/index.tsx
createFileRoute('/_authenticated/_app/trade-activity/')
//                                                   ↑
//                                          Trailing slash = INDEX route
//                                          Only matches EXACT /trade-activity

// trade-activity/summary.tsx
createFileRoute('/_authenticated/_app/trade-activity/summary')
//                                                   ↑
//                                          No trailing slash = regular route
//                                          Matches /trade-activity/summary
```

### Visual Decision Tree

```
URL: /trade-activity/summary
         │
         ▼
    Does URL have more segments after /trade-activity?
         │
         ├── NO ─────────────────────────────────────────┐
         │                                               ▼
         │                                 trade-activity/index.tsx
         │                                 (trailing slash route)
         │                                         │
         │                                         ▼
         │                                 Redirect to /block-level
         │
         └── YES → /summary
                   │
                   ▼
             Look for route matching /trade-activity/summary
                   │
                   ▼
             trade-activity/summary.tsx  ✅ MATCH!
                   │
                   ▼
             Render SummaryPage
             (index.tsx is NEVER consulted)
```

### The Index Route is a Sibling, Not a Parent

Think of the file structure as **siblings at the same level**:

```
trade-activity/
├── index.tsx      ← Handles: /trade-activity (exact)
├── summary.tsx    ← Handles: /trade-activity/summary
└── block-level.tsx ← Handles: /trade-activity/block-level/*
```

These are **sibling routes**, not a parent-child relationship. The router picks **one** based on the URL:

- `/trade-activity` → picks `index.tsx`
- `/trade-activity/summary` → picks `summary.tsx`
- `/trade-activity/block-level` → picks `block-level.tsx`

### Analogy: Folder on Your Computer

```
/Documents/                    ← Opening the folder itself (index)
/Documents/report.pdf          ← A specific file (summary.tsx)
/Documents/projects/           ← A subfolder (block-level.tsx + folder)
```

When you open `/Documents/report.pdf`, you don't first "open" the Documents folder and then get redirected. You go **directly** to `report.pdf`.

Similarly, when you visit `/trade-activity/summary`, the router goes **directly** to `summary.tsx` without ever consulting `index.tsx`.

---

## 3. File Structure

```
src/routes/
├── __root.tsx                          ← Root layout
├── _authenticated.tsx                  ← Auth check (pathless)
├── _authenticated/
│   └── _app.tsx                        ← App layout with sidebar (pathless)
│       └── _app/
│           └── trade-activity/
│               ├── index.tsx           ← Redirect for /trade-activity
│               ├── summary.tsx         ← THIS ROUTE (leaf)
│               ├── block-level.tsx     ← Layout route (has children)
│               └── block-level/        ← Children of block-level
│                   ├── index.tsx
│                   ├── fx-cash.tsx
│                   └── fx-options.tsx
```

### Key Observation

Notice that `summary.tsx` is a **file only** — there's no `summary/` folder. This makes it a leaf route with no children.

Compare this to `block-level.tsx` which has a corresponding `block-level/` folder, making it a layout route.

```
Leaf route:     summary.tsx              ← File only, no folder
Layout route:   block-level.tsx          ← File + folder pair
                block-level/
                    └── *.tsx
```

---

## 4. Route Matching for `/trade-activity/summary`

### Step-by-Step Matching

| Step | URL Segment          | File Path                             | Route ID                                 | Path Contribution    | Renders              |
| ---- | -------------------- | ------------------------------------- | ---------------------------------------- | -------------------- | -------------------- |
| 1    | (root)               | `__root.tsx`                          | `__root__`                               | -                    | `<Outlet />`         |
| 2    | (pathless)           | `_authenticated.tsx`                  | `/_authenticated`                        | `""` (empty)         | `<Outlet />`         |
| 3    | (pathless)           | `_authenticated/_app.tsx`             | `/_authenticated/_app`                   | `""` (empty)         | Sidebar + `<Outlet />`|
| 4    | `/trade-activity/summary` | `_app/trade-activity/summary.tsx` | `/_authenticated/_app/trade-activity/summary` | `/trade-activity/summary` | SummaryPage content |

### Visual Component Nesting

```
URL: /trade-activity/summary

┌─ __root.tsx ─────────────────────────────────────────────────────┐
│  RootComponent                                                   │
│  ┌─ _authenticated.tsx (path: "") ─────────────────────────────┐ │
│  │  beforeLoad: checks auth                                    │ │
│  │  ┌─ _app.tsx (path: "") ───────────────────────────────────┐│ │
│  │  │  AppLayout                                              ││ │
│  │  │  ┌──────────┐ ┌────────────────────────────────────────┐││ │
│  │  │  │ Sidebar  │ │ app-main                               │││ │
│  │  │  │          │ │ ┌─ summary.tsx ───────────────────────┐│││ │
│  │  │  │ • Block  │ │ │  SummaryPage                        ││││ │
│  │  │  │   Level  │ │ │  ┌─────────────────────────────────┐││││ │
│  │  │  │ • Summary│ │ │  │ PageLayout                      │││││ │
│  │  │  │   ←active│ │ │  │ ┌─────────────────────────────┐ │││││ │
│  │  │  │          │ │ │  │ │ "This is the Summary page"  │ │││││ │
│  │  │  │          │ │ │  │ │ (no tabs, just content)     │ │││││ │
│  │  │  │          │ │ │  │ └─────────────────────────────┘ │││││ │
│  │  │  │          │ │ │  └─────────────────────────────────┘││││ │
│  │  │  │          │ │ └─────────────────────────────────────┘│││ │
│  │  │  └──────────┘ └────────────────────────────────────────┘││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Single Navigation Flow

Unlike `/trade-activity/block-level` which triggers redirects, `/trade-activity/summary` renders in a **single navigation**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION: User visits /trade-activity/summary                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  URL: /trade-activity/summary                                               │
│           │                                                                 │
│           ▼                                                                 │
│  __root.tsx                            ← Renders RootComponent              │
│           │                                                                 │
│           ▼                                                                 │
│  _authenticated.tsx                    ← beforeLoad: checks auth            │
│           │                                                                 │
│           ▼                                                                 │
│  _app.tsx                              ← Renders AppLayout (sidebar)        │
│           │                                                                 │
│           ▼                                                                 │
│  summary.tsx                           ← Renders SummaryPage                │
│                                                                             │
│  ✅ FINAL RENDER — No redirects, no child routes                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Comparison: Leaf Route vs Layout Route

| Aspect                  | `summary.tsx` (Leaf)                     | `block-level.tsx` (Layout)                     |
| ----------------------- | ---------------------------------------- | ---------------------------------------------- |
| **File structure**      | File only                                | File + folder pair                             |
| **Has `<Outlet />`?**   | No                                       | Yes                                            |
| **Children?**           | None                                     | `fx-cash.tsx`, `fx-options.tsx`, `index.tsx`   |
| **URL pattern**         | `/trade-activity/summary` (exact)        | `/trade-activity/block-level/*`                |
| **Renders**             | Final content directly                   | Layout wrapper, children render in Outlet      |
| **Needs index route?**  | No                                       | Yes (for redirect when no child selected)      |

### Why No Index Route for Summary?

`summary.tsx` doesn't need a `summary/index.tsx` because:
- It's a **leaf route** — it renders content directly
- There are no children to redirect to
- The URL `/trade-activity/summary` is handled entirely by `summary.tsx`

For `block-level`, however:
- It's a **layout route** — it renders tabs + `<Outlet />`
- Without an index route, visiting `/trade-activity/block-level` would show empty content
- `block-level/index.tsx` exists to redirect to the default tab

---

## 6. Code Walkthrough

### Route File: `summary.tsx`

```typescript
// src/routes/_authenticated/_app/trade-activity/summary.tsx

import { createFileRoute } from '@tanstack/react-router'
import { SummaryPage } from '@/pages/app/trade-activity/summary'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/summary'  // ← No trailing slash (leaf route)
)({
  component: SummaryPage,  // ← Renders directly, no Outlet needed
})
```

**Key points:**
- No trailing slash in the route path (it's not an index route)
- No `beforeLoad` with redirect (content renders directly)
- Component renders the final content

### Page Component: `SummaryPage.tsx`

```typescript
// src/pages/app/trade-activity/summary/SummaryPage.tsx

import { PageLayout } from '@/components/layout'

export function SummaryPage() {
  return (
    <PageLayout title="Summary Report">
      <div className="page-content">
        <p>This is the Summary page. It has no tabs.</p>
        <p>This demonstrates a simple page without tab navigation.</p>
      </div>
    </PageLayout>
  )
}
```

**Key points:**
- Uses `PageLayout` for consistent styling
- No `<Outlet />` — this is final content
- No tab navigation — simple page structure

---

## 7. Key Takeaways

| Concept                     | Key Point                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| **Leaf route**              | File only, no folder, renders final content                      |
| **No Outlet needed**        | Leaf routes don't have children, so no Outlet                    |
| **Single navigation**       | No redirects, renders in one cycle                               |
| **Route path**              | No trailing slash (not an index route)                           |
| **Pathless parents**        | Still passes through `_authenticated` and `_app` for auth/layout |

### When to Use a Leaf Route

Use a leaf route (like `summary.tsx`) when:
- The page has no sub-navigation (no tabs, no nested views)
- The URL represents a single, complete view
- You don't need to wrap child routes with shared layout

### When to Use a Layout Route

Use a layout route (like `block-level.tsx` + `block-level/`) when:
- The page has sub-navigation (tabs, nested routes)
- You need shared UI (tabs, sub-header) across child routes
- Children should render inside the parent's `<Outlet />`

---

## Summary Diagram

```
/trade-activity/summary          /trade-activity/block-level/fx-cash
        │                                      │
        ▼                                      ▼
┌──────────────────┐               ┌──────────────────┐
│   summary.tsx    │               │ block-level.tsx  │  ← Layout
│   (leaf route)   │               │   (has Outlet)   │
│                  │               │        │         │
│  ┌────────────┐  │               │        ▼         │
│  │ SummaryPage│  │               │  ┌───────────┐   │
│  │  (content) │  │               │  │ fx-cash   │   │
│  └────────────┘  │               │  │ (content) │   │
│                  │               │  └───────────┘   │
└──────────────────┘               └──────────────────┘
     No children                      Has children
```
