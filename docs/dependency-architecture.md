# TanStack Dependency Architecture

## How the Router Plugin Works

The `@tanstack/router-plugin` is a **build-time tool** that:

1. Generates route files (`routeTree.gen.ts`)
2. Handles automatic code splitting
3. Watches for file changes in development

It does **NOT** bundle the router into your app directly.

## How `@tanstack/react-router` Ends Up in Your Build

```
@tanstack/router-plugin (devDependency)
    └── @tanstack/react-router (peer dependency → installed in node_modules)
            └── Your source code imports from it
                    └── Vite bundles it into production build
```

### The Flow:

1. **npm install** - When you install `@tanstack/router-plugin`, npm also installs its peer dependency `@tanstack/react-router` into your `node_modules`

2. **Your code imports** - Your application code imports directly from the router:
   ```typescript
   import { createRouter, RouterProvider } from '@tanstack/react-router'
   ```

3. **Vite bundles** - Vite sees these imports and includes `@tanstack/react-router` in your production bundle

### Why the Plugin is a devDependency

The plugin's code (route generation, file watching) only runs during:
- Development (`npm run dev`)
- Build time (`npm run build`)

It's never executed in the browser, so it doesn't need to be a runtime dependency.

## Devtools Packages

The devtools packages are **optional** and provide browser-based debugging UI:

- `@tanstack/router-devtools` - Visualize routes, params, and navigation
- `@tanstack/react-query-devtools` - Inspect queries, cache, and mutations

### Conditional Rendering

Devtools are typically rendered only in development:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

function App() {
  return (
    <>
      {/* Your app */}
      {import.meta.env.DEV && <ReactQueryDevtools />}
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  )
}
```

This ensures devtools code is tree-shaken out of production builds.

## Summary

| Package | When it runs | Included in prod bundle? |
|---------|--------------|--------------------------|
| `@tanstack/router-plugin` | Build time only | No |
| `@tanstack/react-router` | Runtime | Yes |
| `@tanstack/router-devtools` | Runtime (dev only) | No (if conditionally rendered) |
| `@tanstack/react-query` | Runtime | Yes |
| `@tanstack/react-query-devtools` | Runtime (dev only) | No (if conditionally rendered) |
