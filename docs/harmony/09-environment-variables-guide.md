# Understanding Environment Variables in Vite

A comprehensive guide to environment variables, `import.meta.env`, `.env` files, and how they work across local development, testing, and CI/CD environments.

---

## Table of Contents

1. [What Are Environment Variables?](#1-what-are-environment-variables)
2. [How Vite Handles Environment Variables](#2-how-vite-handles-environment-variables)
3. [Understanding import.meta.env](#3-understanding-importmetaenv)
4. [The .env Files System](#4-the-env-files-system)
5. [Environment Modes in Vite](#5-environment-modes-in-vite)
6. [Local Development](#6-local-development)
7. [Testing Environment](#7-testing-environment)
8. [CI/CD Environments](#8-cicd-environments)
9. [Security Considerations](#9-security-considerations)
10. [Common Patterns and Best Practices](#10-common-patterns-and-best-practices)
11. [Troubleshooting Common Issues](#11-troubleshooting-common-issues)
12. [Runtime Configuration (Advanced)](#12-runtime-configuration-advanced)

---

## 1. What Are Environment Variables?

Environment variables are **key-value pairs** that exist outside your code but can be accessed by your application. They allow you to:

- Configure different behavior for different environments (dev, test, prod)
- Store sensitive values (API keys, secrets) outside the codebase
- Change application behavior without modifying code

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    What Are Environment Variables?                          │
│                                                                             │
│   Your Code                          Environment                            │
│   ┌─────────────────────┐            ┌─────────────────────┐               │
│   │                     │            │ VITE_API_URL=https: │               │
│   │ fetch(API_URL)      │  ◄─────    │ VITE_DEBUG=true     │               │
│   │                     │   reads    │ NODE_ENV=development│               │
│   └─────────────────────┘            └─────────────────────┘               │
│                                                                             │
│   Code stays the same                Values change per environment          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Traditional Environment Variables (Node.js)

In Node.js, you access environment variables via `process.env`:

```javascript
// Node.js (server-side)
const apiUrl = process.env.API_URL
const nodeEnv = process.env.NODE_ENV
```

### The Browser Problem

**Browsers don't have `process.env`!** The browser is a sandboxed environment with no access to the operating system's environment variables.

```javascript
// ❌ This FAILS in the browser
console.log(process.env.API_URL) // Error: process is not defined
```

This is where **Vite's build-time replacement** comes in.

---

## 2. How Vite Handles Environment Variables

Vite uses a **build-time replacement** strategy. During the build process, Vite literally **replaces** environment variable references in your code with their actual values.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BUILD-TIME REPLACEMENT                                   │
│                                                                             │
│   BEFORE BUILD (Your Source Code)                                           │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ const apiUrl = import.meta.env.VITE_API_URL                 │          │
│   │ console.log(apiUrl)                                         │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                              │                                              │
│                              │  Vite Build Process                          │
│                              │  (reads .env files)                          │
│                              ▼                                              │
│   AFTER BUILD (Output JavaScript)                                           │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ const apiUrl = "https://api.example.com"                    │          │
│   │ console.log(apiUrl)                                         │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│   The variable reference is REPLACED with the actual string value!          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Insight: Static Replacement

This replacement happens **at build time**, not runtime. The values are literally embedded into your JavaScript bundle.

```typescript
// Source code
if (import.meta.env.DEV) {
  console.log('Debug mode')
}

// After production build (import.meta.env.DEV = false)
if (false) {
  console.log('Debug mode')
}

// After minification (dead code eliminated!)
// The entire if block is removed!
```

This is why:
- ✅ Unused code paths can be tree-shaken
- ❌ You can't change env vars at runtime
- ❌ You can't dynamically access env vars

```typescript
// ❌ This WON'T work - dynamic access
const key = 'VITE_API_URL'
console.log(import.meta.env[key]) // undefined!

// ✅ This WILL work - static access
console.log(import.meta.env.VITE_API_URL) // "https://api.example.com"
```

---

## 3. Understanding import.meta.env

`import.meta` is a JavaScript standard (ES2020) that provides context-specific metadata to a module. Vite extends this with an `env` object.

### What is import.meta?

```typescript
// import.meta is a standard JavaScript object
console.log(import.meta.url) // "http://localhost:3000/src/App.tsx"

// Vite adds the 'env' property
console.log(import.meta.env) // { DEV: true, PROD: false, ... }
```

### Built-in Variables

Vite provides these variables automatically (no configuration needed):

| Variable | Type | Description |
|----------|------|-------------|
| `import.meta.env.MODE` | `string` | The mode the app is running in (`development`, `production`, `test`) |
| `import.meta.env.DEV` | `boolean` | `true` in development mode |
| `import.meta.env.PROD` | `boolean` | `true` in production mode |
| `import.meta.env.SSR` | `boolean` | `true` when running on server |
| `import.meta.env.BASE_URL` | `string` | The base URL the app is served from |

### How These Are Set

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOW MODE IS DETERMINED                                   │
│                                                                             │
│   Command                          MODE value       DEV    PROD             │
│   ─────────────────────────────────────────────────────────────────         │
│   vite                             "development"    true   false            │
│   vite dev                         "development"    true   false            │
│   vite build                       "production"     false  true             │
│   vite build --mode staging        "staging"        false  true             │
│   vitest                           "test"           false  false            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Examples

```typescript
// Conditional logging
if (import.meta.env.DEV) {
  console.log('Development mode - extra logging enabled')
}

// API URL based on environment
const apiUrl = import.meta.env.PROD
  ? 'https://api.production.com'
  : 'http://localhost:4000'

// Feature flags
if (import.meta.env.MODE === 'staging') {
  enableBetaFeatures()
}
```

---

## 4. The .env Files System

Vite uses `.env` files to define environment variables. These files follow a specific naming convention and loading order.

### File Naming Convention

```
.env                # Loaded in ALL cases
.env.local          # Loaded in ALL cases, ignored by git
.env.[mode]         # Only loaded in specified mode
.env.[mode].local   # Only loaded in specified mode, ignored by git
```

### Loading Priority (Highest to Lowest)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FILE LOADING PRIORITY                                    │
│                                                                             │
│   When running: vite (development mode)                                     │
│                                                                             │
│   Priority 1 (Highest): .env.development.local                              │
│   Priority 2:           .env.development                                    │
│   Priority 3:           .env.local                                          │
│   Priority 4 (Lowest):  .env                                                │
│                                                                             │
│   ─────────────────────────────────────────────────────────────────         │
│                                                                             │
│   When running: vite build (production mode)                                │
│                                                                             │
│   Priority 1 (Highest): .env.production.local                               │
│   Priority 2:           .env.production                                     │
│   Priority 3:           .env.local                                          │
│   Priority 4 (Lowest):  .env                                                │
│                                                                             │
│   Higher priority files OVERRIDE lower priority files                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The VITE_ Prefix Requirement

**Only variables prefixed with `VITE_` are exposed to your client code.**

```bash
# .env file
VITE_API_URL=https://api.example.com    # ✅ Exposed to client
VITE_DEBUG=true                          # ✅ Exposed to client
API_SECRET=super-secret-key              # ❌ NOT exposed (no VITE_ prefix)
DATABASE_URL=postgres://localhost/db     # ❌ NOT exposed (no VITE_ prefix)
```

```typescript
// In your code
console.log(import.meta.env.VITE_API_URL)  // "https://api.example.com"
console.log(import.meta.env.VITE_DEBUG)    // "true" (string, not boolean!)
console.log(import.meta.env.API_SECRET)    // undefined
console.log(import.meta.env.DATABASE_URL)  // undefined
```

### Why the VITE_ Prefix?

**Security.** Without this safeguard, all environment variables would be bundled into your JavaScript and visible to anyone who views your source code.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY: WHY VITE_ PREFIX?                              │
│                                                                             │
│   Server Environment Variables          Client Bundle                       │
│   ┌─────────────────────────────┐       ┌─────────────────────────────┐    │
│   │ DATABASE_URL=postgres://... │       │                             │    │
│   │ API_SECRET=sk_live_abc123   │       │ VITE_API_URL="https://..."  │    │
│   │ AWS_ACCESS_KEY=AKIA...      │ ────▶ │ VITE_FEATURE_FLAG="true"    │    │
│   │ VITE_API_URL=https://...    │       │                             │    │
│   │ VITE_FEATURE_FLAG=true      │       │ (Secrets are filtered out!) │    │
│   └─────────────────────────────┘       └─────────────────────────────┘    │
│                                                                             │
│   Only VITE_* variables make it to the browser!                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Examples

```bash
# .env (shared across all environments)
VITE_APP_NAME=MyApp
VITE_VERSION=1.0.0

# .env.development (development only)
VITE_API_URL=http://localhost:4000
VITE_DEBUG=true
VITE_USE_MOCKS=true

# .env.production (production only)
VITE_API_URL=https://api.myapp.com
VITE_DEBUG=false
VITE_USE_MOCKS=false

# .env.local (personal overrides, gitignored)
VITE_API_URL=http://localhost:8080  # Override for my local setup
VITE_DEBUG=true

# .env.development.local (personal dev overrides, gitignored)
VITE_USE_MOCKS=false  # I want to test against real API
```

### .gitignore Configuration

```gitignore
# .gitignore

# Local env files (contain personal/sensitive overrides)
.env.local
.env.*.local

# Do NOT ignore these (they're safe to commit)
# .env
# .env.development
# .env.production
```

---

## 5. Environment Modes in Vite

### Default Modes

| Command | Default Mode |
|---------|--------------|
| `vite` / `vite dev` / `vite serve` | `development` |
| `vite build` | `production` |
| `vitest` | `test` |

### Custom Modes

You can define custom modes for different environments:

```bash
# Run with staging mode
vite build --mode staging

# Run with preview mode
vite --mode preview
```

This loads `.env.staging` or `.env.preview` respectively.

### Practical Example: Multiple Environments

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-ENVIRONMENT SETUP                                  │
│                                                                             │
│   Environment     Command                    Files Loaded                   │
│   ─────────────────────────────────────────────────────────────────         │
│   Development     vite                       .env, .env.development         │
│   Test            vitest                     .env, .env.test                │
│   Staging         vite build --mode staging  .env, .env.staging             │
│   Production      vite build                 .env, .env.production          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```bash
# .env.staging
VITE_API_URL=https://staging-api.myapp.com
VITE_ENVIRONMENT=staging
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=https://staging@sentry.io/123
```

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:staging": "vite build --mode staging",
    "build:production": "vite build --mode production",
    "preview": "vite preview"
  }
}
```

---

## 6. Local Development

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT FLOW                                   │
│                                                                             │
│   You run: npm run dev                                                      │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ Vite CLI starts │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Load .env files in order:               │                               │
│   │ 1. .env                                 │                               │
│   │ 2. .env.local                           │                               │
│   │ 3. .env.development                     │                               │
│   │ 4. .env.development.local               │                               │
│   └────────┬────────────────────────────────┘                               │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Filter: Only keep VITE_* variables      │                               │
│   └────────┬────────────────────────────────┘                               │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Inject into import.meta.env             │                               │
│   │ Set import.meta.env.DEV = true          │                               │
│   │ Set import.meta.env.MODE = "development"│                               │
│   └────────┬────────────────────────────────┘                               │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Start dev server on localhost:5173      │                               │
│   │ (or your configured port)               │                               │
│   └─────────────────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Local Override Pattern

Team member A wants to use mocks, Team member B wants real APIs:

```bash
# .env.development (committed to git, team default)
VITE_USE_MOCKS=true
VITE_API_URL=http://localhost:4000

# .env.development.local (NOT committed, personal override)
# Team member B creates this file locally:
VITE_USE_MOCKS=false
VITE_API_URL=http://192.168.1.100:4000  # Their backend server
```

---

## 7. Testing Environment

### How Vitest Handles Environment Variables

When you run `vitest`, it sets `MODE` to `"test"` and loads `.env.test` files.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TESTING ENVIRONMENT FLOW                                 │
│                                                                             │
│   You run: npm test (vitest)                                                │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ Vitest starts   │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Load .env files in order:               │                               │
│   │ 1. .env                                 │                               │
│   │ 2. .env.local                           │                               │
│   │ 3. .env.test                            │                               │
│   │ 4. .env.test.local                      │                               │
│   └────────┬────────────────────────────────┘                               │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Set import.meta.env.MODE = "test"       │                               │
│   │ Set import.meta.env.DEV = false         │                               │
│   │ Set import.meta.env.PROD = false        │                               │
│   └────────┬────────────────────────────────┘                               │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │ Run tests in jsdom environment          │                               │
│   │ MSW intercepts API calls                │                               │
│   └─────────────────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Environment Files

```bash
# .env.test
VITE_API_URL=http://localhost:4000  # Doesn't matter, MSW intercepts
VITE_USE_MOCKS=true                  # Always use mocks in tests
VITE_ENABLE_ANALYTICS=false          # Disable analytics in tests
```

### Accessing Env Vars in Tests

```typescript
// In your test file
describe('API configuration', () => {
  it('should be in test mode', () => {
    expect(import.meta.env.MODE).toBe('test')
  })

  it('should have mocks enabled', () => {
    expect(import.meta.env.VITE_USE_MOCKS).toBe('true')
  })
})
```

### Overriding Env Vars in Tests

```typescript
// For specific tests, you can mock import.meta.env
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Feature flag behavior', () => {
  const originalEnv = import.meta.env

  beforeEach(() => {
    // Create a mock env object
    vi.stubGlobal('import.meta', {
      env: {
        ...originalEnv,
        VITE_FEATURE_FLAG: 'true',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('enables feature when flag is true', () => {
    // Test with VITE_FEATURE_FLAG = 'true'
  })
})
```

---

## 8. CI/CD Environments

### The Challenge

In CI/CD, you typically don't have `.env` files. Instead, environment variables are set through the CI/CD platform's configuration.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CI/CD ENVIRONMENT CHALLENGE                              │
│                                                                             │
│   Local Development              CI/CD (GitHub Actions, Jenkins)            │
│   ┌─────────────────────┐        ┌─────────────────────┐                   │
│   │ .env files exist    │        │ NO .env files!      │                   │
│   │ in project folder   │        │ Variables set via   │                   │
│   │                     │        │ platform UI/secrets │                   │
│   └─────────────────────┘        └─────────────────────┘                   │
│                                                                             │
│   How do we get env vars into the build?                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Solution: Vite Also Reads process.env

Vite reads environment variables from **both** `.env` files AND `process.env`. If a `VITE_*` variable exists in `process.env`, Vite will use it.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOW VITE COLLECTS ENV VARS                               │
│                                                                             │
│   Source 1: .env files                                                      │
│   ┌─────────────────────────────────┐                                       │
│   │ VITE_API_URL=http://localhost   │                                       │
│   │ VITE_DEBUG=true                 │                                       │
│   └─────────────────────────────────┘                                       │
│                 │                                                           │
│                 ▼                                                           │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                     Vite Merge                               │          │
│   │  (process.env OVERRIDES .env files)                          │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                 ▲                                                           │
│                 │                                                           │
│   Source 2: process.env (shell/CI environment)                              │
│   ┌─────────────────────────────────┐                                       │
│   │ VITE_API_URL=https://api.prod   │  ◄── This wins!                       │
│   │ VITE_SENTRY_DSN=https://...     │                                       │
│   └─────────────────────────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build for production
        run: npm run build
        env:
          # These override any .env file values
          VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          VITE_ENABLE_ANALYTICS: 'true'

      - name: Deploy
        run: npm run deploy
```

### Setting GitHub Secrets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GITHUB SECRETS SETUP                                     │
│                                                                             │
│   1. Go to: Repository → Settings → Secrets and variables → Actions        │
│                                                                             │
│   2. Add secrets:                                                           │
│      ┌────────────────────────────────────────────────────────────┐        │
│      │ Name: PRODUCTION_API_URL                                    │        │
│      │ Value: https://api.myapp.com                                │        │
│      └────────────────────────────────────────────────────────────┘        │
│      ┌────────────────────────────────────────────────────────────┐        │
│      │ Name: SENTRY_DSN                                            │        │
│      │ Value: https://abc123@sentry.io/456                         │        │
│      └────────────────────────────────────────────────────────────┘        │
│                                                                             │
│   3. Reference in workflow:                                                 │
│      env:                                                                   │
│        VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Jenkins Example

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        // Method 1: Direct values (not recommended for secrets)
        VITE_ENABLE_ANALYTICS = 'true'

        // Method 2: From Jenkins credentials
        VITE_API_URL = credentials('production-api-url')
        VITE_SENTRY_DSN = credentials('sentry-dsn')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                // Environment variables are automatically available
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            steps {
                sh 'npm run deploy'
            }
        }
    }
}
```

### Different Environments in CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm test

      # Conditional environment based on branch
      - name: Build for Staging
        if: github.ref == 'refs/heads/staging'
        run: npm run build -- --mode staging
        env:
          VITE_API_URL: ${{ secrets.STAGING_API_URL }}
          VITE_ENVIRONMENT: staging

      - name: Build for Production
        if: github.ref == 'refs/heads/main'
        run: npm run build -- --mode production
        env:
          VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
          VITE_ENVIRONMENT: production
```

### Complete CI/CD Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE CI/CD FLOW                                      │
│                                                                             │
│   Developer pushes to main branch                                           │
│                 │                                                           │
│                 ▼                                                           │
│   ┌─────────────────────────────────────────┐                               │
│   │         GitHub Actions Triggered         │                               │
│   └────────────────────┬────────────────────┘                               │
│                        │                                                    │
│                        ▼                                                    │
│   ┌─────────────────────────────────────────┐                               │
│   │           Load Secrets                   │                               │
│   │   VITE_API_URL = secrets.PROD_API_URL   │                               │
│   │   VITE_SENTRY_DSN = secrets.SENTRY_DSN  │                               │
│   └────────────────────┬────────────────────┘                               │
│                        │                                                    │
│                        ▼                                                    │
│   ┌─────────────────────────────────────────┐                               │
│   │         Export to Environment            │                               │
│   │   $ export VITE_API_URL="https://..."   │                               │
│   └────────────────────┬────────────────────┘                               │
│                        │                                                    │
│                        ▼                                                    │
│   ┌─────────────────────────────────────────┐                               │
│   │         Run: npm run build               │                               │
│   │                                          │                               │
│   │   Vite reads process.env.VITE_*         │                               │
│   │   Replaces in code at build time        │                               │
│   └────────────────────┬────────────────────┘                               │
│                        │                                                    │
│                        ▼                                                    │
│   ┌─────────────────────────────────────────┐                               │
│   │         Output: dist/                    │                               │
│   │                                          │                               │
│   │   const apiUrl = "https://api.prod.com" │                               │
│   │   (Actual value baked into bundle)      │                               │
│   └────────────────────┬────────────────────┘                               │
│                        │                                                    │
│                        ▼                                                    │
│   ┌─────────────────────────────────────────┐                               │
│   │         Deploy to CDN/Server             │                               │
│   └─────────────────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Considerations

### What's Safe to Expose

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY CLASSIFICATION                                  │
│                                                                             │
│   ✅ SAFE to put in VITE_* (exposed to browser)                            │
│   ─────────────────────────────────────────────                             │
│   • Public API URLs                                                         │
│   • Public keys (like Stripe publishable key)                               │
│   • Feature flags                                                           │
│   • Analytics IDs (Google Analytics, Sentry DSN)                           │
│   • Environment name (dev/staging/prod)                                     │
│                                                                             │
│   ❌ NEVER put in VITE_* (would be exposed!)                               │
│   ─────────────────────────────────────────────                             │
│   • Database credentials                                                    │
│   • API secret keys                                                         │
│   • Private keys                                                            │
│   • Internal service URLs                                                   │
│   • Passwords or auth tokens                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example: Stripe Keys

```bash
# .env.production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_abc123   # ✅ Safe - this is meant to be public
STRIPE_SECRET_KEY=sk_live_xyz789              # ✅ Safe - no VITE_ prefix, not exposed

# ❌ WRONG - never do this!
VITE_STRIPE_SECRET_KEY=sk_live_xyz789         # ❌ DANGER - would be in your JS bundle!
```

### Verifying What's Exposed

After building, check what's in your bundle:

```bash
# Build the app
npm run build

# Search for env vars in the bundle
grep -r "VITE_" dist/

# Or check the actual JS files
cat dist/assets/*.js | grep -o 'VITE_[A-Z_]*' | sort -u
```

---

## 10. Common Patterns and Best Practices

### Pattern 1: Type-Safe Environment Variables

```typescript
// src/env.d.ts (already created by Vite)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USE_MOCKS: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_SENTRY_DSN: string
  // Add more as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### Pattern 2: Centralized Config

```typescript
// src/config/env.ts
/**
 * Centralized environment configuration
 * Provides type safety and default values
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv]
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

function getBooleanEnv(key: string, defaultValue = false): boolean {
  const value = import.meta.env[key as keyof ImportMetaEnv]
  if (value === undefined) return defaultValue
  return value === 'true'
}

export const config = {
  // API Configuration
  apiUrl: getEnvVar('VITE_API_URL'),

  // Feature Flags
  useMocks: getBooleanEnv('VITE_USE_MOCKS', false),
  enableAnalytics: getBooleanEnv('VITE_ENABLE_ANALYTICS', false),

  // Environment Info
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,

  // Optional services (with defaults)
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
} as const

// Usage in your app:
// import { config } from '@/config/env'
// fetch(`${config.apiUrl}/users`)
```

### Pattern 3: Validation at Startup

```typescript
// src/config/validateEnv.ts
/**
 * Validate required environment variables at app startup
 * Fails fast if configuration is missing
 */

export function validateEnv() {
  const required = [
    'VITE_API_URL',
  ]

  const missing = required.filter(
    key => !import.meta.env[key as keyof ImportMetaEnv]
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}`
    )
  }
}

// Call in main.tsx before rendering
// validateEnv()
```

### Pattern 4: Conditional Feature Loading

```typescript
// src/main.tsx
async function bootstrap() {
  // Conditionally load MSW for mocking
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start()
  }

  // Conditionally load analytics
  if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
    const { initAnalytics } = await import('./lib/analytics')
    initAnalytics()
  }

  // Conditionally load error tracking
  if (import.meta.env.VITE_SENTRY_DSN) {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
    })
  }

  // Render app
  const root = document.getElementById('root')!
  ReactDOM.createRoot(root).render(<App />)
}

bootstrap()
```

### Pattern 5: Environment-Specific Files

```
project/
├── .env                    # Shared defaults
├── .env.development        # Dev server defaults
├── .env.production         # Production defaults
├── .env.staging            # Staging defaults
├── .env.test               # Test defaults
├── .env.local              # Local overrides (gitignored)
├── .env.development.local  # Local dev overrides (gitignored)
└── .gitignore              # Must include *.local
```

---

## Summary

### Quick Reference Table

| Concept | Description |
|---------|-------------|
| `import.meta.env` | Object containing all exposed env vars |
| `VITE_` prefix | Required for client-side exposure |
| `.env` | Base file, loaded in all modes |
| `.env.[mode]` | Mode-specific file |
| `.env.local` | Local overrides (gitignored) |
| `import.meta.env.DEV` | `true` in development |
| `import.meta.env.PROD` | `true` in production |
| `import.meta.env.MODE` | Current mode string |

### Key Takeaways

1. **Build-time replacement**: Env vars are replaced at build time, not runtime
2. **VITE_ prefix**: Only `VITE_*` variables are exposed to the browser
3. **File priority**: `.env.[mode].local` > `.env.[mode]` > `.env.local` > `.env`
4. **CI/CD**: Set env vars in the CI platform; they override `.env` files
5. **Security**: Never put secrets in `VITE_*` variables
6. **Type safety**: Use `env.d.ts` to get TypeScript support

### Debugging Tips

```typescript
// Log all available env vars
console.log('All env vars:', import.meta.env)

// Check specific values
console.log('Mode:', import.meta.env.MODE)
console.log('Dev?:', import.meta.env.DEV)
console.log('API URL:', import.meta.env.VITE_API_URL)
```

```bash
# Check what mode Vite is using
DEBUG=vite:* npm run build

# Verify env vars are being loaded
VITE_DEBUG=true npm run dev
```

---

## 11. Troubleshooting Common Issues

### Issue 1: Environment Variable is undefined

**Symptom:**
```typescript
console.log(import.meta.env.VITE_API_URL) // undefined
```

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Missing `VITE_` prefix | Rename `API_URL` to `VITE_API_URL` |
| Typo in variable name | Check spelling matches exactly |
| Wrong `.env` file | Ensure correct file for your mode (`.env.development` for dev) |
| Server not restarted | Restart `vite` after changing `.env` files |
| File not in root | `.env` must be in project root (next to `package.json`) |

```bash
# Restart the dev server after changing .env
# Press Ctrl+C to stop, then:
npm run dev
```

### Issue 2: Changes to .env Not Taking Effect

**Why it happens:** Vite caches environment variables when the server starts.

**Solution:**
```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Issue 3: Environment Variable Shows Wrong Value

**Symptom:** Variable shows development value in production.

**Check priority order:**
```bash
# Files are loaded in this order (later overrides earlier):
.env                    # 1st (lowest priority)
.env.local              # 2nd
.env.production         # 3rd
.env.production.local   # 4th (highest priority)
```

**Debugging:**
```bash
# In CI/CD, print env vars before build
echo "VITE_API_URL=$VITE_API_URL"
npm run build
```

### Issue 4: Dynamic Access Not Working

**Symptom:**
```typescript
const key = 'VITE_API_URL'
console.log(import.meta.env[key]) // undefined
```

**Why:** Vite performs static replacement at build time. It can't replace dynamic access.

**Solution:** Use static access only:
```typescript
// ✅ Works
console.log(import.meta.env.VITE_API_URL)

// ✅ Works (conditional, but static keys)
const url = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_URL
  : import.meta.env.VITE_PROD_URL
```

### Issue 5: TypeScript Doesn't Recognize Env Variable

**Symptom:**
```typescript
// TypeScript error: Property 'VITE_MY_VAR' does not exist
import.meta.env.VITE_MY_VAR
```

**Solution:** Update `src/vite-env.d.ts` or `src/env.d.ts`:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_MY_VAR: string  // Add your variable here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### Issue 6: CI Build Uses Wrong Values

**Symptom:** Production build has development values.

**Common Causes:**

1. **Environment variables not exported:**
```yaml
# ❌ Wrong - variables not available to npm run build
- name: Build
  run: |
    VITE_API_URL=https://api.prod.com
    npm run build

# ✅ Correct - use env block
- name: Build
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
```

2. **Wrong mode:**
```yaml
# ❌ Wrong - defaults to production mode
- run: npm run build

# ✅ Correct - explicitly set mode if using custom .env.staging
- run: npm run build -- --mode staging
```

### Issue 7: Boolean Values Don't Work as Expected

**Problem:** Environment variables are always strings!

```typescript
// .env
VITE_ENABLED=true

// In code
if (import.meta.env.VITE_ENABLED) {  // Always true! Even for "false"
  // This runs because "false" is a truthy string
}
```

**Solution:** Compare as strings:
```typescript
// ✅ Correct
if (import.meta.env.VITE_ENABLED === 'true') {
  // Only runs when exactly 'true'
}

// Or create a helper
const isEnabled = import.meta.env.VITE_ENABLED === 'true'
```

---

## 12. Runtime Configuration (Advanced)

### When Build-Time Replacement Isn't Enough

Sometimes you need configuration that can change **without rebuilding** the app:

- Multi-tenant applications
- Single build deployed to multiple environments
- Feature flags that change frequently

### Solution: External Configuration File

```typescript
// public/config.js (NOT processed by Vite)
window.__APP_CONFIG__ = {
  apiUrl: 'https://api.example.com',
  featureFlags: {
    newDashboard: true,
  },
};
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <!-- Load config before app -->
    <script src="/config.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```typescript
// src/config/runtime.ts
interface AppConfig {
  apiUrl: string
  featureFlags: {
    newDashboard: boolean
  }
}

declare global {
  interface Window {
    __APP_CONFIG__: AppConfig
  }
}

export const runtimeConfig: AppConfig = window.__APP_CONFIG__
```

**Deploy workflow:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RUNTIME CONFIG DEPLOYMENT                                 │
│                                                                             │
│   1. Build once: npm run build                                               │
│      └── Creates dist/ with static config.js placeholder                    │
│                                                                             │
│   2. Deploy to Staging:                                                      │
│      └── Replace public/config.js with staging values                       │
│                                                                             │
│   3. Deploy to Production:                                                   │
│      └── Replace public/config.js with production values                    │
│                                                                             │
│   Same build artifact, different config!                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When to Use Each Approach

| Scenario | Use Build-Time (`import.meta.env`) | Use Runtime (`config.js`) |
|----------|-----------------------------------|---------------------------|
| API URLs | ✅ (if single env per build) | ✅ (if multi-env per build) |
| Feature flags | ✅ (if rarely change) | ✅ (if frequently change) |
| Analytics IDs | ✅ | ❌ |
| Secrets/keys | ❌ Never expose | ❌ Never expose |
| Multi-tenant config | ❌ | ✅ |
| Per-environment builds | ✅ | Overkill |
| Single build, multi-deploy | ❌ | ✅ |

---

## Related Documentation

- [07-test-setup-guide.md](./07-test-setup-guide.md) - MSW setup uses environment variables for mocking
- [08-tsconfig-files-explained.md](./08-tsconfig-files-explained.md) - TypeScript configuration including `vite-env.d.ts`

---

## Quick Checklist

When setting up environment variables in a new project:

- [ ] Create `.env` with shared defaults
- [ ] Create `.env.development` with dev-specific values
- [ ] Create `.env.production` with prod-specific values
- [ ] Add `.env.local` and `.env.*.local` to `.gitignore`
- [ ] Update `src/vite-env.d.ts` with type definitions
- [ ] Set up CI/CD secrets for production values
- [ ] Test build output to verify no secrets are exposed
