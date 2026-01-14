# TanStack Router & Query Setup Guide

## TanStack Router Setup

### 1. Install Dependencies

```bash
# Vite plugin for file-based routing (required)
npm install -D @tanstack/router-plugin

# Optional: Router devtools for debugging
npm install -D @tanstack/router-devtools
```

> **Note:** The `@tanstack/router-plugin` handles the router setup for file-based routing in Vite projects. You don't need to install `@tanstack/react-router` separately - it's included as a dependency of the plugin.

### 2. Configure Vite Plugin

Update your `vite.config.ts` to include the TanStack Router plugin:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
})
```

> **Important:** The `tanstackRouter` plugin must be placed **before** the `react()` plugin in the plugins array.

### 3. Default Configuration

The plugin uses these sensible defaults automatically:
- Routes directory: `./src/routes`
- Generated tree file: `./src/routeTree.gen.ts`
- File ignore prefix: `-`
- Quote style: `single`

### 4. Create Route Files

Create a `src/routes` folder with:
- `__root.tsx` - Your root layout component
- `index.tsx` - Your home page (`/` route)

---

## TanStack Query Setup

### 1. Install Dependencies

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### 2. Set Up QueryClient Provider

In your `main.tsx`, wrap your app with `QueryClientProvider`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Wrap your app with QueryClientProvider
<QueryClientProvider client={queryClient}>
  {/* Your app/router here */}
</QueryClientProvider>
```

---

## Combined Installation (All at Once)

```bash
# All dev dependencies (router plugin includes react-router)
npm install -D @tanstack/router-plugin @tanstack/router-devtools @tanstack/react-query-devtools

# Query as a runtime dependency
npm install @tanstack/react-query
```

---

## Summary of Packages

| Package | Type | Purpose |
|---------|------|---------|
| `@tanstack/router-plugin` | devDependency | Vite plugin for file-based routing (includes react-router) |
| `@tanstack/router-devtools` | devDependency | Browser devtools for debugging routes |
| `@tanstack/react-query` | dependency | Data fetching & caching library |
| `@tanstack/react-query-devtools` | devDependency | Browser devtools for debugging queries |
