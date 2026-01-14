# TanStack Router - File-Based Routing Guide

## Route File Conventions

| File/Folder Pattern | Purpose |
|---------------------|---------|
| `__root.tsx` | Root layout (wraps all routes) |
| `index.tsx` | Index route for a directory (`/` or `/parent`) |
| `about.tsx` | Static route (`/about`) |
| `$id.tsx` | Dynamic route (`/users/$id`) |
| `_layout/` | Pathless layout group |
| `(group)/` | Route group (organizational only) |

---

## Pathless Layout Groups

A **pathless layout group** is a folder prefixed with underscore (`_`) that organizes routes **without affecting their URL paths**.

### How It Works

```
src/routes/
├── _auth/
│   ├── login.tsx    → URL: /login
│   └── logout.tsx   → URL: /logout
```

The `_auth` folder is **invisible** in the URL. It exists only for file organization.

### Comparison

| Folder Name | File Inside | Resulting URL |
|-------------|-------------|---------------|
| `_auth/` | `login.tsx` | `/login` |
| `auth/` | `login.tsx` | `/auth/login` |

---

## Why Use Pathless Groups?

### 1. Organize Related Files

Group related routes together without changing URLs:

```
src/routes/
├── _auth/
│   ├── login.tsx      → /login
│   ├── logout.tsx     → /logout
│   ├── register.tsx   → /register
│   └── forgot-password.tsx → /forgot-password
├── _dashboard/
│   ├── settings.tsx   → /settings
│   └── profile.tsx    → /profile
```

### 2. Share a Layout Between Routes

Create a layout file with the same name as the folder:

```
src/routes/
├── _auth.tsx          → Layout for all _auth/ routes
├── _auth/
│   ├── login.tsx      → /login (uses _auth.tsx layout)
│   └── logout.tsx     → /logout (uses _auth.tsx layout)
```

**`_auth.tsx` example:**

```typescript
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <Outlet />
      </div>
    </div>
  )
}
```

This wraps login and logout pages in a centered card layout without adding `/auth` to the URL.

### 3. Apply Route Guards to a Group

Protect multiple routes with a single guard:

```typescript
// _auth.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const isAuthenticated = await checkAuth()
    if (isAuthenticated) {
      // Already logged in, redirect to dashboard
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AuthLayout,
})
```

---

## Route Groups vs Pathless Layout Groups

| Feature | Pathless Layout (`_folder`) | Route Group (`(folder)`) |
|---------|----------------------------|--------------------------|
| Affects URL | No | No |
| Can have layout file | Yes (`_folder.tsx`) | No |
| Purpose | Layout sharing + organization | Pure organization |

### Route Group Example

```
src/routes/
├── (marketing)/
│   ├── about.tsx      → /about
│   └── pricing.tsx    → /pricing
├── (app)/
│   ├── dashboard.tsx  → /dashboard
│   └── settings.tsx   → /settings
```

Route groups with parentheses `()` are purely organizational and cannot have associated layout files.

---

## Nested Pathless Groups

You can nest pathless groups:

```
src/routes/
├── _auth/
│   ├── _social/
│   │   ├── google.tsx    → /google
│   │   └── github.tsx    → /github
│   ├── login.tsx         → /login
│   └── logout.tsx        → /logout
```

---

## Common Patterns

### Authentication Routes

```
src/routes/
├── _auth.tsx              → Minimal layout (no navbar)
├── _auth/
│   ├── login.tsx          → /login
│   ├── register.tsx       → /register
│   └── forgot-password.tsx → /forgot-password
```

### Protected Dashboard Routes

```
src/routes/
├── _dashboard.tsx         → Auth guard + sidebar layout
├── _dashboard/
│   ├── index.tsx          → /dashboard (if using dashboard folder)
│   ├── settings.tsx       → /settings
│   └── profile.tsx        → /profile
```

### Public vs Private Separation

```
src/routes/
├── _public/
│   ├── about.tsx          → /about
│   └── contact.tsx        → /contact
├── _private/
│   ├── dashboard.tsx      → /dashboard
│   └── settings.tsx       → /settings
├── _public.tsx            → Public layout (full navbar)
├── _private.tsx           → Private layout (auth guard + sidebar)
```

---

## Summary

- **Underscore prefix (`_`)** = pathless (URL unchanged)
- **No prefix** = path segment added to URL
- **Pathless groups** are ideal for:
  - Organizing related routes
  - Sharing layouts
  - Applying route guards to multiple routes
