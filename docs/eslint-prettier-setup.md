# ESLint & Prettier Setup for Vite + React + TypeScript

## Overview

- **ESLint** - Finds and fixes code quality issues (bugs, bad practices)
- **Prettier** - Formats code style (indentation, quotes, semicolons)

They work together: ESLint handles logic, Prettier handles aesthetics.

---

## Step 1: Install ESLint Dependencies

```bash
npm install -D eslint @eslint/js typescript-eslint globals
```

### For React Projects

```bash
npm install -D eslint-plugin-react-hooks eslint-plugin-react-refresh
```

| Package                       | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| `eslint`                      | Core linting engine                         |
| `@eslint/js`                  | ESLint's recommended JavaScript rules       |
| `typescript-eslint`           | TypeScript parsing and rules                |
| `globals`                     | Global variable definitions (browser, node) |
| `eslint-plugin-react-hooks`   | Enforces React hooks rules                  |
| `eslint-plugin-react-refresh` | Validates React Fast Refresh boundaries     |

---

## Step 2: Create ESLint Config

Create `eslint.config.js` in your project root:

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
```

> **Note:** This uses ESLint v9's flat config format. Older `.eslintrc.*` files are deprecated.

---

## Step 3: Install Prettier Dependencies

```bash
npm install -D prettier eslint-config-prettier
```

| Package                  | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `prettier`               | Code formatter                                    |
| `eslint-config-prettier` | Disables ESLint rules that conflict with Prettier |

---

## Step 4: Create Prettier Config

Create `.prettierrc` in your project root:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "always"
}
```

### Common Options Explained

| Option           | Value      | Effect                                      |
| ---------------- | ---------- | ------------------------------------------- |
| `semi`           | `false`    | No semicolons at end of statements          |
| `singleQuote`    | `true`     | Use `'single'` instead of `"double"` quotes |
| `tabWidth`       | `2`        | 2 spaces per indentation level              |
| `trailingComma`  | `"es5"`    | Trailing commas where valid in ES5          |
| `printWidth`     | `100`      | Line wrap at 100 characters                 |
| `bracketSpacing` | `true`     | Spaces in object literals `{ foo: bar }`    |
| `jsxSingleQuote` | `false`    | Use double quotes in JSX attributes         |
| `arrowParens`    | `"always"` | Always include parens: `(x) => x`           |

---

## Step 5: Integrate Prettier with ESLint

Update `eslint.config.js` to include Prettier:

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  eslintConfigPrettier, // Must be last to override other configs
])
```

> **Important:** `eslintConfigPrettier` must be the **last** item in the array to properly disable conflicting rules.

---

## Step 6: Create Ignore Files

### `.prettierignore`

```
dist
node_modules
*.min.js
```

### `.eslintignore` (optional for flat config)

With flat config, use `globalIgnores()` in `eslint.config.js` instead.

---

## Step 7: Add npm Scripts

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\""
  }
}
```

| Script         | Purpose                                      |
| -------------- | -------------------------------------------- |
| `lint`         | Check for ESLint errors                      |
| `lint:fix`     | Auto-fix ESLint errors where possible        |
| `format`       | Format all files with Prettier               |
| `format:check` | Check if files are formatted (useful for CI) |

---

## Step 8: VS Code Integration (Recommended)

### Install Extensions

- **ESLint** - `dbaeumer.vscode-eslint`
- **Prettier** - `esbenp.prettier-vscode`

### Create `.vscode/settings.json`

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "typescript", "typescriptreact"]
}
```

This enables:

- Auto-format with Prettier on save
- Auto-fix ESLint issues on save

---

## Complete Installation (All at Once)

```bash
# All dependencies
npm install -D eslint @eslint/js typescript-eslint globals \
  eslint-plugin-react-hooks eslint-plugin-react-refresh \
  prettier eslint-config-prettier
```

---

## Troubleshooting

### "Conflict between ESLint and Prettier"

Ensure `eslint-config-prettier` is installed and is the **last** item in your ESLint config.

### "ESLint not recognizing TypeScript"

Make sure your files have `.ts` or `.tsx` extensions and `typescript-eslint` is properly configured.

### "Prettier not formatting on save"

1. Check VS Code has Prettier set as default formatter
2. Verify `.prettierrc` exists and is valid JSON
3. Check file isn't in `.prettierignore`

---

## Summary

| File                    | Purpose                     |
| ----------------------- | --------------------------- |
| `eslint.config.js`      | ESLint rules and plugins    |
| `.prettierrc`           | Prettier formatting options |
| `.prettierignore`       | Files Prettier should skip  |
| `.vscode/settings.json` | Editor auto-format settings |
