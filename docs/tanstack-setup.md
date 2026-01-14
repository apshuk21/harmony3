# TanStack Router & Query Setup Guide

## TanStack Router Setup

### 1. Install Dependencies

```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-plugin @tanstack/router-devtools
```

### 2. Configure Vite Plugin

Update your `vite.config.ts` to include the TanStack Router plugin:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),  // Add this before react()
    react(),
  ],
})
```

### 3. Create Route Files

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
# Dependencies
npm install @tanstack/react-router @tanstack/react-query

# Dev dependencies
npm install -D @tanstack/router-plugin @tanstack/router-devtools @tanstack/react-query-devtools
```

---

## Summary of Packages

| Package | Purpose |
|---------|---------|
| `@tanstack/react-router` | Core routing library |
| `@tanstack/router-plugin` | Vite plugin for file-based routing & code generation |
| `@tanstack/router-devtools` | Browser devtools for debugging routes |
| `@tanstack/react-query` | Data fetching & caching library |
| `@tanstack/react-query-devtools` | Browser devtools for debugging queries |
