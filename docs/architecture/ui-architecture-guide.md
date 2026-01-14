# Enterprise UI Architecture Guide

A comprehensive guide for UI architects starting a new enterprise-level frontend project.

---

## Table of Contents

1. [Discovery Phase](#1-discovery-phase)
2. [Technical Decision Framework](#2-technical-decision-framework)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Project Structure](#4-project-structure)
5. [State Management Strategy](#5-state-management-strategy)
6. [API Layer Design](#6-api-layer-design)
7. [Performance Strategy](#7-performance-strategy)
8. [Testing Strategy](#8-testing-strategy)
9. [Security Considerations](#9-security-considerations)
10. [Developer Experience](#10-developer-experience)
11. [Scalability Planning](#11-scalability-planning)
12. [Documentation Standards](#12-documentation-standards)

---

## 1. Discovery Phase

Before writing any code, gather critical information.

### 1.1 Business Requirements

| Question | Why It Matters |
|----------|----------------|
| What problem does this application solve? | Defines core features |
| Who are the end users? | Influences UX decisions |
| What are the success metrics? | Guides performance targets |
| What's the expected lifespan? | Affects technology choices |
| What's the budget and timeline? | Constrains architectural options |

### 1.2 Technical Requirements

```
Checklist:
□ Expected number of concurrent users
□ Geographic distribution of users
□ Offline capability requirements
□ Real-time data requirements
□ Integration with existing systems
□ Compliance requirements (GDPR, HIPAA, SOC2)
□ Accessibility requirements (WCAG level)
□ Browser/device support matrix
□ Performance SLAs (load time, TTI)
```

### 1.3 Team Assessment

| Factor | Impact on Architecture |
|--------|------------------------|
| Team size | Monorepo vs multi-repo, module boundaries |
| Skill levels | Technology complexity, learning curve |
| Geographic distribution | Documentation needs, async communication |
| Existing expertise | Framework selection, training budget |

### 1.4 Stakeholder Mapping

```
Identify:
├── Product Owner → Feature priorities
├── Backend Team → API contracts, capabilities
├── DevOps Team → Deployment constraints, CI/CD
├── Security Team → Compliance, auth requirements
├── UX/Design Team → Design system, accessibility
└── QA Team → Testing strategy, environments
```

---

## 2. Technical Decision Framework

### 2.1 Framework Selection

**Evaluation Criteria:**

| Criteria | Weight | Questions to Ask |
|----------|--------|------------------|
| Performance | High | Bundle size? SSR/SSG support? |
| Ecosystem | High | Library availability? Community size? |
| Team expertise | High | Learning curve? Hiring pool? |
| Long-term viability | Medium | Corporate backing? Release cadence? |
| Enterprise features | Medium | TypeScript support? Testing tools? |

**Framework Comparison (2025):**

```
React
├── Pros: Largest ecosystem, flexible, excellent TypeScript
├── Cons: Decision fatigue, no built-in solutions
└── Best for: Complex apps, teams needing flexibility

Next.js
├── Pros: Full-stack, SSR/SSG, great DX
├── Cons: Vercel-centric, can be opinionated
└── Best for: SEO-critical apps, full-stack teams

Vue
├── Pros: Gentle learning curve, good docs
├── Cons: Smaller ecosystem than React
└── Best for: Teams with varying skill levels

Angular
├── Pros: Batteries included, enterprise-ready
├── Cons: Steep learning curve, verbose
└── Best for: Large teams, enterprise environments
```

### 2.2 Build Tool Selection

| Tool | Best For |
|------|----------|
| Vite | Fast development, modern browsers |
| Webpack | Complex builds, legacy browser support |
| Turbopack | Next.js projects, large monorepos |
| esbuild | Simple builds, maximum speed |

### 2.3 Decision Documentation

Create an Architecture Decision Record (ADR) for each major decision:

```markdown
# ADR-001: Frontend Framework Selection

## Status
Accepted

## Context
We need to select a frontend framework for the new customer portal.

## Decision
We will use React with Vite.

## Consequences
- Positive: Large talent pool, extensive ecosystem
- Negative: Need to make additional architectural decisions
- Risks: Decision fatigue for junior developers

## Alternatives Considered
- Angular: Rejected due to learning curve
- Vue: Rejected due to smaller ecosystem
```

---

## 3. Architecture Patterns

### 3.1 Component Architecture

**Atomic Design Pattern:**

```
atoms/          → Basic building blocks (Button, Input, Icon)
molecules/      → Simple combinations (SearchBar, FormField)
organisms/      → Complex UI sections (Header, ProductCard)
templates/      → Page layouts (DashboardLayout, AuthLayout)
pages/          → Actual pages (HomePage, SettingsPage)
```

**Feature-Based Architecture:**

```
features/
├── auth/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   └── types/
├── dashboard/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
└── settings/
    └── ...
```

### 3.2 Choosing the Right Pattern

| Pattern | When to Use |
|---------|-------------|
| Atomic Design | Design system teams, component libraries |
| Feature-Based | Large apps with distinct feature domains |
| Layer-Based | Traditional enterprise, clear separation |
| Hybrid | Most enterprise apps (combine approaches) |

### 3.3 Module Boundaries

**Define clear boundaries:**

```
Rules for Module Independence:
1. Each module owns its own state
2. Modules communicate via well-defined interfaces
3. No direct imports between feature modules
4. Shared code goes in common/shared modules
5. Dependencies flow inward (features → shared → core)
```

**Dependency Graph:**

```
                    ┌─────────────┐
                    │   Features  │
                    └──────┬──────┘
                           │ depends on
                    ┌──────▼──────┐
                    │   Shared    │
                    └──────┬──────┘
                           │ depends on
                    ┌──────▼──────┐
                    │    Core     │
                    └─────────────┘
```

---

## 4. Project Structure

### 4.1 Recommended Structure for Enterprise

```
src/
├── app/                    # Application bootstrap
│   ├── providers/          # Context providers
│   ├── routes/             # Route definitions
│   └── App.tsx
│
├── core/                   # Core utilities (no UI)
│   ├── api/                # API client setup
│   ├── auth/               # Auth logic
│   ├── config/             # App configuration
│   ├── constants/          # App constants
│   ├── hooks/              # Generic hooks
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Utility functions
│
├── shared/                 # Shared UI components
│   ├── components/         # Reusable components
│   │   ├── ui/             # Basic UI (Button, Input)
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout components
│   │   └── feedback/       # Modals, toasts, alerts
│   ├── hooks/              # UI-related hooks
│   └── styles/             # Global styles, themes
│
├── features/               # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── index.ts        # Public API
│   ├── dashboard/
│   ├── users/
│   └── settings/
│
├── pages/                  # Page components
│   ├── auth/
│   ├── dashboard/
│   └── settings/
│
├── routes/                 # TanStack Router routes
│   ├── __root.tsx
│   ├── index.tsx
│   └── _authenticated/
│
└── assets/                 # Static assets
    ├── images/
    ├── fonts/
    └── icons/
```

### 4.2 Key Principles

```
1. Colocation
   Keep related files together. Tests next to code.

2. Public API Pattern
   Each feature exports only what's needed via index.ts

3. Barrel Files
   Use index.ts to control module public interface

4. Path Aliases
   Configure @/ aliases for clean imports

5. Consistent Naming
   Use conventions: PascalCase components, camelCase utils
```

### 4.3 Path Aliases Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"],
      "@pages/*": ["src/pages/*"]
    }
  }
}
```

```typescript
// vite.config.ts
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
    },
  },
})
```

---

## 5. State Management Strategy

### 5.1 State Categories

| Category | Examples | Solution |
|----------|----------|----------|
| Server State | API data, cached responses | TanStack Query, SWR |
| Client State | UI state, form state | React state, Zustand |
| URL State | Filters, pagination, tabs | Router (TanStack Router) |
| Form State | Input values, validation | React Hook Form, Formik |
| Global State | User session, theme | Context, Zustand, Jotai |

### 5.2 State Decision Tree

```
Is it server data?
├── Yes → Use TanStack Query
└── No
    ├── Is it URL-representable?
    │   ├── Yes → Use Router state (search params)
    │   └── No
    │       ├── Is it form data?
    │       │   ├── Yes → Use React Hook Form
    │       │   └── No
    │       │       ├── Is it needed across multiple components?
    │       │       │   ├── Yes → Use Zustand/Context
    │       │       │   └── No → Use local useState
```

### 5.3 Server State with TanStack Query

```typescript
// features/users/services/userQueries.ts
import { queryOptions } from '@tanstack/react-query'
import { fetchUsers, fetchUserById } from './userApi'

export const userQueries = {
  all: () => queryOptions({
    queryKey: ['users'],
    queryFn: fetchUsers,
  }),

  detail: (userId: string) => queryOptions({
    queryKey: ['users', userId],
    queryFn: () => fetchUserById(userId),
  }),
}

// Usage in component
const { data: users } = useQuery(userQueries.all())
```

### 5.4 Client State with Zustand

```typescript
// core/store/uiStore.ts
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}))
```

---

## 6. API Layer Design

### 6.1 API Client Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Components                        │
└─────────────────────┬───────────────────────────────┘
                      │ uses
┌─────────────────────▼───────────────────────────────┐
│              TanStack Query Hooks                    │
│         (useQuery, useMutation)                      │
└─────────────────────┬───────────────────────────────┘
                      │ calls
┌─────────────────────▼───────────────────────────────┐
│              Service Functions                       │
│      (fetchUsers, createUser, updateUser)           │
└─────────────────────┬───────────────────────────────┘
                      │ uses
┌─────────────────────▼───────────────────────────────┐
│              API Client (Axios/Fetch)               │
│     (interceptors, auth, error handling)            │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                   Backend API                        │
└─────────────────────────────────────────────────────┘
```

### 6.2 API Client Setup

```typescript
// core/api/client.ts
import axios from 'axios'
import { getAccessToken, refreshToken } from '@core/auth'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      try {
        await refreshToken()
        return apiClient.request(error.config)
      } catch {
        // Redirect to login
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

### 6.3 Service Layer Pattern

```typescript
// features/users/services/userApi.ts
import { apiClient } from '@core/api/client'
import type { User, CreateUserDTO, UpdateUserDTO } from '../types'

const USERS_ENDPOINT = '/api/users'

export const userApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get(USERS_ENDPOINT)
    return data
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get(`${USERS_ENDPOINT}/${id}`)
    return data
  },

  create: async (dto: CreateUserDTO): Promise<User> => {
    const { data } = await apiClient.post(USERS_ENDPOINT, dto)
    return data
  },

  update: async (id: string, dto: UpdateUserDTO): Promise<User> => {
    const { data } = await apiClient.patch(`${USERS_ENDPOINT}/${id}`, dto)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${USERS_ENDPOINT}/${id}`)
  },
}
```

---

## 7. Performance Strategy

### 7.1 Performance Budget

Define targets before starting:

| Metric | Target | Tool to Measure |
|--------|--------|-----------------|
| First Contentful Paint (FCP) | < 1.8s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.8s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Bundle Size (initial) | < 200KB | Bundlephobia |
| Bundle Size (total) | < 500KB | Webpack Analyzer |

### 7.2 Code Splitting Strategy

```typescript
// Route-based splitting (automatic with TanStack Router)
// autoCodeSplitting: true in vite.config.ts

// Component-based splitting
import { lazy, Suspense } from 'react'

const HeavyChart = lazy(() => import('./HeavyChart'))

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart />
    </Suspense>
  )
}
```

### 7.3 Performance Checklist

```
Build Time:
□ Enable code splitting
□ Tree shake unused code
□ Minify JavaScript and CSS
□ Compress assets (gzip/brotli)
□ Optimize images (WebP, AVIF)
□ Generate critical CSS

Runtime:
□ Virtualize long lists (TanStack Virtual)
□ Debounce/throttle expensive operations
□ Memoize expensive computations
□ Use web workers for heavy processing
□ Implement proper caching headers

React Specific:
□ Use React.memo for expensive components
□ Use useMemo/useCallback appropriately
□ Avoid inline object/function props
□ Use keys properly in lists
```

### 7.4 Monitoring

```typescript
// Setup performance monitoring
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric)
}

onCLS(sendToAnalytics)
onFCP(sendToAnalytics)
onLCP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

---

## 8. Testing Strategy

### 8.1 Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  Few, slow, high confidence
                    │  Tests  │
                   ─┴─────────┴─
                 ┌───────────────┐
                 │  Integration  │  Some, medium speed
                 │    Tests      │
                ─┴───────────────┴─
              ┌───────────────────────┐
              │      Unit Tests       │  Many, fast, focused
              └───────────────────────┘
```

### 8.2 What to Test at Each Level

| Level | What to Test | Tools |
|-------|--------------|-------|
| Unit | Utils, hooks, pure functions | Vitest, Jest |
| Integration | Component interactions, API calls | Testing Library, MSW |
| E2E | Critical user journeys | Playwright, Cypress |

### 8.3 Testing Standards

```typescript
// Unit Test Example
// utils/formatCurrency.test.ts
import { formatCurrency } from './formatCurrency'

describe('formatCurrency', () => {
  it('formats positive numbers with currency symbol', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-$100.00')
  })
})
```

```typescript
// Integration Test Example
// features/auth/components/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits credentials and redirects on success', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })
})
```

### 8.4 Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| Utils/Helpers | 90%+ | Pure functions, easy to test |
| Hooks | 80%+ | Critical logic |
| Components | 70%+ | UI variations |
| Integration | Critical paths | User journeys |
| E2E | Smoke tests | Deployment validation |

---

## 9. Security Considerations

### 9.1 Security Checklist

```
Authentication & Authorization:
□ Secure token storage (httpOnly cookies preferred)
□ Token refresh mechanism
□ Route guards for protected pages
□ Role-based access control (RBAC)
□ Session timeout handling

Data Protection:
□ Input sanitization
□ XSS prevention (React handles most)
□ CSRF protection
□ Sensitive data encryption
□ No secrets in frontend code

API Security:
□ HTTPS only
□ CORS configuration
□ Rate limiting awareness
□ Error message sanitization (no stack traces)

Dependencies:
□ Regular security audits (npm audit)
□ Dependabot/Renovate for updates
□ Lock file committed
□ No vulnerable dependencies
```

### 9.2 Environment Variables

```typescript
// NEVER expose secrets to the frontend
// .env
VITE_API_URL=https://api.example.com    // ✓ OK - public
VITE_ANALYTICS_ID=UA-12345              // ✓ OK - public
DATABASE_PASSWORD=secret                 // ✗ NEVER - backend only
API_SECRET_KEY=secret                    // ✗ NEVER - backend only
```

### 9.3 Auth Token Storage

| Method | Security | Recommendation |
|--------|----------|----------------|
| localStorage | XSS vulnerable | Avoid for auth tokens |
| sessionStorage | XSS vulnerable | Avoid for auth tokens |
| httpOnly Cookie | XSS protected | Preferred for tokens |
| Memory | Most secure | Use with refresh token |

---

## 10. Developer Experience

### 10.1 Tooling Setup

```
Essential Tools:
├── TypeScript          → Type safety
├── ESLint              → Code quality
├── Prettier            → Code formatting
├── Husky               → Git hooks
├── lint-staged         → Pre-commit checks
├── commitlint          → Commit message standards
└── VS Code extensions  → Team consistency
```

### 10.2 Git Hooks Configuration

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

```bash
# .husky/commit-msg
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

### 10.3 Commit Message Convention

```
Format: <type>(<scope>): <subject>

Types:
feat     → New feature
fix      → Bug fix
docs     → Documentation
style    → Formatting (no code change)
refactor → Code restructuring
test     → Adding tests
chore    → Maintenance tasks

Examples:
feat(auth): add login with Google
fix(dashboard): resolve chart rendering issue
docs(readme): update installation steps
```

### 10.4 VS Code Workspace Settings

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "usernamehw.errorlens"
  ]
}
```

---

## 11. Scalability Planning

### 11.1 Monorepo Considerations

**When to use Monorepo:**

| Scenario | Recommendation |
|----------|----------------|
| Single app, single team | Single repo |
| Multiple apps, shared code | Monorepo (Nx, Turborepo) |
| Micro-frontends | Monorepo or Module Federation |
| Independent deployment | Multi-repo |

### 11.2 Micro-Frontend Considerations

```
When to consider:
□ Multiple teams working independently
□ Different release cycles needed
□ Legacy migration scenarios
□ Very large applications

When to avoid:
□ Small to medium applications
□ Single team
□ Need for tight integration
□ Limited DevOps capability
```

### 11.3 Growth Planning

```
Team Growth:
├── 1-3 developers  → Simple structure, minimal tooling
├── 4-8 developers  → Feature modules, code ownership
├── 8-15 developers → Monorepo, strict boundaries
└── 15+ developers  → Consider micro-frontends

Codebase Growth:
├── < 50k LOC  → Single bundle, simple splitting
├── 50-200k LOC → Feature-based splitting, lazy loading
└── > 200k LOC  → Consider app splitting
```

---

## 12. Documentation Standards

### 12.1 Required Documentation

```
Project Documentation:
├── README.md              → Project overview, quick start
├── CONTRIBUTING.md        → How to contribute
├── ARCHITECTURE.md        → System design overview
├── SETUP_INSTRUCTIONS.md  → Detailed setup guide
└── docs/
    ├── adr/               → Architecture Decision Records
    ├── api/               → API documentation
    ├── components/        → Component documentation
    └── guides/            → How-to guides
```

### 12.2 Code Documentation

```typescript
/**
 * Formats a number as currency.
 *
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // '$1,234.56'
 * formatCurrency(1234.56, 'EUR', 'de-DE') // '1.234,56 €'
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}
```

### 12.3 Component Documentation

```typescript
/**
 * Button component for user interactions.
 *
 * @component
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * @example
 * // Loading state
 * <Button loading disabled>
 *   Submitting...
 * </Button>
 */
interface ButtonProps {
  /** The visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** The size of the button */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the button is in a loading state */
  loading?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
  /** Button contents */
  children: React.ReactNode
}
```

---

## Summary Checklist

### Before Starting Development

```
□ Business requirements documented
□ Technical requirements defined
□ Team assessment completed
□ Framework selection made (with ADR)
□ Project structure defined
□ State management strategy decided
□ API contracts agreed with backend
□ Performance budgets set
□ Testing strategy defined
□ Security requirements identified
□ CI/CD pipeline planned
□ Documentation standards established
```

### Architecture Principles

```
1. Separation of Concerns
   Keep UI, business logic, and data access separate

2. Single Responsibility
   Each module/component does one thing well

3. DRY (Don't Repeat Yourself)
   Abstract common patterns, but not prematurely

4. YAGNI (You Aren't Gonna Need It)
   Don't over-engineer for hypothetical futures

5. Explicit Over Implicit
   Code should be self-documenting

6. Fail Fast
   Catch errors early with TypeScript and validation

7. Progressive Enhancement
   Core functionality works, enhancements layer on top
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│              Enterprise UI Architecture                  │
├─────────────────────────────────────────────────────────┤
│ State Management:                                        │
│   Server State  → TanStack Query                        │
│   Client State  → Zustand / Context                     │
│   URL State     → TanStack Router                       │
│   Form State    → React Hook Form                       │
├─────────────────────────────────────────────────────────┤
│ Project Structure:                                       │
│   /core         → Non-UI utilities                      │
│   /shared       → Shared UI components                  │
│   /features     → Feature modules                       │
│   /pages        → Page components                       │
│   /routes       → Route definitions                     │
├─────────────────────────────────────────────────────────┤
│ Testing:                                                 │
│   Unit          → Vitest (utils, hooks)                 │
│   Integration   → Testing Library (components)          │
│   E2E           → Playwright (user journeys)            │
├─────────────────────────────────────────────────────────┤
│ Performance Targets:                                     │
│   FCP < 1.8s    LCP < 2.5s    TTI < 3.8s              │
│   Initial Bundle < 200KB                                │
└─────────────────────────────────────────────────────────┘
```
