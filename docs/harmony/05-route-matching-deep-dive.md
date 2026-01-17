# 05 - Route Matching Deep Dive

A detailed explanation of how TanStack Router matches URLs to route files.

---

## Table of Contents

1. [Route Matching for a URL](#1-route-matching-for-a-url)
2. [How Router Chooses Between Pathless Routes](#2-how-router-chooses-between-pathless-routes)
3. [File + Folder Pattern](#3-file--folder-pattern)
4. [Trailing Slash in createFileRoute](#4-trailing-slash-in-createfileroute)
5. [Critical: When Index Routes Are Skipped](#5-critical-when-index-routes-are-skipped)

---

## 1. Route Matching for a URL

### Example: `/trade-activity/block-level/fx-cash`

#### Step-by-Step Matching

| Step | URL Segment                   | File Path                             | Route ID                                                  | Path Contribution             | Renders                |
| ---- | ----------------------------- | ------------------------------------- | --------------------------------------------------------- | ----------------------------- | ---------------------- |
| 1    | (root)                        | `__root.tsx`                          | `__root__`                                                | -                             | `<Outlet />`           |
| 2    | (pathless)                    | `_authenticated.tsx`                  | `/_authenticated`                                         | `""` (empty)                  | `<Outlet />`           |
| 3    | (pathless)                    | `_authenticated/_app.tsx`             | `/_authenticated/_app`                                    | `""` (empty)                  | Sidebar + `<Outlet />` |
| 4    | `/trade-activity/block-level` | `_app/trade-activity/block-level.tsx` | `/_authenticated/_app/trade-activity/block-level`         | `/trade-activity/block-level` | Tabs + `<Outlet />`    |
| 5    | `/fx-cash`                    | `block-level/fx-cash.tsx`             | `/_authenticated/_app/trade-activity/block-level/fx-cash` | `/fx-cash`                    | FxCashTab content      |

#### Key Insight: Pathless Routes Don't Consume URL Segments

From the generated `routeTree.gen.ts`:

```typescript
// Pathless - has id but NO path contribution
const AuthenticatedRoute = { id: '/_authenticated', path: '' } // ← empty path
const AuthenticatedAppRoute = { id: '/_app', path: '' } // ← empty path

// Path routes - actually consume URL segments
const AuthenticatedAppTradeActivityBlockLevelRoute = {
  id: '/trade-activity/block-level',
  path: '/trade-activity/block-level', // ← consumes these segments
}

const AuthenticatedAppTradeActivityBlockLevelFxCashRoute = {
  id: '/fx-cash',
  path: '/fx-cash', // ← consumes this segment
}
```

#### Visual Component Nesting

```
URL: /trade-activity/block-level/fx-cash

┌─ __root.tsx ─────────────────────────────────────────────────────┐
│  RootComponent                                                   │
│  ┌─ _authenticated.tsx (path: "") ─────────────────────────────┐ │
│  │  beforeLoad: checks auth                                    │ │
│  │  ┌─ _app.tsx (path: "") ───────────────────────────────────┐│ │
│  │  │  AppLayout                                              ││ │
│  │  │  ┌──────────┐ ┌────────────────────────────────────────┐││ │
│  │  │  │ Sidebar  │ │ app-main                               │││ │
│  │  │  │          │ │ ┌─ block-level.tsx ───────────────────┐│││ │
│  │  │  │ • Block  │ │ │  BlockLevelPage                     ││││ │
│  │  │  │   Level  │ │ │  ┌─────────────────────────────────┐││││ │
│  │  │  │ • Summary│ │ │  │ Tabs: [FX Cash] [FX Options]    │││││ │
│  │  │  │          │ │ │  ├─────────────────────────────────┤││││ │
│  │  │  │          │ │ │  │ ┌─ fx-cash.tsx ────────────────┐│││││ │
│  │  │  │          │ │ │  │ │  FxCashTab                   ││││││ │
│  │  │  │          │ │ │  │ │  (actual content)            ││││││ │
│  │  │  │          │ │ │  │ └──────────────────────────────┘│││││ │
│  │  │  │          │ │ │  └─────────────────────────────────┘││││ │
│  │  │  │          │ │ └─────────────────────────────────────┘│││ │
│  │  │  └──────────┘ └────────────────────────────────────────┘││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### The Two Types of IDs

| Type                    | Example                                                   | URL Impact                    |
| ----------------------- | --------------------------------------------------------- | ----------------------------- |
| **Route ID** (internal) | `/_authenticated/_app/trade-activity/block-level/fx-cash` | Used for parent relationships |
| **Full Path** (URL)     | `/trade-activity/block-level/fx-cash`                     | What appears in browser       |

The `_` prefix in file names (`_authenticated`, `_app`) creates **pathless layout routes** that:

- Are part of the route tree (have an ID)
- Run `beforeLoad` hooks
- Render components with `<Outlet />`
- **Do NOT add segments to the URL**

---

## 2. How Router Chooses Between Pathless Routes

### The Question

How does the router know to check `_authenticated`, not `_public`?

### The Answer

The router doesn't inherently "know" - it checks **both** pathless routes simultaneously, and the one whose children match the URL wins.

### Matching Logic for `/trade-activity/block-level/fx-cash`

```
__root__ (parent of all)
    │
    ├── _authenticated (path: "")  ──► checks children
    │       │
    │       └── _app (path: "")  ──► checks children
    │               │
    │               └── /trade-activity/block-level/fx-cash  ✅ MATCH!
    │
    ├── _public (path: "")  ──► checks children
    │       │
    │       ├── /login  ❌ doesn't match
    │       └── /logout  ❌ doesn't match
    │
    └── / (index)  ❌ doesn't match
```

### The Key: It's About Child Route Matching

Both `_authenticated` and `_public` have **empty paths** (`path: ""`), so they both "match" initially. But the router looks deeper:

| Pathless Route   | Children                     | Has `/trade-activity/...`? |
| ---------------- | ---------------------------- | -------------------------- |
| `_public`        | `/login`, `/logout`          | ❌ No                      |
| `_authenticated` | `_app` → `/trade-activity/*` | ✅ Yes                     |

The router traverses the tree and finds that **only** `_authenticated`'s descendants can satisfy `/trade-activity/block-level/fx-cash`.

### What About `/login`?

```
URL: /login

__root__
    │
    ├── _authenticated  ──► checks children
    │       │
    │       └── _app  ──► checks children
    │               │
    │               └── /trade-activity/*  ❌ doesn't match /login
    │
    ├── _public  ──► checks children
    │       │
    │       ├── /login  ✅ MATCH!
    │       └── /logout
    │
    └── / (index)  ❌ doesn't match
```

For `/login`, `_public`'s children match, so `_public` layout is used.

### Summary

```
URL: /trade-activity/block-level/fx-cash

Step 1: Start at __root__
Step 2: Check all children with path "" or matching path
        - _authenticated (path: "") → continue checking its children
        - _public (path: "") → continue checking its children
        - / (path: "/") → doesn't match, skip

Step 3: For _authenticated → _app → children include /trade-activity/*
        For _public → children are only /login, /logout

Step 4: Only _authenticated's subtree has a route for /trade-activity/...

Step 5: Match chain: __root__ → _authenticated → _app → block-level → fx-cash
```

The router uses **deepest match wins** - it finds the complete path through the tree, and pathless layouts along that path get rendered.

---

## 3. File + Folder Pattern

### The Structure

```
trade-activity/
├── index.tsx                    ← Index route for /trade-activity
├── block-level.tsx              ← Layout for /trade-activity/block-level/*
└── block-level/                 ← Children of block-level
    ├── index.tsx                ← Index route for /trade-activity/block-level
    ├── fx-cash.tsx              ← /trade-activity/block-level/fx-cash
    └── fx-options.tsx           ← /trade-activity/block-level/fx-options
```

### What Each File Does

#### 1. `trade-activity/index.tsx` — Group Index Route

```typescript
// URL: /trade-activity (exact)
export const Route = createFileRoute('/_authenticated/_app/trade-activity/')({
  beforeLoad: () => {
    throw redirect({ to: '/trade-activity/block-level' })
  },
})
```

**Purpose**: Handles when user visits `/trade-activity` exactly (no sub-path).
**Behavior**: Redirects to the default page (`/trade-activity/block-level`).

---

#### 2. `block-level.tsx` — Layout Route (File + Folder Pair)

```typescript
// URL: /trade-activity/block-level/* (layout for all children)
export const Route = createFileRoute('/_authenticated/_app/trade-activity/block-level')({
  component: BlockLevelPage, // Renders tabs + <Outlet />
})
```

**Purpose**: Acts as a **layout wrapper** for all routes inside `block-level/` folder.
**Behavior**: Renders `BlockLevelPage` (which has tabs and `<Outlet />`), and children render inside that outlet.

---

#### 3. `block-level/index.tsx` — Page Index Route

```typescript
// URL: /trade-activity/block-level (exact, no tab selected)
export const Route = createFileRoute('/_authenticated/_app/trade-activity/block-level/')({
  beforeLoad: () => {
    throw redirect({ to: '/trade-activity/block-level/fx-cash' })
  },
})
```

**Purpose**: Handles when user visits `/trade-activity/block-level` exactly (no tab).
**Behavior**: Redirects to the default tab (`fx-cash`).

---

### Visual Flow

The diagram below shows **three separate navigation cycles**, not one continuous flow. Each redirect triggers a **new navigation** where the router re-evaluates the URL from scratch.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION 1: User visits /trade-activity                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  URL: /trade-activity                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  trade-activity/index.tsx                                                   │
│           │                                                                 │
│           │ beforeLoad: throw redirect({ to: '/trade-activity/block-level' })
│           ▼                                                                 │
│  🔄 REDIRECT — Browser navigates to new URL                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION 2: Browser follows redirect to /trade-activity/block-level      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  URL: /trade-activity/block-level                                           │
│           │                                                                 │
│           ▼                                                                 │
│  block-level.tsx (LAYOUT)          ← Renders BlockLevelPage with tabs       │
│           │                                                                 │
│           ▼                                                                 │
│  block-level/index.tsx             ← Matches exact /block-level (no child)  │
│           │                                                                 │
│           │ beforeLoad: throw redirect({ to: '/trade-activity/block-level/fx-cash' })
│           ▼                                                                 │
│  🔄 REDIRECT — Browser navigates to new URL                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION 3: Browser follows redirect to /trade-activity/block-level/fx-cash
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  URL: /trade-activity/block-level/fx-cash                                   │
│           │                                                                 │
│           ▼                                                                 │
│  block-level.tsx (LAYOUT)          ← Renders BlockLevelPage with tabs       │
│           │                                                                 │
│           └──► <Outlet /> renders:                                          │
│                        │                                                    │
│                        ▼                                                    │
│                  block-level/fx-cash.tsx  ← Tab content                     │
│                                                                             │
│  ✅ FINAL RENDER — No more redirects                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Does `block-level.tsx` Appear in Both Navigation 2 and 3?

Each navigation is **independent**. When a redirect happens:
1. The current render is aborted
2. Browser URL changes
3. Router starts fresh with the new URL

So `block-level.tsx` renders in Navigation 2, but that render is interrupted by the redirect from `block-level/index.tsx`. Then in Navigation 3, `block-level.tsx` renders again as part of the new, complete render cycle.

**Key insight**: The layout in Navigation 2 may not even fully mount before the redirect fires (since `beforeLoad` runs before component rendering).

### The Key Distinction

| File                    | Route Path (trailing slash matters!) | When it matches                                 |
| ----------------------- | ------------------------------------ | ----------------------------------------------- |
| `block-level.tsx`       | `/trade-activity/block-level`        | **Layout** for ALL `/block-level/*` routes      |
| `block-level/index.tsx` | `/trade-activity/block-level/`       | **Exact** match of `/block-level` with no child |

### Why Both Exist?

- **`block-level.tsx`** = Layout wrapper (always renders when URL starts with `/block-level`)
- **`block-level/index.tsx`** = What to show when URL is exactly `/block-level` (no tab selected)

Without the folder, `block-level.tsx` would be a **leaf route** (no children).
With the folder, `block-level.tsx` becomes a **layout route** that wraps its children.

```
File only:          block-level.tsx     → Leaf route, no children possible

File + Folder:      block-level.tsx     → Layout route
                    block-level/        → Children go here
                        └── *.tsx       → Render inside layout's <Outlet />
```

---

## 4. Trailing Slash in createFileRoute

### With vs Without Trailing Slash

| Pattern         | Example                          | Meaning                            |
| --------------- | -------------------------------- | ---------------------------------- |
| **Without `/`** | `'/trade-activity/block-level'`  | Layout route OR leaf route         |
| **With `/`**    | `'/trade-activity/block-level/'` | **Index route** (exact match only) |

### In Your Codebase

```typescript
// block-level.tsx — LAYOUT (no trailing slash)
createFileRoute('/_authenticated/_app/trade-activity/block-level')
// Matches: /trade-activity/block-level AND all children
// Renders: BlockLevelPage with <Outlet /> for children

// block-level/index.tsx — INDEX (trailing slash)
createFileRoute('/_authenticated/_app/trade-activity/block-level/')
// Matches: /trade-activity/block-level EXACTLY (no child path)
// Renders: Only when no child route is active

// fx-cash.tsx — LEAF (no trailing slash)
createFileRoute('/_authenticated/_app/trade-activity/block-level/fx-cash')
// Matches: /trade-activity/block-level/fx-cash exactly
// Renders: FxCashTab content
```

### Visual Example

```
URL: /trade-activity/block-level/fx-cash

block-level   (no /)  ✅ matches — renders layout
block-level/  (with /) ❌ doesn't match — URL has /fx-cash after it
fx-cash       (no /)  ✅ matches — renders inside layout's Outlet
```

```
URL: /trade-activity/block-level

block-level   (no /)  ✅ matches — renders layout
block-level/  (with /) ✅ matches — renders inside layout's Outlet (then redirects)
```

### The Rule

| File Name                 | Route Path            | Purpose                                       |
| ------------------------- | --------------------- | --------------------------------------------- |
| `block-level.tsx`         | `block-level`         | Layout wrapper                                |
| `block-level/index.tsx`   | `block-level/`        | What shows when URL is exactly `/block-level` |
| `block-level/fx-cash.tsx` | `block-level/fx-cash` | Child route                                   |

### Folder Analogy

Think of it like a folder on your computer:

```
/Users/you/Documents/               ← The folder itself (index)
/Users/you/Documents/report.pdf     ← A file inside the folder
```

| Route Path            | Analogy                                  | Matches When                                |
| --------------------- | ---------------------------------------- | ------------------------------------------- |
| `block-level`         | The folder **and everything inside**     | URL is `/block-level` or `/block-level/*`   |
| `block-level/`        | The folder **itself** (when you open it) | URL is exactly `/block-level`, nothing more |
| `block-level/fx-cash` | A specific file inside                   | URL is exactly `/block-level/fx-cash`       |

### Why Do We Need Both?

**`block-level.tsx`** (no slash) = **Layout wrapper**

- Always renders when URL contains `/block-level`
- Has `<Outlet />` where children render
- Think: "the container"

**`block-level/index.tsx`** (with slash) = **Default content**

- Only renders when URL is exactly `/block-level` with no child
- In your case, it redirects to `/fx-cash`
- Think: "what to show when no specific child is selected"

### Without the Index Route

If you deleted `block-level/index.tsx`:

```
URL: /trade-activity/block-level

block-level.tsx renders (layout with tabs)
<Outlet /> has NOTHING to render ← empty content area!
```

The tabs would show, but the content area would be blank because no child route matches.

### Visual Component Tree

```
URL: /trade-activity/block-level

┌─ block-level.tsx (matches 'block-level') ─────────────┐
│                                                        │
│   ┌─────────────────────────────────────┐             │
│   │ Tabs: [FX Cash] [FX Options]        │             │
│   └─────────────────────────────────────┘             │
│                                                        │
│   ┌─ <Outlet /> ──────────────────────────────────┐   │
│   │                                                │   │
│   │  block-level/index.tsx (matches 'block-level/')│   │
│   │  → redirects to /fx-cash                       │   │
│   │                                                │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```
URL: /trade-activity/block-level/fx-cash

┌─ block-level.tsx (matches 'block-level') ─────────────┐
│                                                        │
│   ┌─────────────────────────────────────┐             │
│   │ Tabs: [FX Cash] [FX Options]        │             │
│   └─────────────────────────────────────┘             │
│                                                        │
│   ┌─ <Outlet /> ──────────────────────────────────┐   │
│   │                                                │   │
│   │  fx-cash.tsx (matches 'block-level/fx-cash')  │   │
│   │  → renders FxCashTab content                   │   │
│   │                                                │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 5. Critical: When Index Routes Are Skipped

This is one of the most important concepts to understand about TanStack Router's file-based routing.

### The Rule

**Index routes (trailing slash) only match when there are NO more URL segments after them.**

If the URL has additional path segments, the index route is **completely skipped** — it's never consulted, never executed.

### Example: Visiting `/trade-activity/block-level/fx-cash` Directly

When you navigate directly to `/trade-activity/block-level/fx-cash`:

| File                      | Route Path                  | Matches? | Why                                          |
| ------------------------- | --------------------------- | -------- | -------------------------------------------- |
| `block-level.tsx`         | `/trade-activity/block-level` | ✅ Yes   | Layout for all `/block-level/*` routes       |
| `block-level/index.tsx`   | `/trade-activity/block-level/` | ❌ **No** | URL has `/fx-cash` after it — index skipped! |
| `block-level/fx-cash.tsx` | `/trade-activity/block-level/fx-cash` | ✅ Yes | Exact match for this URL                     |

### What Actually Renders

```
URL: /trade-activity/block-level/fx-cash

block-level.tsx (LAYOUT)     ✅ Renders — wraps children
    │
    └──► <Outlet /> renders:
              │
              ▼
         fx-cash.tsx          ✅ Renders — tab content

block-level/index.tsx        ❌ NEVER consulted — URL has /fx-cash after it
```

### The Trailing Slash Makes It an "Exact Match Only" Route

```typescript
// block-level/index.tsx
createFileRoute('/_authenticated/_app/trade-activity/block-level/')
//                                                              ↑
//                                                     Trailing slash
//                                                     = ONLY matches when URL is EXACTLY
//                                                       /trade-activity/block-level
//                                                       (nothing after it)
```

### Visual Decision Tree

```
URL: /trade-activity/block-level/fx-cash
         │
         ▼
    Router checks: Does URL end at /block-level?
         │
         ├── YES (URL is exactly /trade-activity/block-level)
         │         │
         │         ▼
         │    block-level/index.tsx  ← Matches, runs redirect
         │
         └── NO (URL continues with /fx-cash)
                   │
                   ▼
              block-level/index.tsx is SKIPPED entirely
                   │
                   ▼
              Look for route matching /fx-cash
                   │
                   ▼
              fx-cash.tsx  ✅ MATCH!
```

### Same Logic Applies at Every Level

This rule applies consistently throughout your route tree:

| URL                                   | `trade-activity/index.tsx` | `block-level/index.tsx` |
| ------------------------------------- | -------------------------- | ----------------------- |
| `/trade-activity`                     | ✅ Runs (redirects)        | N/A                     |
| `/trade-activity/summary`             | ❌ Skipped                 | N/A                     |
| `/trade-activity/block-level`         | ❌ Skipped                 | ✅ Runs (redirects)     |
| `/trade-activity/block-level/fx-cash` | ❌ Skipped                 | ❌ Skipped              |

### Why This Matters

Understanding this prevents confusion like:

> "Why doesn't `/trade-activity/summary` redirect to `/block-level`? Doesn't it go through `trade-activity/index.tsx` first?"

**Answer**: No! The URL has `/summary` after `/trade-activity`, so `trade-activity/index.tsx` (which has a trailing slash in its route path) is completely skipped. The router goes directly to `summary.tsx`.

### Index Routes Are Siblings, Not Parents

The file structure creates **sibling routes**, not a parent-child chain:

```
trade-activity/
├── index.tsx       ← Sibling: handles /trade-activity (exact)
├── summary.tsx     ← Sibling: handles /trade-activity/summary
└── block-level.tsx ← Sibling: handles /trade-activity/block-level/*
```

The router picks **one** sibling based on the URL. It doesn't "pass through" index.tsx to reach other siblings.

### Computer Folder Analogy

```
/Documents/                    ← Opening the folder itself (index route)
/Documents/report.pdf          ← A specific file (summary.tsx)
/Documents/projects/           ← A subfolder (block-level layout)
```

When you open `/Documents/report.pdf`, your computer doesn't first "open" the Documents folder and then navigate to the file. It goes **directly** to `report.pdf`.

Similarly, when you visit `/trade-activity/summary`, the router goes **directly** to `summary.tsx` without ever consulting `index.tsx`.

---

## Summary

| Concept                         | Key Point                                                               |
| ------------------------------- | ----------------------------------------------------------------------- |
| **Pathless routes** (`_prefix`) | Don't add to URL, but run hooks and render layouts                      |
| **Route selection**             | Router checks all pathless routes, picks the one with matching children |
| **File + Folder pair**          | File = layout wrapper, Folder = children                                |
| **Trailing slash**              | `path/` = index (exact match), `path` = layout or leaf                  |
| **Index routes**                | Handle "what to show when URL stops here"                               |
| **Index routes are skipped**    | If URL has more segments after the path, index route is never consulted |
