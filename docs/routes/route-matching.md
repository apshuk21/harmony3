# TanStack Router - Route Matching & Route Tree

## How Route Matching Works

When a user navigates to a URL, TanStack Router:

1. **Parses the URL** into segments (e.g., `/users/123/posts` → `['users', '123', 'posts']`)
2. **Traverses the route tree** from root to find matching routes
3. **Builds a match chain** of all matched routes (parent → child)
4. **Renders components** from root layout down to the matched leaf route

```
URL: /users/123/posts

Route Tree Traversal:
__root__ → users → $userId → posts
    ↓         ↓        ↓        ↓
 Layout   Layout   Layout    Page
```

---

## The Route Tree

The route tree is a hierarchical structure generated from your file system. It defines:

- **Parent-child relationships** between routes
- **URL patterns** each route matches
- **Route IDs** for internal identification

### Generated Route Tree (`routeTree.gen.ts`)

```typescript
// Simplified structure
export const routeTree = rootRoute
  ._addFileChildren({
    IndexRoute,           // /
    AuthLoginRoute,       // /login
    AuthLogoutRoute,      // /logout
    UsersRoute,           // /users
    UsersUserIdRoute,     // /users/$userId
  })
```

### How the Tree is Built

```
File System                    Route Tree
─────────────                  ──────────
src/routes/
├── __root.tsx          →      rootRoute (parent of all)
├── index.tsx           →        └── IndexRoute (/)
├── _auth/
│   ├── login.tsx       →        └── AuthLoginRoute (/login)
│   └── logout.tsx      →        └── AuthLogoutRoute (/logout)
└── users/
    ├── index.tsx       →        └── UsersIndexRoute (/users)
    └── $userId.tsx     →            └── UsersUserIdRoute (/users/$userId)
```

---

## Route Matching Algorithm

### Step-by-Step Process

```
URL: /users/123

1. Start at root
   └── Match: __root__ ✓ (always matches)

2. Check children of root
   └── /users matches "users" segment ✓

3. Check children of /users
   └── $userId matches "123" (dynamic segment) ✓

4. No more segments, matching complete

Result: [__root__, /users, /users/$userId]
```

### Match Priority

When multiple routes could match, TanStack Router uses this priority:

| Priority | Type | Example | Matches |
|----------|------|---------|---------|
| 1 (highest) | Static | `/users/settings` | Exact match only |
| 2 | Dynamic | `/users/$userId` | Any single segment |
| 3 | Splat/Catch-all | `/files/$` | Any remaining segments |
| 4 (lowest) | Optional | `/users/$userId?` | Zero or one segment |

**Example:**

```
Routes defined:
  /users/settings     (static)
  /users/$userId      (dynamic)

URL: /users/settings  → matches /users/settings (static wins)
URL: /users/123       → matches /users/$userId (dynamic)
```

---

## Types of Routes

### 1. Static Routes

Fixed URL paths that match exactly.

```
File: src/routes/about.tsx
URL:  /about
```

```typescript
// src/routes/about.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})
```

### 2. Index Routes

Default route for a directory, matches the parent path exactly.

```
File: src/routes/users/index.tsx
URL:  /users (not /users/index)
```

```typescript
// src/routes/users/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
  component: UsersListPage,
})
```

### 3. Dynamic Routes

Capture URL segments as parameters using `$paramName`.

```
File: src/routes/users/$userId.tsx
URL:  /users/123 → { userId: '123' }
URL:  /users/abc → { userId: 'abc' }
```

```typescript
// src/routes/users/$userId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$userId')({
  component: UserDetailPage,
})

function UserDetailPage() {
  const { userId } = Route.useParams()
  return <div>User ID: {userId}</div>
}
```

### 4. Catch-All (Splat) Routes

Capture all remaining segments using `$`.

```
File: src/routes/files/$.tsx
URL:  /files/docs/2024/report.pdf → { '*': 'docs/2024/report.pdf' }
```

```typescript
// src/routes/files/$.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/files/$')({
  component: FileViewerPage,
})

function FileViewerPage() {
  const { '*': filePath } = Route.useParams()
  return <div>File: {filePath}</div>
}
```

### 5. Optional Segments

Parameters that may or may not be present using `$paramName?`.

```
File: src/routes/users/$userId?.tsx
URL:  /users      → { userId: undefined }
URL:  /users/123  → { userId: '123' }
```

### 6. Layout Routes

Routes that wrap child routes without adding to the URL path.

```
File: src/routes/_auth.tsx (layout)
File: src/routes/_auth/login.tsx (child)
URL:  /login (not /_auth/login)
```

```typescript
// src/routes/_auth.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="auth-wrapper">
      <Outlet /> {/* Child routes render here */}
    </div>
  )
}
```

### 7. Pathless Layout Groups

Folders prefixed with `_` that organize routes without affecting URLs.

```
Directory: src/routes/_dashboard/
File:      src/routes/_dashboard/settings.tsx
URL:       /settings (not /_dashboard/settings)
```

### 8. Not Found Routes

Handle unmatched URLs.

```typescript
// In __root.tsx
export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return <div>404 - Page Not Found</div>
}
```

---

## Route Matching Examples

### Example 1: Blog Application

```
src/routes/
├── __root.tsx
├── index.tsx                    → /
├── blog/
│   ├── index.tsx                → /blog
│   ├── $postId.tsx              → /blog/123
│   └── $postId/
│       └── comments.tsx         → /blog/123/comments
```

**URL: `/blog/456/comments`**

Match chain:
1. `__root__` - Root layout
2. `/blog` - Blog section (if layout exists)
3. `/blog/$postId` - Post detail
4. `/blog/$postId/comments` - Comments page

### Example 2: E-commerce Application

```
src/routes/
├── __root.tsx
├── _shop.tsx                    → Shop layout (no URL segment)
├── _shop/
│   ├── products/
│   │   ├── index.tsx            → /products
│   │   ├── $categoryId.tsx      → /products/electronics
│   │   └── $categoryId/
│   │       └── $productId.tsx   → /products/electronics/iphone-15
│   └── cart.tsx                 → /cart
├── _auth.tsx                    → Auth layout (no URL segment)
├── _auth/
│   ├── login.tsx                → /login
│   └── register.tsx             → /register
```

### Example 3: Nested Dynamic Routes

```
src/routes/
├── __root.tsx
├── organizations/
│   ├── $orgId/
│   │   ├── index.tsx            → /organizations/acme
│   │   ├── teams/
│   │   │   ├── index.tsx        → /organizations/acme/teams
│   │   │   └── $teamId.tsx      → /organizations/acme/teams/engineering
```

**URL: `/organizations/acme/teams/engineering`**

```typescript
// Access all params
const { orgId, teamId } = Route.useParams()
// orgId = 'acme', teamId = 'engineering'
```

---

## Route Tree Visualization

For the current project:

```
Route Tree
──────────
__root__ (/)
├── index (/) → redirects to /login
├── _auth/login (/login)
└── _auth/logout (/logout)

URL Resolution:
/           → __root__ → index → redirect to /login
/login      → __root__ → _auth/login
/logout     → __root__ → _auth/logout
/unknown    → __root__ → notFoundComponent (if defined)
```

---

## Summary

| Route Type | File Pattern | URL Example | Use Case |
|------------|--------------|-------------|----------|
| Static | `about.tsx` | `/about` | Fixed pages |
| Index | `users/index.tsx` | `/users` | Directory default |
| Dynamic | `$userId.tsx` | `/users/123` | Variable segments |
| Catch-all | `$.tsx` | `/files/any/path` | File browsers, wildcards |
| Optional | `$id?.tsx` | `/users` or `/users/1` | Optional params |
| Layout | `_auth.tsx` | N/A | Shared layouts |
| Pathless | `_folder/` | N/A | Organization only |

**Key Points:**
- Routes are matched from most specific to least specific
- The route tree determines parent-child relationships
- Layout routes wrap children via `<Outlet />`
- Dynamic params are accessed via `Route.useParams()`
