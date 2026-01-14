# VS Code & Prettier Integration Guide

## Overview

There are **two layers** of formatting configuration:

1. **VS Code Settings** - Controls editor behavior (when to format, which formatter to use)
2. **Prettier Config** (`.prettierrc`) - Controls formatting rules (tabs vs spaces, quotes, etc.)

```
┌─────────────────────────────────────────────────────────┐
│                      VS Code                            │
│  "When should I format?" "Which tool should I use?"     │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │  Prettier Extension │                    │
│              └─────────────────────┘                    │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │    .prettierrc      │                    │
│              │  "How should I      │                    │
│              │   format the code?" │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## VS Code Settings Explained

### Types of Settings

| Scope | Location | Applies To |
|-------|----------|------------|
| **User Settings** | `~/Library/Application Support/Code/User/settings.json` | All projects on your machine |
| **Workspace Settings** | `.vscode/settings.json` in project | Only this project |

**Priority:** Workspace settings override User settings.

### Key Formatter Settings

```json
{
  // Which extension formats your code
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // Automatically format when you save
  "editor.formatOnSave": true,

  // Automatically format when you paste code
  "editor.formatOnPaste": false,

  // Run ESLint auto-fix on save
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### What Each Setting Does

| Setting | Purpose |
|---------|---------|
| `editor.defaultFormatter` | Tells VS Code which extension handles formatting |
| `editor.formatOnSave` | Triggers formatting automatically when you save |
| `editor.formatOnPaste` | Formats code when pasted (usually disabled) |
| `editor.codeActionsOnSave` | Runs additional actions on save (like ESLint fixes) |

---

## How VS Code and Prettier Work Together

### The Flow When You Save a File

```
1. You press Cmd+S (save)
         │
         ▼
2. VS Code checks: "Is formatOnSave enabled?"
         │ Yes
         ▼
3. VS Code checks: "What's my defaultFormatter?"
         │ "esbenp.prettier-vscode"
         ▼
4. Prettier extension is invoked
         │
         ▼
5. Prettier looks for config files (in order):
   - .prettierrc in project root
   - .prettierrc.json
   - .prettierrc.js
   - prettier.config.js
   - "prettier" key in package.json
         │
         ▼
6. Prettier formats using those rules
         │
         ▼
7. VS Code checks: "Any codeActionsOnSave?"
         │ Yes, ESLint fix
         ▼
8. ESLint runs auto-fix
         │
         ▼
9. File is saved with all changes
```

### Config Priority

If no `.prettierrc` exists, Prettier uses its defaults:
- `tabWidth: 2`
- `semi: true`
- `singleQuote: false`
- etc.

Your `.prettierrc` **overrides** these defaults.

---

## How to Access VS Code Settings

### Method 1: Command Palette

1. Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows/Linux)
2. Type "Preferences: Open Settings"
3. Choose:
   - **Open Settings (UI)** - Visual interface
   - **Open Settings (JSON)** - Raw JSON file

### Method 2: Keyboard Shortcut

- `Cmd + ,` (Mac)
- `Ctrl + ,` (Windows/Linux)

### Method 3: Menu

- **Mac:** Code → Preferences → Settings
- **Windows/Linux:** File → Preferences → Settings

### Viewing User vs Workspace Settings

In the Settings UI:
- Click **User** tab → Your global settings
- Click **Workspace** tab → Project-specific settings (`.vscode/settings.json`)

---

## Checking Current Formatter Configuration

### Via Command Palette

1. Press `Cmd + Shift + P`
2. Type "Format Document With..."
3. Select "Configure Default Formatter..."
4. See all available formatters

### Via Settings Search

1. Open Settings (`Cmd + ,`)
2. Search for "default formatter"
3. Check the current value

### Via JSON

1. Press `Cmd + Shift + P`
2. Type "Preferences: Open User Settings (JSON)"
3. Look for `"editor.defaultFormatter"`

---

## Recommended Project Setup

Create `.vscode/settings.json` in your project:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "typescriptreact"
  ],
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Why Include This in the Project?

| Benefit | Explanation |
|---------|-------------|
| **Team consistency** | Everyone uses the same formatter settings |
| **No manual setup** | New developers don't need to configure VS Code |
| **Version controlled** | Settings are tracked in git |
| **Overrides user prefs** | Project settings take priority |

---

## Troubleshooting

### "Prettier isn't formatting my file"

1. **Check the formatter:**
   - Right-click in editor → "Format Document With..." → Select Prettier

2. **Check file is not ignored:**
   - Look in `.prettierignore`

3. **Check Prettier extension is installed:**
   - Extensions panel → Search "Prettier"

### "Wrong formatting rules are applied"

1. **Check for multiple config files:**
   ```bash
   ls -la .prettier*
   ```

2. **Verify `.prettierrc` syntax:**
   - Must be valid JSON

3. **Restart VS Code:**
   - Prettier caches config sometimes

### "Format on save isn't working"

1. **Check setting is enabled:**
   - Settings → Search "format on save"

2. **Check for conflicting extensions:**
   - Disable other formatters temporarily

3. **Check Output panel:**
   - View → Output → Select "Prettier" from dropdown

---

## Summary

| Component | Role | File |
|-----------|------|------|
| VS Code Settings | When and how to trigger formatting | `.vscode/settings.json` |
| Prettier Extension | The formatting engine | Installed via Extensions |
| Prettier Config | What rules to apply | `.prettierrc` |
| Prettier Ignore | What files to skip | `.prettierignore` |

**Key insight:** VS Code settings control the **workflow** (format on save, which tool to use), while `.prettierrc` controls the **output** (how the code looks).
