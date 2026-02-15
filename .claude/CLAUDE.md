# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Harmony App — a financial trade activity reporting application built with React 19, TypeScript, Vite, and the TanStack suite (Router + Query). Uses AG Grid Enterprise for server-side data grids and Zustand for client state.

## Commands

```bash
npm run dev              # Dev server on port 3000
npm run build            # Type-check + production build
npm run lint             # ESLint (flat config, v9)
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier format
npm run format:check     # Check formatting
npx vitest               # Run tests in watch mode
npx vitest run           # Run tests once (CI)
```

## Code Style

- No semicolons, single quotes, 2-space indent, trailing commas (es5), 100 char width (Prettier)
- Path alias: `@/*` maps to `src/*` — always use this for imports
- `erasableSyntaxOnly: true` — no enums or namespaces
- ESLint flat config with typescript-eslint, react-hooks, react-refresh, and prettier

## Architecture

### Routing (TanStack Router, file-based)

Routes live in `src/routes/` and are auto-discovered by `@tanstack/router-plugin/vite`. **`src/routeTree.gen.ts` is auto-generated — never edit it.**

Key conventions:
- `_authenticated.tsx` — pathless layout with `beforeLoad` auth guard using `redirect()`
- `_app.tsx` — nested pathless layout providing sidebar + header shell
- `_public.tsx` — pathless layout for unauthenticated pages
- Search params validated per-route with Zod via `validateSearch`
- Access search params with `useSearch({ from: '/full/route/path' })`
- Navigate with `navigate({ search: (prev) => ({ ...prev, key: value }) })`

Page components in `src/pages/` are pure display; route files in `src/routes/` handle routing concerns.

### Data Fetching (TanStack Query)

- `queryClient` in `src/lib/queryClient.ts` — global error handling, `staleTime: 60s`, smart retry (no retry on 4xx)
- `queryKeys` factory in the same file for consistent cache key management
- Domain query hooks in `src/hooks/` and `src/services/queries/`

### State Management (Zustand)

Two stores with `devtools` + `persist` middleware:
- **`authStore`** (`src/stores/authStore.ts`) — user, auth state, preferences. Token stored only in localStorage.
- **`appStore`** (`src/stores/appStore.ts`) — sidebar, theme, modals, toasts.

Both export granular selector hooks and separate action hooks (never subscribe to the entire store). Use `useSession()` (Query) for loading/error states; use store hooks for synchronous access.

### API Layer

- `src/lib/api/client.ts` — `apiFetch<T>()` with interceptor pipeline, auto Bearer token injection, `X-Request-ID` headers, 30s timeout, error classification (`ApiError`/`NetworkError`/`TimeoutError`)
- `src/api/` — domain-specific API functions
- `src/services/api/` — higher-level service abstractions

### AG Grid

`ServerSideGrid<T>` wrapper in `src/components/ui/ServerSideGrid.tsx`:
- Uses Server-Side Row Model (SSRM), POSTs `{ startRow, endRow, sortModel, filterModel }` to `fetchUrl`
- Exposes imperative handle via `forwardRef` + `useImperativeHandle` (`refreshData`, `getSelectedRows`, `exportToExcel`, etc.)
- Always use this wrapper, not raw `AgGridReact`

### Environment Variables

Validated with Zod in `src/lib/env.ts`. Always import from `@/lib/env`, not `import.meta.env`:
- `VITE_USE_MOCKS` — enables MSW mocking in dev
- `VITE_API_URL` — API base URL
- `VITE_ENABLE_DEVTOOLS` — toggle devtools

### Testing

- Vitest + Testing Library + jsdom + MSW 2.x
- Setup: `src/test/setup.ts` (jest-dom matchers, MSW server lifecycle)
- Always import `render` from `@/test/utils` (wraps with `QueryClientProvider`), not from `@testing-library/react`
- MSW handlers split by domain in `src/mocks/handlers/`, combined in `src/mocks/handlers.ts`
- Coverage threshold: 80% on all metrics

### Layout System

- `PageLayout` — outer wrapper with fixed `PageTitle` (78px) + flex content area
- `TabLayout` — tab navigation using TanStack Router `<Link>` components + white card content
- CSS Modules for component-scoped styles, global styles in `src/styles/`

## Documentation

Detailed architecture guides are in `docs/harmony/` (numbered 01–21+), with additional docs in `docs/filters/`, `docs/routes/`, and `docs/architecture/`. Code comments reference these docs.
