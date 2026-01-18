# Understanding Multiple tsconfig Files in This Project

## Why Do We Need 3 tsconfig Files?

Modern TypeScript projects often use multiple `tsconfig` files to handle different **execution environments** within the same project. Each environment has different requirements, available APIs, and type definitions.

In this project, we have three distinct environments:

| File | Environment | Purpose |
|------|-------------|---------|
| `tsconfig.json` | Root | Orchestrates the other configs |
| `tsconfig.app.json` | Browser | React application code (`src/`) |
| `tsconfig.node.json` | Node.js | Build tools (`vite.config.ts`) |

---

## 1. `tsconfig.json` (Root/Orchestrator)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Purpose:** This is the root configuration that uses **TypeScript Project References** to combine multiple configs.

**Key points:**
- `"files": []` - This file doesn't compile anything directly
- `"references"` - Points to the actual configs that do the work
- Acts as an entry point for IDEs and build tools
- Enables incremental builds across sub-projects

**Why this pattern?**
- IDEs (like VSCode) need a single entry point to understand the project
- Running `tsc --build` will compile all referenced projects in the correct order
- Each sub-project can have its own isolated settings

---

## 2. `tsconfig.app.json` (Browser Environment)

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

**Purpose:** Configures TypeScript for the React application code that runs in the **browser**.

**Key settings explained:**

| Setting | Why It's Needed |
|---------|-----------------|
| `lib: ["DOM", "DOM.Iterable"]` | Provides browser APIs (`document`, `window`, `fetch`, etc.) |
| `types: ["vite/client"]` | Recognizes Vite-specific features (`import.meta.env`, asset imports) |
| `jsx: "react-jsx"` | Enables JSX/TSX syntax for React components |
| `include: ["src"]` | Only processes files in the `src/` directory |

**What this enables:**
```typescript
// These work because of DOM lib
document.getElementById('root')
window.localStorage.getItem('key')

// This works because of vite/client types
const imageUrl = new URL('./image.png', import.meta.url)
console.log(import.meta.env.VITE_API_URL)
```

---

## 3. `tsconfig.node.json` (Node.js Environment)

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

**Purpose:** Configures TypeScript for build configuration files that run in **Node.js**.

**Key settings explained:**

| Setting | Why It's Needed |
|---------|-----------------|
| `lib: ["ES2023"]` | No DOM APIs - Node.js doesn't have `document` or `window` |
| `types: ["node"]` | Provides Node.js APIs (`process`, `__dirname`, `path`, etc.) |
| `include: ["vite.config.ts"]` | Only processes build configuration files |

**What this enables:**
```typescript
// These work in vite.config.ts because of node types
import path from 'path'
path.resolve(__dirname, './src')
process.env.NODE_ENV
```

**What this prevents:**
```typescript
// This would ERROR in vite.config.ts (no DOM in Node.js)
document.getElementById('root') // ❌ Cannot find name 'document'
```

---

## Visual Representation

```
┌─────────────────────────────────────────────────────────────┐
│                     tsconfig.json                           │
│                    (Orchestrator)                           │
│                                                             │
│   references: [tsconfig.app.json, tsconfig.node.json]       │
└─────────────────────────────────────────────────────────────┘
                    │                     │
                    ▼                     ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│    tsconfig.app.json        │  │   tsconfig.node.json        │
│    (Browser Environment)    │  │   (Node.js Environment)     │
│                             │  │                             │
│  ✅ DOM APIs (document)     │  │  ❌ No DOM APIs             │
│  ✅ Browser globals         │  │  ✅ Node.js APIs (path)     │
│  ✅ Vite client types       │  │  ✅ Node types              │
│  ✅ React JSX               │  │  ❌ No JSX needed           │
│                             │  │                             │
│  📁 Includes: src/          │  │  📁 Includes: vite.config.ts│
└─────────────────────────────┘  └─────────────────────────────┘
```

---

## When Are These Configs Used? (Workflow Explained)

Understanding **when** each config is used helps clarify why we need separate files. Let's walk through the three main workflows:

### 1. Development Server (`npm run dev`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           npm run dev                                       │
│                               │                                             │
│                               ▼                                             │
│                     ┌─────────────────┐                                     │
│                     │   Node.js       │                                     │
│                     │   Process       │                                     │
│                     └────────┬────────┘                                     │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼                               ▼                              │
│   ┌─────────────────────┐         ┌─────────────────────┐                   │
│   │  vite.config.ts     │         │  src/**/*.tsx       │                   │
│   │  (tsconfig.node)    │         │  (tsconfig.app)     │                   │
│   │                     │         │                     │                   │
│   │  Runs IN Node.js    │         │  Transpiled FOR     │                   │
│   │  Uses: path, fs     │         │  the browser        │                   │
│   │  No DOM access      │         │  Uses: DOM, React   │                   │
│   └─────────────────────┘         └──────────┬──────────┘                   │
│                                              │                              │
│                                              ▼                              │
│                                   ┌─────────────────────┐                   │
│                                   │     Browser         │                   │
│                                   │   (localhost:3000)  │                   │
│                                   │                     │                   │
│                                   │  Executes the       │                   │
│                                   │  transpiled code    │                   │
│                                   └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What happens step by step:**

| Step | What Runs | Where | tsconfig Used |
|------|-----------|-------|---------------|
| 1 | Vite CLI starts | Node.js | - |
| 2 | `vite.config.ts` is loaded & executed | Node.js | `tsconfig.node.json` |
| 3 | Vite reads plugins, aliases, port config | Node.js | `tsconfig.node.json` |
| 4 | Dev server starts on port 3000 | Node.js | - |
| 5 | Browser requests `localhost:3000` | Browser | - |
| 6 | Vite transpiles `src/**/*.tsx` on-the-fly | Node.js (transpiler) | `tsconfig.app.json` |
| 7 | Transpiled JS is sent to browser | Browser | - |
| 8 | React app runs in browser | Browser | - |

**Key insight:** `vite.config.ts` **runs in Node.js** (it needs `path.resolve`, `__dirname`), but your React code **runs in the browser** (it needs `document`, `window`).

---

### 2. Production Build (`npm run build`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           npm run build                                     │
│                               │                                             │
│                               ▼                                             │
│                     ┌─────────────────┐                                     │
│                     │   Node.js       │                                     │
│                     │   Process       │                                     │
│                     └────────┬────────┘                                     │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼                               ▼                              │
│   ┌─────────────────────┐         ┌─────────────────────┐                   │
│   │  vite.config.ts     │         │  src/**/*.tsx       │                   │
│   │  (tsconfig.node)    │         │  (tsconfig.app)     │                   │
│   │                     │         │                     │                   │
│   │  Configures the     │         │  Type-checked &     │                   │
│   │  build process      │         │  transpiled         │                   │
│   └─────────────────────┘         └──────────┬──────────┘                   │
│                                              │                              │
│                                              ▼                              │
│                                   ┌─────────────────────┐                   │
│                                   │     dist/           │                   │
│                                   │                     │                   │
│                                   │  index.html         │                   │
│                                   │  assets/*.js        │                   │
│                                   │  assets/*.css       │                   │
│                                   └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What happens step by step:**

| Step | What Runs | Where | tsconfig Used |
|------|-----------|-------|---------------|
| 1 | Vite CLI starts in build mode | Node.js | - |
| 2 | `vite.config.ts` is loaded | Node.js | `tsconfig.node.json` |
| 3 | Vite/Rollup bundles `src/**/*.tsx` | Node.js (bundler) | `tsconfig.app.json` |
| 4 | TypeScript is transpiled to JavaScript | Node.js | `tsconfig.app.json` |
| 5 | Code is minified, tree-shaken, optimized | Node.js | - |
| 6 | Output written to `dist/` folder | Node.js | - |

**Key insight:** The entire build process runs in Node.js, but the **output** is optimized for browsers. The tsconfig files ensure proper type-checking during this process.

---

### 3. Running Tests (`npm run test`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           npm run test                                      │
│                               │                                             │
│                               ▼                                             │
│                     ┌─────────────────┐                                     │
│                     │   Node.js       │                                     │
│                     │   Process       │                                     │
│                     └────────┬────────┘                                     │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼                               ▼                              │
│   ┌─────────────────────┐         ┌─────────────────────┐                   │
│   │  vite.config.ts     │         │  src/**/*.test.tsx  │                   │
│   │  (tsconfig.node)    │         │  (tsconfig.app)     │                   │
│   │                     │         │                     │                   │
│   │  Contains test:     │         │  Test files +       │                   │
│   │  configuration      │         │  Source files       │                   │
│   └─────────────────────┘         └──────────┬──────────┘                   │
│                                              │                              │
│                                              ▼                              │
│                                   ┌─────────────────────┐                   │
│                                   │   jsdom             │                   │
│                                   │   (Simulated DOM)   │                   │
│                                   │                     │                   │
│                                   │  Tests run here     │                   │
│                                   │  with fake browser  │                   │
│                                   │  APIs               │                   │
│                                   └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What happens step by step:**

| Step | What Runs | Where | tsconfig Used |
|------|-----------|-------|---------------|
| 1 | Vitest CLI starts | Node.js | - |
| 2 | `vite.config.ts` is loaded (for `test:` config) | Node.js | `tsconfig.node.json` |
| 3 | Vitest finds test files matching pattern | Node.js | - |
| 4 | Test files are transpiled | Node.js | `tsconfig.app.json` |
| 5 | jsdom environment is created | Node.js | - |
| 6 | Tests execute with simulated DOM | Node.js + jsdom | - |
| 7 | Results are reported | Node.js | - |

**Key insight:** Tests run in Node.js but with **jsdom** providing fake browser APIs. This is why test files use `tsconfig.app.json` - they need DOM types like `document` and `HTMLElement`, even though they technically run in Node.js.

**Why tests need `tsconfig.app.json`:**
```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button', () => {
  render(<Button>Click me</Button>)

  // These need DOM types from tsconfig.app.json
  const button = screen.getByRole('button')  // Returns HTMLElement
  expect(button).toBeInTheDocument()          // Needs jest-dom types

  // These need vitest/globals types
  expect(button).toBeDefined()                // Global expect
})
```

---

### Summary: Which Config Is Used When?

| Command | `tsconfig.node.json` | `tsconfig.app.json` |
|---------|---------------------|---------------------|
| `npm run dev` | ✅ For `vite.config.ts` | ✅ For `src/**/*.tsx` |
| `npm run build` | ✅ For `vite.config.ts` | ✅ For `src/**/*.tsx` |
| `npm run test` | ✅ For `vite.config.ts` | ✅ For `src/**/*.test.tsx` |
| IDE type-checking | ✅ When editing config | ✅ When editing src/ |

---

## Important: Vite Does NOT Use tsconfig for Transpilation!

This is a **crucial distinction** that confuses many developers. The tsconfig files serve a different purpose than you might think.

### The Two Separate Processes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TWO SEPARATE PROCESSES                              │
│                                                                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐ │
│  │       TYPE CHECKING             │    │       TRANSPILATION             │ │
│  │       (TypeScript)              │    │       (Vite/esbuild)            │ │
│  │                                 │    │                                 │ │
│  │  Uses: tsconfig.app.json        │    │  Uses: Vite's internal config   │ │
│  │                                 │    │        (esbuild defaults)       │ │
│  │  When: IDE, tsc --noEmit        │    │                                 │ │
│  │                                 │    │  When: npm run dev/build        │ │
│  │  Purpose:                       │    │                                 │ │
│  │  - Check types are correct      │    │  Purpose:                       │ │
│  │  - Validate your code           │    │  - Convert TS → JS              │ │
│  │  - Show errors in IDE           │    │  - Strip type annotations       │ │
│  │  - Ensure type safety           │    │  - Transform JSX                │ │
│  │                                 │    │  - Bundle for browser           │ │
│  └─────────────────────────────────┘    └─────────────────────────────────┘ │
│                                                                             │
│              ❌ These are NOT the same process!                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Does Vite Use for Transpilation?

Vite uses **esbuild** (in development) and **Rollup + esbuild** (in production) to transpile TypeScript. These tools have their **own built-in TypeScript support** that:

1. **Strips type annotations** - Removes all TypeScript syntax
2. **Transforms JSX** - Converts JSX to JavaScript
3. **Does NOT type-check** - It ignores type errors completely!

```typescript
// This code has a type error
const name: string = 123  // ❌ Type 'number' is not assignable to type 'string'

// But Vite/esbuild will happily transpile it to:
const name = 123  // ✅ Valid JavaScript (types are just stripped)
```

### Why Does Vite Ignore tsconfig?

**Performance.** Type-checking is slow. esbuild is fast because it:

| Tool | Speed | Type Checking |
|------|-------|---------------|
| TypeScript (tsc) | ~1000 files/sec | ✅ Full type checking |
| esbuild | ~100,000 files/sec | ❌ No type checking |

Vite prioritizes **instant hot module replacement (HMR)** over type safety during development. Type-checking would slow this down significantly.

### Which tsconfig Options Does Vite Respect?

Vite/esbuild only looks at a **few** tsconfig options:

| Option | Respected by Vite? | Purpose |
|--------|-------------------|---------|
| `target` | ⚠️ Partially | esbuild has its own target setting |
| `jsx` | ✅ Yes | Determines JSX transform method |
| `jsxFactory` | ✅ Yes | Custom JSX factory function |
| `jsxFragmentFactory` | ✅ Yes | Custom fragment factory |
| `useDefineForClassFields` | ✅ Yes | Class field behavior |
| `importsNotUsedAsValues` | ✅ Yes | Import elision behavior |
| `paths` | ❌ No* | Vite uses its own `resolve.alias` |
| `strict` | ❌ No | Type-checking only |
| `noUnusedLocals` | ❌ No | Type-checking only |
| `lib` | ❌ No | Type-checking only |
| `types` | ❌ No | Type-checking only |

*Path aliases in tsconfig are for the IDE. Vite needs its own `resolve.alias` config (which we have in `vite.config.ts`).

### So What is tsconfig Actually For?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    tsconfig.app.json is used by:                            │
│                                                                             │
│  1. YOUR IDE (VSCode)                                                       │
│     └─ Shows red squiggly lines for type errors                             │
│     └─ Provides autocomplete and IntelliSense                               │
│     └─ Enables "Go to Definition"                                           │
│     └─ Shows hover documentation                                            │
│                                                                             │
│  2. tsc --noEmit (Type checking command)                                    │
│     └─ Usually run in CI/CD pipelines                                       │
│     └─ Can be run manually: npx tsc --noEmit                                │
│     └─ Validates all types before deployment                                │
│                                                                             │
│  3. ESLint with TypeScript parser                                           │
│     └─ Type-aware linting rules                                             │
│     └─ @typescript-eslint/recommended-type-checked                          │
│                                                                             │
│  ❌ NOT used by: Vite, esbuild, or the actual build process                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Practical Example: What This Means

```typescript
// src/utils/math.ts

// This function has a bug - returns string instead of number
export function add(a: number, b: number): number {
  return `${a + b}` as any  // Type assertion bypasses the error
}
```

**What happens:**

| Tool | Result |
|------|--------|
| VSCode | ⚠️ Might show warning depending on strict settings |
| `npm run dev` (Vite) | ✅ Runs fine, no errors |
| `npm run build` (Vite) | ✅ Builds successfully |
| `npx tsc --noEmit` | ❌ Would catch if `noImplicitAny` is strict |
| Runtime | 💥 Bug appears when code runs |

### Best Practice: Add Type Checking to Your Workflow

Since Vite doesn't type-check, you should add explicit type checking:

**1. In `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && tsc --noEmit"
  }
}
```

**2. In CI/CD pipeline:**
```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run typecheck

- name: Build
  run: npm run build
```

**3. Pre-commit hook (optional):**
```bash
# Using husky + lint-staged
npx tsc --noEmit
```

### Visual: The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Development Workflow                                 │
│                                                                             │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│   │   Write     │         │    Save     │         │   Browser   │          │
│   │   Code      │────────▶│    File     │────────▶│   Updates   │          │
│   └─────────────┘         └──────┬──────┘         └─────────────┘          │
│                                  │                                          │
│                    ┌─────────────┼─────────────┐                            │
│                    ▼                           ▼                            │
│         ┌─────────────────┐         ┌─────────────────┐                     │
│         │     VSCode      │         │      Vite       │                     │
│         │  (TypeScript)   │         │    (esbuild)    │                     │
│         │                 │         │                 │                     │
│         │ Reads: tsconfig │         │ Ignores:tsconfig│                     │
│         │ Shows: errors   │         │ Just: transpiles│                     │
│         │ Provides: types │         │ Super: fast     │                     │
│         └─────────────────┘         └─────────────────┘                     │
│                  │                           │                              │
│                  ▼                           ▼                              │
│         ┌─────────────────┐         ┌─────────────────┐                     │
│         │  Red squiggles  │         │   HMR update    │                     │
│         │  in your editor │         │   in ~50ms      │                     │
│         └─────────────────┘         └─────────────────┘                     │
│                                                                             │
│   💡 Type errors in IDE don't block the dev server!                         │
│   💡 You can have broken types and still see your app running!              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Design?

1. **Fast feedback loop** - See changes instantly without waiting for type-checking
2. **Separation of concerns** - Type safety (IDE/CI) vs. runtime (Vite)
3. **Developer experience** - Don't block development for type errors
4. **CI enforcement** - Catch type errors before merge, not during development

### Summary

| Question | Answer |
|----------|--------|
| Does Vite use tsconfig for transpilation? | **No** - It uses esbuild's built-in TS support |
| Does Vite type-check your code? | **No** - It only strips types |
| What uses tsconfig? | **IDE, tsc, ESLint** - For type checking and IntelliSense |
| Will type errors break the build? | **No** - Unless you add `tsc --noEmit` to the build script |
| Why this design? | **Speed** - esbuild is 100x faster without type checking |

---

## Deep Dive: esbuild vs Rollup in Vite

Vite uses **two different bundlers** for different purposes. Understanding when each is used helps clarify why Vite is so fast in development but still produces optimized production builds.

### The Two Bundlers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VITE'S TWO BUNDLERS                                 │
│                                                                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐ │
│  │          esbuild                │    │          Rollup                 │ │
│  │    (Development + Pre-bundle)   │    │      (Production Build)         │ │
│  │                                 │    │                                 │ │
│  │  Written in: Go                 │    │  Written in: JavaScript         │ │
│  │  Speed: ~100x faster than JS    │    │  Speed: Slower but optimized    │ │
│  │                                 │    │                                 │ │
│  │  Used for:                      │    │  Used for:                      │ │
│  │  • Transpiling TS/JSX           │    │  • Final production bundle      │ │
│  │  • Pre-bundling dependencies    │    │  • Tree-shaking                 │ │
│  │  • Dev server transforms        │    │  • Code splitting               │ │
│  │                                 │    │  • Minification (via esbuild)   │ │
│  │  Priority: SPEED                │    │  Priority: OPTIMIZATION         │ │
│  └─────────────────────────────────┘    └─────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What is esbuild?

**esbuild** is an extremely fast JavaScript/TypeScript bundler written in **Go**. It's 10-100x faster than traditional JavaScript-based tools.

**Why is esbuild so fast?**

| Factor | Traditional Bundlers | esbuild |
|--------|---------------------|---------|
| Language | JavaScript (interpreted) | Go (compiled to native code) |
| Parallelism | Single-threaded | Heavily parallelized |
| Memory | Garbage collected, high overhead | Efficient memory usage |
| Parsing | Multiple passes | Single pass |

**Speed comparison:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Bundling a large React app (1000+ modules)                     │
│                                                                 │
│  Webpack:     ████████████████████████████████████  45s         │
│  Parcel:      ██████████████████████████  30s                   │
│  Rollup:      ████████████████████  22s                         │
│  esbuild:     █  0.4s                                           │
│                                                                 │
│  esbuild is ~100x faster!                                       │
└─────────────────────────────────────────────────────────────────┘
```

### What is Rollup?

**Rollup** is a JavaScript module bundler that excels at producing highly optimized bundles. It pioneered many optimization techniques used in modern bundlers.

**Rollup's strengths:**

| Feature | Description |
|---------|-------------|
| Tree-shaking | Removes unused code at the statement level |
| Code splitting | Splits code into optimal chunks |
| Plugin ecosystem | Rich ecosystem for transformations |
| Output formats | Supports ESM, CJS, IIFE, UMD |
| Scope hoisting | Flattens modules for smaller bundles |

---

### Development Mode: esbuild in Action

When you run `npm run dev`, Vite uses esbuild for two critical tasks:

#### 1. Pre-bundling Dependencies (node_modules)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRE-BUNDLING (One-time on first run)                     │
│                                                                             │
│   node_modules/                      .vite/deps/                            │
│   ├── react/                         ├── react.js          (single file)   │
│   │   ├── index.js          ──────▶  ├── react-dom.js      (single file)   │
│   │   ├── cjs/                       ├── @tanstack_router.js               │
│   │   └── ...100+ files              └── chunk-XXXXX.js                    │
│   ├── react-dom/                                                           │
│   │   └── ...200+ files                                                    │
│   └── @tanstack/router/                                                    │
│       └── ...50+ files                                                     │
│                                                                             │
│   Before: 350+ individual files      After: ~5 optimized files             │
│   Would require: 350 HTTP requests   Requires: ~5 HTTP requests            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why pre-bundle?**

```typescript
// Without pre-bundling, importing React would trigger:
// 1. Browser requests: /node_modules/react/index.js
// 2. That file imports: ./cjs/react.development.js
// 3. Which imports: ./cjs/react-jsx-runtime.development.js
// 4. And so on... (100+ HTTP requests!)

// With pre-bundling:
// 1. Browser requests: /.vite/deps/react.js (single file, everything included)
```

**Example: What esbuild does to React:**

```javascript
// BEFORE (node_modules/react/index.js)
'use strict';
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react.production.min.js');
} else {
  module.exports = require('./cjs/react.development.js');
}

// AFTER (.vite/deps/react.js) - esbuild output
// - Converted CommonJS to ESM
// - Resolved all internal imports
// - Single file with everything React needs
export { useState, useEffect, createElement, ... } from './chunk-REACT.js';
```

#### 2. Transforming Your Source Code

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ON-DEMAND TRANSFORMATION (Every file request)                  │
│                                                                             │
│   Browser requests: http://localhost:3000/src/components/Button.tsx        │
│                                                                             │
│   ┌─────────────────────┐                                                   │
│   │  Button.tsx         │                                                   │
│   │  (Your source file) │                                                   │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │      esbuild        │  • Strip TypeScript types                         │
│   │   (transforms in    │  • Convert JSX to JS                              │
│   │     ~1-5ms)         │  • Keep ES modules intact                         │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │  Button.js          │                                                   │
│   │  (Sent to browser)  │                                                   │
│   └─────────────────────┘                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example transformation:**

```tsx
// INPUT: src/components/Button.tsx
import { useState } from 'react'

interface ButtonProps {
  label: string
  onClick?: () => void
}

export const Button = ({ label, onClick }: ButtonProps) => {
  const [count, setCount] = useState<number>(0)

  return (
    <button onClick={() => { setCount(c => c + 1); onClick?.() }}>
      {label}: {count}
    </button>
  )
}
```

```javascript
// OUTPUT: What esbuild sends to browser (in ~2ms)
import { useState } from '/@modules/react'

export const Button = ({ label, onClick }) => {
  const [count, setCount] = useState(0)

  return /* @__PURE__ */ React.createElement(
    "button",
    { onClick: () => { setCount(c => c + 1); onClick?.() } },
    label, ": ", count
  )
}
```

**What esbuild did:**
1. ✅ Removed `interface ButtonProps` (TypeScript-only)
2. ✅ Removed `: ButtonProps` type annotation
3. ✅ Removed `<number>` generic from `useState`
4. ✅ Converted JSX to `React.createElement` calls
5. ✅ Rewrote import path to Vite's module resolution
6. ❌ Did NOT check if types are correct

---

### Production Build: Rollup Takes Over

When you run `npm run build`, Rollup becomes the primary bundler:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION BUILD PIPELINE                           │
│                                                                             │
│   src/**/*.tsx                                                              │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────────────┐                                                   │
│   │      esbuild        │  Step 1: Transform TS/JSX → JS                    │
│   │   (transpilation)   │          (Same as dev, but for all files)         │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │       Rollup        │  Step 2: Bundle & Optimize                        │
│   │    (bundling)       │                                                   │
│   │                     │  • Analyze entire dependency graph                │
│   │                     │  • Tree-shake unused exports                      │
│   │                     │  • Split into optimal chunks                      │
│   │                     │  • Generate import maps                           │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │      esbuild        │  Step 3: Minify                                   │
│   │   (minification)    │          (esbuild is faster than Terser)          │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ▼                                                              │
│   dist/                                                                     │
│   ├── index.html                                                            │
│   ├── assets/                                                               │
│   │   ├── index-[hash].js      (main bundle)                                │
│   │   ├── vendor-[hash].js     (shared dependencies)                        │
│   │   ├── Button-[hash].js     (code-split chunk)                           │
│   │   └── index-[hash].css                                                  │
│   └── ...                                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Use Rollup for Production?

**Tree-shaking example:**

```typescript
// src/utils/math.ts
export function add(a: number, b: number) { return a + b }
export function subtract(a: number, b: number) { return a - b }
export function multiply(a: number, b: number) { return a * b }
export function divide(a: number, b: number) { return a / b }

// src/App.tsx
import { add } from './utils/math'  // Only using 'add'

console.log(add(2, 3))
```

```javascript
// Rollup output (tree-shaken)
// Only 'add' is included, others are removed!

function add(a, b) { return a + b }
console.log(add(2, 3))

// subtract, multiply, divide are completely removed from the bundle
```

**Code-splitting example:**

```typescript
// src/routes/index.tsx
import { lazy } from 'react'

// These become separate chunks
const Dashboard = lazy(() => import('./Dashboard'))
const Settings = lazy(() => import('./Settings'))
const Profile = lazy(() => import('./Profile'))
```

```
// Rollup output structure:
dist/assets/
├── index-a1b2c3.js          (main app, ~50KB)
├── Dashboard-d4e5f6.js      (loaded when user visits /dashboard, ~30KB)
├── Settings-g7h8i9.js       (loaded when user visits /settings, ~20KB)
├── Profile-j0k1l2.js        (loaded when user visits /profile, ~15KB)
└── vendor-m3n4o5.js         (shared React, etc., ~150KB)
```

---

### Side-by-Side Comparison

| Aspect | Development (esbuild) | Production (Rollup + esbuild) |
|--------|----------------------|------------------------------|
| **Speed** | Instant (~1-5ms per file) | Slower (~10-60s for full build) |
| **Bundling** | No bundling (native ESM) | Full bundling |
| **Tree-shaking** | None | Full dead-code elimination |
| **Code-splitting** | None | Automatic chunk splitting |
| **Minification** | None | Full minification (via esbuild) |
| **Source maps** | Inline (fast) | Separate files (optimized) |
| **Output** | Individual ES modules | Optimized chunks |

---

### Practical Example: Full Build Process

Let's trace what happens when you build this simple app:

```typescript
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)

// src/App.tsx
import { useState } from 'react'
import { Button } from './components/Button'
import { formatDate } from './utils/date'  // Unused import!

export function App() {
  const [count, setCount] = useState(0)
  return <Button onClick={() => setCount(c => c + 1)}>Count: {count}</Button>
}

// src/utils/date.ts
export function formatDate(date: Date) { return date.toISOString() }
export function parseDate(str: string) { return new Date(str) }
```

**Step 1: esbuild transforms TypeScript:**

```javascript
// All .tsx files converted to .js (types stripped, JSX converted)
```

**Step 2: Rollup analyzes the dependency graph:**

```
main.tsx
└── App.tsx
    ├── Button.tsx (used)
    └── utils/date.ts
        ├── formatDate (imported but NEVER CALLED - tree-shake!)
        └── parseDate (not imported - tree-shake!)
```

**Step 3: Rollup tree-shakes:**

```javascript
// Final bundle - utils/date.ts is completely removed!
// formatDate was imported but never used, so it's eliminated
```

**Step 4: esbuild minifies:**

```javascript
// Before minification: ~2KB
// After minification: ~0.8KB (60% smaller)
```

---

### Configuration in vite.config.ts

You can customize both esbuild and Rollup behavior:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  // esbuild options (affects dev + build transpilation)
  esbuild: {
    target: 'es2020',           // JavaScript version target
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    drop: ['console', 'debugger'],  // Remove in production
  },

  // Rollup options (affects production build only)
  build: {
    target: 'es2020',           // Output target
    minify: 'esbuild',          // Use esbuild for minification (faster)
    // minify: 'terser',        // Alternative: Terser (slower but more options)

    rollupOptions: {
      output: {
        // Control chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',

        // Manual chunk splitting
        manualChunks: {
          // Put all React-related code in one chunk
          'react-vendor': ['react', 'react-dom'],
          // Put routing in another chunk
          'router': ['@tanstack/react-router'],
        },
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 500,  // KB
  },

  // Dependency pre-bundling options
  optimizeDeps: {
    include: ['react', 'react-dom'],  // Force pre-bundle these
    exclude: ['some-native-module'],   // Don't pre-bundle these
  },
})
```

---

### Summary: esbuild vs Rollup

| Question | Answer |
|----------|--------|
| What does esbuild do? | Fast transpilation (TS→JS, JSX→JS) + pre-bundling dependencies |
| What does Rollup do? | Production bundling with tree-shaking and code-splitting |
| Why not use esbuild for everything? | Rollup has better tree-shaking and plugin ecosystem |
| Why not use Rollup for everything? | It's too slow for development HMR |
| When is esbuild used? | Dev transforms, dependency pre-bundling, production minification |
| When is Rollup used? | Production build only |

---

## Where to Add Vitest Types?

Since test files live in `src/` and run with Vitest's globals, you need to add the test types to **`tsconfig.app.json`**:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  }
}
```

**Why `tsconfig.app.json`?**

1. Test files are located in `src/` (e.g., `src/**/*.test.ts`)
2. `tsconfig.app.json` has `"include": ["src"]`
3. Tests need the same browser environment as the app (DOM APIs, React, etc.)
4. Tests also need Vitest globals (`describe`, `it`, `expect`) and jest-dom matchers (`.toBeInTheDocument()`)

**Do NOT add these to `tsconfig.node.json`** because:
- That config is only for `vite.config.ts`
- Test files don't run in the Node.js build environment

---

## Summary

| Question | Answer |
|----------|--------|
| Why 3 files? | Different environments need different TypeScript settings |
| What does `tsconfig.json` do? | Orchestrates the other configs via project references |
| What does `tsconfig.app.json` do? | Configures browser/React code in `src/` |
| What does `tsconfig.node.json` do? | Configures Node.js build tools like `vite.config.ts` |
| Where to add Vitest types? | **`tsconfig.app.json`** - because tests are in `src/` |

---

## Common Mistakes to Avoid

1. **Adding DOM types to `tsconfig.node.json`** - Build tools don't need browser APIs
2. **Adding Node types to `tsconfig.app.json`** - Browser code shouldn't use `__dirname` or `process`
3. **Adding test types to `tsconfig.node.json`** - Tests run against app code, not build config
4. **Forgetting to add types when using `globals: true`** - TypeScript won't recognize global test functions
