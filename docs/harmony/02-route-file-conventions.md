# 02 - TanStack Router File Conventions

Understanding the naming conventions and how files/folders work together.

---

## Table of Contents

1. [The Underscore Conventions](#1-the-underscore-conventions)
2. [File + Folder Pairing](#2-file--folder-pairing)
3. [How Layouts Work](#3-how-layouts-work)
4. [Visual Walkthrough](#4-visual-walkthrough)
5. [Common Patterns](#5-common-patterns)

---

## 1. The Underscore Conventions

### Single Underscore (`_`) - Pathless/Layout Route

A single underscore prefix means **"don't add this to the URL"**.

```
_authenticated.tsx    → URL: (nothing added)
_public.tsx          → URL: (nothing added)
_app.tsx             → URL: (nothing added)
```

**Use cases:**
- Layout wrappers
- Auth guards
- Grouping related routes

### Double Underscore (`__`) - Special Files

A double underscore prefix means **"this is a special TanStack Router file"**.

```
__root.tsx           → The root of all routes (required)
```

Currently, `__root.tsx` is the only double-underscore file. It's the parent of every route in your app.

### Summary

| Prefix | Meaning | Example | URL Impact |
|--------|---------|---------|------------|
| `__` | Special file | `__root.tsx` | Root of route tree |
| `_` | Pathless/Layout | `_authenticated.tsx` | No URL segment added |
| (none) | Normal route | `login.tsx` | Adds `/login` to URL |

---

## 2. File + Folder Pairing

This is the key concept that often confuses people.

### The Pattern

When you have a file and folder with the **same name**, they work together:

```
_authenticated.tsx      ← Layout file (has <Outlet />)
_authenticated/         ← Folder containing child routes
├── _app.tsx
└── _app/
    └── ...
```

### How It Works

```
_authenticated.tsx     = The LAYOUT (wrapper component)
_authenticated/        = The CHILDREN (routes inside this layout)
```

**The layout file renders an `<Outlet />`** where child routes appear.

### Visual Example

```
┌─────────────────────────────────────┐
│  _authenticated.tsx                 │
│  ┌───────────────────────────────┐  │
│  │  <Outlet />                   │  │
│  │  ↓                            │  │
│  │  Children from _authenticated/│  │
│  │  folder render here           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Code Example

```typescript
// _authenticated.tsx
function AuthenticatedLayout() {
  return (
    <div>
      {/* Auth check happens in beforeLoad */}
      <Outlet />  {/* ← Children render here */}
    </div>
  )
}

// _authenticated/_app.tsx renders inside that <Outlet />
```

---

## 3. How Layouts Work

### Nesting Visualization

Your current route structure:

```
__root.tsx
│
├── _public.tsx                    (Layout: centered container)
│   └── _public/
│       ├── login.tsx              → /login
│       └── logout.tsx             → /logout
│
└── _authenticated.tsx             (Layout: auth guard)
    └── _authenticated/
        └── _app.tsx               (Layout: sidebar + header)
            └── _app/
                └── trade-activity/
                    └── block-level.tsx    (Layout: page + tabs)
                        └── block-level/
                            ├── fx-cash.tsx    → /trade-activity/block-level/fx-cash
                            └── fx-options.tsx → /trade-activity/block-level/fx-options
```

### What Renders When You Visit `/trade-activity/block-level/fx-cash`

```
1. __root.tsx
   └── renders <Outlet />

2. _authenticated.tsx (matched because fx-cash is inside _authenticated/)
   └── runs beforeLoad (auth check)
   └── renders <Outlet />

3. _app.tsx (matched because fx-cash is inside _app/)
   └── renders Sidebar + Header + <Outlet />

4. block-level.tsx (matched because fx-cash is inside block-level/)
   └── renders Page Title + Tab Nav + <Outlet />

5. fx-cash.tsx (leaf route - final match)
   └── renders the actual tab content
```

### The Resulting DOM

```html
<!-- From __root.tsx -->
<div>
  <!-- From _authenticated.tsx (just passes through) -->

  <!-- From _app.tsx -->
  <div class="app-layout">
    <aside class="sidebar">...</aside>
    <div class="app-main">
      <header>...</header>
      <main>
        <!-- From block-level.tsx -->
        <div class="page">
          <h2>Block Level Report</h2>
          <nav class="tab-nav">...</nav>
          <div class="tab-content">
            <!-- From fx-cash.tsx -->
            <div class="tab-panel">
              <h3>FX Cash Report</h3>
              <table>...</table>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</div>
```

---

## 4. Visual Walkthrough

### Understanding the File Structure

```
src/routes/
│
├── __root.tsx                 [1] SPECIAL: Root of everything
│                                  - Always renders
│                                  - Parent of all routes
│
├── index.tsx                  [2] URL: /
│                                  - Redirects to /login
│
├── _public.tsx                [3] LAYOUT (pathless)
│                                  - No URL segment
│                                  - Provides centered layout
│
├── _public/                   [4] CHILDREN of _public.tsx
│   ├── login.tsx                  URL: /login (not /_public/login)
│   └── logout.tsx                 URL: /logout
│
├── _authenticated.tsx         [5] LAYOUT (pathless)
│                                  - No URL segment
│                                  - Provides auth guard
│
└── _authenticated/            [6] CHILDREN of _authenticated.tsx
    │
    ├── _app.tsx               [7] LAYOUT (pathless)
    │                              - No URL segment
    │                              - Provides sidebar + header
    │
    └── _app/                  [8] CHILDREN of _app.tsx
        │
        └── trade-activity/    [9] FOLDER: adds /trade-activity to URL
            │
            ├── index.tsx          URL: /trade-activity (redirects)
            │
            ├── summary.tsx        URL: /trade-activity/summary
            │
            ├── block-level.tsx    [10] LAYOUT: adds /block-level
            │                           - Provides page title + tabs
            │
            └── block-level/       [11] CHILDREN of block-level.tsx
                ├── index.tsx          URL: /trade-activity/block-level (redirects)
                ├── fx-cash.tsx        URL: /trade-activity/block-level/fx-cash
                └── fx-options.tsx     URL: /trade-activity/block-level/fx-options
```

### URL Building

Let's trace how the URL `/trade-activity/block-level/fx-cash` is built:

```
__root.tsx           → (nothing)
_authenticated.tsx   → (nothing - pathless)
_app.tsx            → (nothing - pathless)
trade-activity/     → /trade-activity
block-level.tsx     → /trade-activity/block-level
fx-cash.tsx         → /trade-activity/block-level/fx-cash
```

**Only folders/files WITHOUT underscore prefix add to the URL.**

---

## 5. Common Patterns

### Pattern 1: Layout with Children

When you need a wrapper around a group of routes:

```
_layoutName.tsx         ← Has <Outlet />, defines the wrapper
_layoutName/            ← Contains routes that render inside
    ├── page1.tsx
    └── page2.tsx
```

### Pattern 2: Page with Tabs

When a page has tabs that should be in the URL:

```
page-name.tsx           ← Has <Outlet />, renders tabs nav
page-name/              ← Tab contents
    ├── index.tsx       ← Redirects to default tab
    ├── tab1.tsx
    └── tab2.tsx
```

### Pattern 3: Auth Guard

Protect all routes inside a folder:

```
_authenticated.tsx      ← beforeLoad checks auth, redirects if not
_authenticated/
    └── ...             ← All routes here require auth
```

### Pattern 4: Public Routes

Routes that don't require auth:

```
_public.tsx             ← Different layout (no sidebar)
_public/
    ├── login.tsx
    └── about.tsx
```

---

## Quick Reference

| File/Folder | URL Added | Purpose |
|-------------|-----------|---------|
| `__root.tsx` | (none) | Root of all routes |
| `_name.tsx` | (none) | Layout wrapper |
| `_name/` | (none) | Children of layout |
| `name.tsx` | `/name` | Route or layout |
| `name/` | `/name` | Children of route |
| `index.tsx` | (none) | Default for folder |
| `$param.tsx` | `/:param` | Dynamic segment |

---

## Mental Model

Think of it like Russian nesting dolls:

```
__root.tsx (outermost)
    └── _authenticated.tsx (auth layer)
        └── _app.tsx (app shell layer)
            └── trade-activity/ (group layer)
                └── block-level.tsx (page layer)
                    └── fx-cash.tsx (innermost - actual content)
```

Each layer can:
1. Run code before loading (`beforeLoad`)
2. Wrap children in UI (`component` with `<Outlet />`)
3. Pass data down (`context`)

The underscore (`_`) just means "I'm a layer, but don't add me to the URL."
