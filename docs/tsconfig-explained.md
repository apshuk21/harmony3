# TypeScript Configuration in Vite Projects

## Why Multiple tsconfig Files?

This project has **three** tsconfig files that work together using TypeScript's **Project References** feature. This separation exists because your project has code that runs in **two different environments**:

1. **Browser** - Your React application (`src/` folder)
2. **Node.js** - Your build tooling (`vite.config.ts`)

Each environment has different APIs, globals, and capabilities.

## The Three Files

```
tsconfig.json (root)
    ├── tsconfig.app.json  → Browser code (src/)
    └── tsconfig.node.json → Node.js code (vite.config.ts)
```

---

## tsconfig.json (Root/Orchestrator)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Purpose:** This file doesn't compile anything itself (`"files": []`). It simply connects the other two configs using **project references**.

**Why it exists:**
- Allows `tsc -b` (build mode) to compile both projects in the correct order
- IDEs use it to understand the full project structure
- Enables incremental builds across the entire codebase

---

## tsconfig.app.json (Browser Code)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx",
    // ... other options
  },
  "include": ["src"]
}
```

**Purpose:** Configures TypeScript for your **React application code**.

**Key settings explained:**

| Option | Value | Why |
|--------|-------|-----|
| `target` | `ES2022` | Modern JS features, Vite handles browser compatibility |
| `lib` | `DOM`, `DOM.Iterable` | Enables browser APIs (`document`, `window`, `fetch`) |
| `types` | `vite/client` | Provides types for Vite-specific features (`import.meta.env`) |
| `jsx` | `react-jsx` | Enables JSX transform without importing React |
| `include` | `["src"]` | Only type-check files in the `src/` folder |
| `noEmit` | `true` | TypeScript only type-checks; Vite handles compilation |

**What this file gives you access to:**
- `document`, `window`, `localStorage`
- `import.meta.env.DEV`, `import.meta.env.PROD`
- JSX syntax
- DOM types (`HTMLElement`, `Event`, etc.)

---

## tsconfig.node.json (Build Tooling)

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "types": ["node"],
    // ... other options
  },
  "include": ["vite.config.ts"]
}
```

**Purpose:** Configures TypeScript for your **Vite configuration file**.

**Key settings explained:**

| Option | Value | Why |
|--------|-------|-----|
| `target` | `ES2023` | Node.js supports latest JS features |
| `lib` | `ES2023` | No DOM - this runs in Node.js |
| `types` | `node` | Provides Node.js types (`process`, `__dirname`, etc.) |
| `include` | `["vite.config.ts"]` | Only type-check the Vite config |

**What this file gives you access to:**
- `process.env`
- `__dirname`, `__filename`
- Node.js built-in modules (`path`, `fs`, etc.)

**What this file does NOT have:**
- `document`, `window` (these don't exist in Node.js)
- `import.meta.env` (Vite-specific, browser-only)

---

## Why Not Just One tsconfig?

If you used a single config:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  root: process.cwd(),        // ✅ Node.js API
  plugins: [react()]
})
```

```typescript
// src/App.tsx
function App() {
  return <div>{document.title}</div>  // ✅ Browser API
}
```

**Problem:** TypeScript can't provide correct types for both. With one config you'd either:
- Have `document` available in `vite.config.ts` (wrong - it doesn't exist there)
- Have `process` unavailable in `vite.config.ts` (wrong - it does exist there)

**Solution:** Separate configs with different `lib` and `types` for each environment.

---

## How the Build Works

When you run `npm run build`:

```bash
tsc -b && vite build
```

1. **`tsc -b`** - TypeScript reads `tsconfig.json`, sees the references, and type-checks both:
   - `tsconfig.app.json` → checks `src/`
   - `tsconfig.node.json` → checks `vite.config.ts`

2. **`vite build`** - Vite compiles and bundles your app (TypeScript already verified types)

---

## Summary

| File | Environment | Checks | Key Types |
|------|-------------|--------|-----------|
| `tsconfig.json` | - | Nothing (orchestrator) | - |
| `tsconfig.app.json` | Browser | `src/**/*` | DOM, Vite client |
| `tsconfig.node.json` | Node.js | `vite.config.ts` | Node.js APIs |
