# Zod Validation Guide

## Table of Contents

1. [Overview](#overview)
2. [Why Zod?](#why-zod)
3. [Installation](#installation)
4. [Environment Variable Validation](#environment-variable-validation)
   - [Setup](#setup)
   - [Usage](#usage)
   - [Adding New Variables](#adding-new-variables)
   - [Deep Dive: Why We Created env.ts](#deep-dive-why-we-created-srclibenvts)
   - [Development vs Production Environments](#development-vs-production-environments)
   - [Production Deployment: What You Need to Know](#production-deployment-what-you-need-to-know)
5. [Route Search Params Validation](#route-search-params-validation)
6. [API Response Validation](#api-response-validation)
7. [Form Validation](#form-validation)
8. [Common Patterns](#common-patterns)
9. [Best Practices](#best-practices)

---

## Overview

Zod is a TypeScript-first schema validation library. It allows you to define schemas that validate data at runtime while automatically inferring TypeScript types.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZOD IN OUR ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │  Environment    │     │  URL Search     │     │  API Responses  │      │
│   │   Variables     │     │    Params       │     │                 │      │
│   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘      │
│            │                       │                       │               │
│            ▼                       ▼                       ▼               │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                      ZOD VALIDATION LAYER                        │      │
│   │                                                                  │      │
│   │   • Runtime validation                                           │      │
│   │   • Type inference                                               │      │
│   │   • Default values                                               │      │
│   │   • Error messages                                               │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│            │                       │                       │               │
│            ▼                       ▼                       ▼               │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │  Typed `env`    │     │  Typed Search   │     │  Typed Data     │      │
│   │    Object       │     │    Params       │     │   Objects       │      │
│   └─────────────────┘     └─────────────────┘     └─────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Zod?

### The Problem: Runtime vs Compile Time

TypeScript only checks types at compile time. At runtime, data from external sources is untyped:

```typescript
// ❌ This compiles but can fail at runtime
const response = await fetch('/api/users')
const users = await response.json() as User[]  // Trust blindly!

// What if the API returns { error: "Not found" }?
// What if a field is missing or wrong type?
users.forEach(user => console.log(user.name))  // 💥 Runtime error!
```

### The Solution: Runtime Validation

```typescript
// ✅ Zod validates at runtime AND infers types
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>  // Type is inferred!

const response = await fetch('/api/users')
const data = await response.json()
const users = z.array(UserSchema).parse(data)  // Validated!

users.forEach(user => console.log(user.name))  // Safe!
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Runtime Safety** | Catch bad data before it causes crashes |
| **Type Inference** | No duplicate type definitions |
| **Fail Fast** | Errors at data boundary, not deep in code |
| **Clear Errors** | Descriptive validation error messages |
| **Composable** | Build complex schemas from simple ones |

---

## Installation

```bash
npm install zod
```

No additional setup needed — Zod is a zero-dependency library.

---

## Environment Variable Validation

### Setup

**File: `src/lib/env.ts`**

```typescript
import { z } from 'zod'

// Define the schema
const envSchema = z.object({
  // Vite's built-in variables
  MODE: z.enum(['development', 'production', 'test']),
  BASE_URL: z.string(),

  // Custom variables (prefixed with VITE_)
  VITE_USE_MOCKS: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')  // Convert to boolean
    .default('false'),

  VITE_API_URL: z.string().url().optional(),

  VITE_ENABLE_DEVTOOLS: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
    .default('true'),
})

// Infer the type
type Env = z.infer<typeof envSchema>

// Validate at app startup
function validateEnv(): Env {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.format())
    throw new Error('Invalid environment variables')
  }

  return result.data
}

// Export validated env object
export const env = validateEnv()
```

### Usage

```typescript
// ❌ Before: Raw access, no validation
if (import.meta.env.VITE_USE_MOCKS === 'true') { ... }

// ✅ After: Validated, typed, transformed
import { env } from '@/lib/env'

if (env.VITE_USE_MOCKS) {  // Already a boolean!
  // Enable mocking
}

if (env.MODE === 'development') {
  // Dev-only code
}
```

### Adding New Variables

1. Add to `.env` file:
```env
VITE_NEW_FEATURE=true
```

2. Add to schema in `src/lib/env.ts`:
```typescript
const envSchema = z.object({
  // ... existing
  VITE_NEW_FEATURE: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .default('false'),
})
```

3. Use in code:
```typescript
if (env.VITE_NEW_FEATURE) {
  // New feature code
}
```

### Deep Dive: Why We Created `src/lib/env.ts`

#### The Problem Without Validated Environment Variables

```typescript
// ❌ Problems with raw import.meta.env access:

// 1. No validation - typos silently fail
if (import.meta.env.VITE_USE_MOKS === 'true') {  // Typo! Always undefined
  enableMocking()  // Never runs, no error
}

// 2. String comparisons are error-prone
if (import.meta.env.VITE_USE_MOCKS === true) {  // Wrong! It's a string, not boolean
  // Never executes
}

// 3. Missing variables cause runtime crashes deep in code
const apiUrl = import.meta.env.VITE_API_URL
fetch(`${apiUrl}/users`)  // If undefined: "undefined/users" - cryptic 404

// 4. No autocomplete or type safety
import.meta.env.VITE_???  // What variables are available? No hints!
```

#### The Solution: Centralized Validation at Startup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOW env.ts WORKS                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   APPLICATION STARTUP                                                        │
│   ───────────────────                                                       │
│                                                                             │
│   1. main.tsx imports env.ts                                                │
│      │                                                                      │
│      ▼                                                                      │
│   2. env.ts runs validateEnv() immediately on import                        │
│      │                                                                      │
│      ├─── SUCCESS ──► App continues to render                              │
│      │                                                                      │
│      └─── FAILURE ──► App crashes with clear error message                 │
│                       "❌ Invalid environment variables:"                   │
│                       Shows exactly which variable is wrong                 │
│                                                                             │
│                                                                             │
│   DURING DEVELOPMENT                                                        │
│   ──────────────────                                                        │
│                                                                             │
│   Developer forgets VITE_API_URL in .env:                                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │  ❌ Invalid environment variables:                          │          │
│   │  {                                                          │          │
│   │    VITE_API_URL: { _errors: ['Required'] }                 │          │
│   │  }                                                          │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│   App fails IMMEDIATELY at startup, not later in some API call!            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Benefits for Developers

| Benefit | Without env.ts | With env.ts |
|---------|----------------|-------------|
| **Missing variable** | Silent `undefined`, crashes later | Immediate startup error with message |
| **Wrong type** | String `"true"` vs boolean `true` bugs | Auto-transformed to correct type |
| **Typos** | Silent failure | TypeScript error (property doesn't exist) |
| **Autocomplete** | None | Full IntelliSense for `env.VITE_*` |
| **Documentation** | Check .env.example manually | Schema IS the documentation |
| **Defaults** | Scattered across codebase | Centralized in schema |

#### How It Runs

```typescript
// src/lib/env.ts - This runs at import time (module initialization)

const envSchema = z.object({ ... })

function validateEnv() {
  const result = envSchema.safeParse(import.meta.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.format())
    throw new Error('Invalid environment variables')  // App stops here!
  }
  return result.data
}

// This line runs IMMEDIATELY when the module is imported
export const env = validateEnv()
```

```typescript
// src/main.tsx - First file to run

import { env } from './lib/env'  // ← Validation happens HERE, before anything renders

// If we reach this line, env is valid and typed
if (env.MODE === 'development' && env.VITE_USE_MOCKS) {
  // Safe to use - we know VITE_USE_MOCKS is a boolean
}
```

### Development vs Production Environments

#### How Vite Handles Environment Variables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VITE ENVIRONMENT VARIABLE FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DEVELOPMENT (npm run dev)                                                 │
│   ─────────────────────────                                                 │
│                                                                             │
│   .env.local ─────┐                                                         │
│   .env.development │──► Vite Dev Server ──► import.meta.env                │
│   .env ───────────┘    (reads at runtime)   (available in browser)         │
│                                                                             │
│   • Variables read from files on each request                               │
│   • MODE = 'development'                                                    │
│   • Changes to .env require dev server restart                              │
│                                                                             │
│                                                                             │
│   PRODUCTION (npm run build)                                                │
│   ──────────────────────────                                                │
│                                                                             │
│   .env.production ─┐                                                        │
│   .env ────────────┴──► Vite Build ──► Bundled JavaScript                  │
│                         (inlines at build time)                             │
│                                                                             │
│   • Variables are REPLACED in code at build time                            │
│   • MODE = 'production'                                                     │
│   • env.VITE_API_URL becomes literal string in bundle                      │
│   • Cannot change after build without rebuilding                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Environment File Hierarchy

```
project/
├── .env                    # Loaded in all environments
├── .env.local              # Loaded in all environments, gitignored
├── .env.development        # Loaded only in development
├── .env.development.local  # Loaded only in development, gitignored
├── .env.production         # Loaded only in production build
└── .env.production.local   # Loaded only in production build, gitignored
```

**Priority (highest to lowest):**
1. `.env.[mode].local` (e.g., `.env.development.local`)
2. `.env.[mode]` (e.g., `.env.development`)
3. `.env.local`
4. `.env`

#### Example: Different Values Per Environment

```env
# .env (shared defaults)
VITE_APP_NAME=Harmony

# .env.development
VITE_API_URL=http://localhost:3001
VITE_USE_MOCKS=true
VITE_ENABLE_DEVTOOLS=true

# .env.production
VITE_API_URL=https://api.harmony.example.com
VITE_USE_MOCKS=false
VITE_ENABLE_DEVTOOLS=false
```

### Production Deployment: What You Need to Know

#### No Code Changes Required

The same `env.ts` works in both development and production. The only difference is the VALUES of the environment variables, not the code.

```typescript
// This code works the same in dev and prod
if (env.MODE === 'development' && env.VITE_USE_MOCKS) {
  // Only runs in development with mocks enabled
}

// In production:
// - env.MODE is 'production'
// - env.VITE_USE_MOCKS is false
// - This block never executes
```

#### Production Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT CHECKLIST                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. CREATE .env.production FILE                                            │
│   ──────────────────────────────                                            │
│                                                                             │
│   VITE_API_URL=https://api.production.example.com                          │
│   VITE_USE_MOCKS=false                                                      │
│   VITE_ENABLE_DEVTOOLS=false                                                │
│                                                                             │
│                                                                             │
│   2. BUILD THE APPLICATION                                                  │
│   ────────────────────────                                                  │
│                                                                             │
│   $ npm run build                                                           │
│                                                                             │
│   Vite reads .env.production and inlines values into the bundle.           │
│   If any required variable is missing, the build still succeeds,           │
│   but the app will fail at runtime during validation.                       │
│                                                                             │
│                                                                             │
│   3. VERIFY THE BUILD                                                       │
│   ───────────────────                                                       │
│                                                                             │
│   $ npm run preview                                                         │
│                                                                             │
│   This runs the production build locally. If env validation fails,         │
│   you'll see the error immediately.                                         │
│                                                                             │
│                                                                             │
│   4. DEPLOY                                                                 │
│   ────────                                                                  │
│                                                                             │
│   Deploy the dist/ folder to your hosting provider.                        │
│   No additional configuration needed - values are already in the bundle.   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### CI/CD Considerations

```yaml
# Example: GitHub Actions
jobs:
  build:
    steps:
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
          VITE_USE_MOCKS: 'false'
          VITE_ENABLE_DEVTOOLS: 'false'
```

Environment variables can be:
1. Set in `.env.production` file (committed to repo, non-sensitive values)
2. Set via CI/CD environment variables (for secrets)
3. Set via hosting provider dashboard (Vercel, Netlify, etc.)

#### Important: VITE_ Prefix Required

Only variables prefixed with `VITE_` are exposed to the browser:

```env
# ✅ Exposed to browser (included in bundle)
VITE_API_URL=https://api.example.com

# ❌ NOT exposed to browser (server-side only)
DATABASE_URL=postgres://...
API_SECRET=super-secret-key
```

This is a security feature. Never put secrets in `VITE_` variables — they will be visible in the browser's JavaScript bundle.

#### Validation Timing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHEN VALIDATION RUNS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DEVELOPMENT                           PRODUCTION                          │
│   ───────────                           ──────────                          │
│                                                                             │
│   npm run dev                           npm run build                       │
│       │                                     │                               │
│       ▼                                     ▼                               │
│   Vite Dev Server starts              Vite bundles app                      │
│       │                                     │                               │
│       ▼                                     ▼                               │
│   Browser loads app                   Deploy to server                      │
│       │                                     │                               │
│       ▼                                     ▼                               │
│   main.tsx runs                       Browser loads app                     │
│       │                                     │                               │
│       ▼                                     ▼                               │
│   env.ts validates ◄─────────────────► env.ts validates                    │
│       │                                     │                               │
│       ▼                                     ▼                               │
│   App renders (or fails)              App renders (or fails)               │
│                                                                             │
│   Validation happens in the BROWSER, not during build!                     │
│   This means production users will see the error if env is invalid.        │
│   Always test with `npm run preview` before deploying.                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Route Search Params Validation

TanStack Router has built-in Zod integration for validating URL search params.

### Setup

**File: `src/routes/_authenticated/_app/trade-activity/block-level/fx-cash.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FxCashTab } from '@/pages/app/trade-activity/block-level'

// Define search params schema
const fxCashSearchSchema = z.object({
  // Pagination - defaults to 1, catches invalid values
  page: z.number().int().positive().catch(1),

  // Enum filter with default
  status: z.enum(['all', 'pending', 'confirmed', 'cancelled']).catch('all'),

  // Optional string
  search: z.string().optional(),

  // Optional sort params
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Export type for use in components
export type FxCashSearchParams = z.infer<typeof fxCashSearchSchema>

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-cash'
)({
  validateSearch: fxCashSearchSchema,  // Validation happens automatically
  component: FxCashTab,
})
```

### Using Search Params in Component

```typescript
import { useSearch, useNavigate } from '@tanstack/react-router'
import type { FxCashSearchParams } from '@/routes/.../fx-cash'

export function FxCashTab() {
  // Get validated, typed search params
  const searchParams = useSearch({
    from: '/_authenticated/_app/trade-activity/block-level/fx-cash',
  })

  // Navigate function for updating params
  const navigate = useNavigate({
    from: '/trade-activity/block-level/fx-cash',
  })

  // Update search params
  const updateSearch = (updates: Partial<FxCashSearchParams>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    })
  }

  return (
    <div>
      {/* Status filter */}
      <select
        value={searchParams.status}
        onChange={(e) => updateSearch({ status: e.target.value })}
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
      </select>

      {/* Search input */}
      <input
        type="text"
        value={searchParams.search ?? ''}
        onChange={(e) => updateSearch({ search: e.target.value || undefined })}
        placeholder="Search..."
      />

      {/* Current page */}
      <span>Page {searchParams.page}</span>
    </div>
  )
}
```

### URL Examples

```
/trade-activity/block-level/fx-cash
→ { page: 1, status: 'all', search: undefined }

/trade-activity/block-level/fx-cash?status=pending
→ { page: 1, status: 'pending', search: undefined }

/trade-activity/block-level/fx-cash?status=invalid&page=-5
→ { page: 1, status: 'all', search: undefined }  // .catch() handles invalid values

/trade-activity/block-level/fx-cash?status=confirmed&search=USD&page=2
→ { page: 2, status: 'confirmed', search: 'USD' }
```

### Key Methods for Search Params

| Method | Behavior | Use Case |
|--------|----------|----------|
| `.default(value)` | Use if missing | Always have a value |
| `.catch(value)` | Use if invalid OR missing | Graceful fallback for bad URLs |
| `.optional()` | Allow undefined | Optional filters |
| `.transform(fn)` | Convert value | Parse numbers from strings |

---

## API Response Validation

### With TanStack Query

```typescript
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// Define response schema
const FxCashTradeSchema = z.object({
  id: z.string(),
  tradeId: z.string(),
  currencyPair: z.string(),
  buyAmount: z.number(),
  sellAmount: z.number(),
  status: z.enum(['Pending', 'Completed', 'Settled', 'Cancelled']),
})

const FxCashResponseSchema = z.object({
  rowData: z.array(FxCashTradeSchema),
  rowCount: z.number(),
})

type FxCashResponse = z.infer<typeof FxCashResponseSchema>

// Use in query
function useFxCashTrades(params: RequestParams) {
  return useQuery({
    queryKey: ['fx-cash', params],
    queryFn: async (): Promise<FxCashResponse> => {
      const res = await fetch('/api/fx-cash', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      const json = await res.json()

      // Validate response - throws if invalid
      return FxCashResponseSchema.parse(json)
    },
  })
}
```

### Safe Parsing (Non-Throwing)

```typescript
const result = FxCashResponseSchema.safeParse(json)

if (result.success) {
  return result.data  // Typed as FxCashResponse
} else {
  console.error('Invalid API response:', result.error.format())
  throw new Error('Invalid API response')
}
```

---

## Form Validation

### With React Hook Form

```bash
npm install react-hook-form @hookform/resolvers
```

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().default(false),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    console.log('Valid data:', data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <label>
        <input {...register('rememberMe')} type="checkbox" />
        Remember me
      </label>

      <button type="submit">Login</button>
    </form>
  )
}
```

---

## Common Patterns

### 1. Reusable Schemas

```typescript
// src/schemas/common.ts
import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.number().int().positive().catch(1),
  pageSize: z.number().int().min(10).max(100).catch(20),
})

export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const DateRangeSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before end date' }
)
```

### 2. Extending Schemas

```typescript
const BaseTradeSchema = z.object({
  id: z.string(),
  tradeId: z.string(),
  status: z.enum(['Pending', 'Completed', 'Cancelled']),
})

const FxCashTradeSchema = BaseTradeSchema.extend({
  currencyPair: z.string(),
  buyAmount: z.number(),
  sellAmount: z.number(),
})

const FxOptionsTradeSchema = BaseTradeSchema.extend({
  optionType: z.enum(['call', 'put']),
  strikePrice: z.number(),
  expiry: z.string().date(),
})
```

### 3. Coercion for Form Data

```typescript
// HTML form values are always strings
const formSchema = z.object({
  name: z.string(),
  age: z.coerce.number(),        // "25" → 25
  active: z.coerce.boolean(),    // "true" → true
  date: z.coerce.date(),         // "2024-01-01" → Date object
})
```

### 4. Custom Error Messages

```typescript
const userSchema = z.object({
  email: z.string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  }).email('Please enter a valid email'),

  age: z.number({
    required_error: 'Age is required',
  }).min(18, 'Must be at least 18 years old'),
})
```

### 5. Discriminated Unions

```typescript
const NotificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    emailAddress: z.string().email(),
  }),
  z.object({
    type: z.literal('sms'),
    phoneNumber: z.string(),
  }),
  z.object({
    type: z.literal('push'),
    deviceToken: z.string(),
  }),
])

type Notification = z.infer<typeof NotificationSchema>
// { type: 'email', emailAddress: string } | { type: 'sms', phoneNumber: string } | ...
```

---

## Best Practices

### 1. Validate at Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION BOUNDARIES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   EXTERNAL WORLD                           YOUR APPLICATION                 │
│   ──────────────                           ────────────────                 │
│                                                                             │
│   ┌───────────────┐                        ┌───────────────┐               │
│   │ Environment   │ ──── validate ────────►│ env.ts        │               │
│   │ Variables     │                        │ (startup)     │               │
│   └───────────────┘                        └───────────────┘               │
│                                                                             │
│   ┌───────────────┐                        ┌───────────────┐               │
│   │ URL Search    │ ──── validate ────────►│ Route         │               │
│   │ Params        │      (TanStack Router) │ Components    │               │
│   └───────────────┘                        └───────────────┘               │
│                                                                             │
│   ┌───────────────┐                        ┌───────────────┐               │
│   │ API           │ ──── validate ────────►│ TanStack      │               │
│   │ Responses     │      (in queryFn)      │ Query Cache   │               │
│   └───────────────┘                        └───────────────┘               │
│                                                                             │
│   ┌───────────────┐                        ┌───────────────┐               │
│   │ Form          │ ──── validate ────────►│ Submit        │               │
│   │ Inputs        │      (on submit)       │ Handler       │               │
│   └───────────────┘                        └───────────────┘               │
│                                                                             │
│   Once data passes validation, trust it inside your application.            │
│   No need to re-validate internally.                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Use `.catch()` for Graceful Degradation

```typescript
// ❌ Throws on invalid URL params - bad UX
const schema = z.object({
  page: z.number().default(1),
})

// ✅ Falls back to default on invalid - good UX
const schema = z.object({
  page: z.number().catch(1),  // "abc" → 1, -5 → 1
})
```

### 3. Infer Types, Don't Duplicate

```typescript
// ❌ Duplicate type definition
interface User {
  id: string
  name: string
  email: string
}

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
})

// ✅ Single source of truth
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
})

type User = z.infer<typeof UserSchema>
```

### 4. Organize Schemas by Domain

```
src/
├── schemas/
│   ├── common.ts       # Pagination, sorting, date ranges
│   ├── user.ts         # User-related schemas
│   ├── trade.ts        # Trade-related schemas
│   └── index.ts        # Re-exports
├── lib/
│   └── env.ts          # Environment validation
└── routes/
    └── ... (route-specific search param schemas inline)
```

### 5. Use `.safeParse()` for Better Error Handling

```typescript
// .parse() throws - use in trusted contexts
const user = UserSchema.parse(data)

// .safeParse() returns result object - use for user-facing errors
const result = UserSchema.safeParse(data)

if (!result.success) {
  // Show validation errors to user
  const errors = result.error.flatten()
  console.log(errors.fieldErrors)
  // { email: ['Invalid email'], password: ['Too short'] }
}
```

---

## Project Files

| File | Purpose |
|------|---------|
| `src/lib/env.ts` | Environment variable validation |
| `src/routes/.../fx-cash.tsx` | Search params validation example |
| `src/pages/.../FxCashTab.tsx` | Using validated search params |

---

## Related Documentation

- [Zod Official Docs](https://zod.dev)
- [TanStack Router Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params)
- [14-tanstack-query-zustand-state-management.md](./14-tanstack-query-zustand-state-management.md) — State management overview
