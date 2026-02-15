# Plan: AG Grid Custom Filters — Harmony App

## Context

The existing `MultiValueFloatingFilter` is a minimal text input that parses comma/OR-separated values into OR-only text filter models. It lacks AND support, compact display mode, debounce, number filter support, bidirectional sync, error handling, and clear functionality. The MSW handlers can only process single-condition filter models — multi-condition models (`condition1`/`condition2` or `conditions[]`) silently pass through unfiltered. This plan implements all requirements from the PRD plus decisions made during the requirements interview.

## User Decisions (from interview)
- Number filter operation: `equals`
- Debounce: 300ms (manual `useRef` — no new deps)
- Mixed operators: show tooltip error, clear filter (don't apply partial)
- Max exceeded: show tooltip error, clear filter
- Error display: tooltip on hover/focus of `!` icon
- Edit mode exits: blur, Enter (commit), Escape (commit as-is), Comma (auto-switch)
- Columns: FxCashTab → `currencyPair` (text, existing) + `buyAmount` (number); FxOptionsTab → `currencyPair` (text) + `notionalAmount` (number)
- Coverage: ≥80% for `MultiValueFloatingFilter` only

---

## Files to Modify / Create

| # | File | Change |
|---|------|--------|
| 1 | `src/mocks/handlers/filter-utils.ts` | **CREATE** — shared multi-condition filter evaluation |
| 2 | `src/mocks/handlers/fx-cash.ts` | Update `filterModel` type + replace `applyFiltering` body |
| 3 | `src/mocks/handlers/fx-options.ts` | Same as above |
| 4 | `src/components/ui/MultiValueFloatingFilter.module.css` | **CREATE** — compact display + tooltip styles |
| 5 | `src/components/ui/MultiValueFloatingFilter.tsx` | Full rewrite |
| 6 | `src/components/ui/ServerSideGrid.tsx` | Add filter defaults to `defaultColDef` |
| 7 | `src/pages/app/trade-activity/block-level/FxCashTab.tsx` | Add `buyAmount` floating filter; remove redundant `defaultColDef` |
| 8 | `src/pages/app/trade-activity/block-level/FxOptionsTab.tsx` | Add `currencyPair` + `notionalAmount` floating filters |
| 9 | `src/components/ui/MultiValueFloatingFilter.test.tsx` | **CREATE** — unit tests |

---

## Step 1 — `src/mocks/handlers/filter-utils.ts` (NEW)

Create discriminated union types for AG Grid's multi-condition filter shapes and a shared `evaluateColumnFilter` function that both MSW handlers will import.

```ts
// Discriminated union
interface SingleCondition { filterType: string; type: string; filter?: string | number; filterTo?: string | number; values?: string[] }
interface TwoConditionModel { filterType: string; operator: 'OR' | 'AND'; condition1: SingleCondition; condition2: SingleCondition }
interface MultiConditionModel { filterType: string; operator: 'OR' | 'AND'; conditions: SingleCondition[] }
export type ColumnFilterModel = SingleCondition | TwoConditionModel | MultiConditionModel
```

**`evaluateSingleCondition(rowValue, condition)`** — extracts the existing switch logic from `applyFiltering` verbatim (text + number + set cases). Returns `boolean`.

**`evaluateColumnFilter(rowValue, filter)`** — dispatches based on shape:
- Has `condition1` → evaluate both, apply operator
- Has `conditions[]` → map + `some`/`every` based on operator
- Neither → call `evaluateSingleCondition` directly (single-condition, existing behavior preserved)

---

## Step 2 & 3 — MSW Handlers

In both `fx-cash.ts` and `fx-options.ts`:

1. Import `ColumnFilterModel` and `evaluateColumnFilter` from `./filter-utils`
2. Update `filterModel` type on `ServerSideRequest` to `Record<string, ColumnFilterModel>`
3. Replace the entire `applyFiltering` body with:
   ```ts
   return data.filter((row) => {
     for (const [colId, filter] of Object.entries(filterModel)) {
       if (!evaluateColumnFilter(row[colId as keyof T], filter)) return false
     }
     return true
   })
   ```

This keeps all existing single-condition behavior and adds multi-condition support.

---

## Step 4 — `MultiValueFloatingFilter.module.css`

### Styling Requirements

The custom floating filter must be **visually identical** to AG Grid Quartz theme's native floating filter inputs — same height, borders, border-radius, focus ring, and overall dimensions. The component must NOT change width or height based on value count.

#### Critical: Height & Sizing

- **Never hardcode pixel heights** (e.g., `height: 24px`). Use `height: 100%` so the component fills the parent `.ag-floating-filter-body` container. AG Grid controls the floating filter row height — our component inherits it.
- Use `width: 100%` on wrapper, input, and compact display.

#### Critical: Filter Button (Column Filter Icon)

- By default, AG Grid hides the filter button for custom floating filter components (renders in `ag-floating-filter-full-body` which takes the full width).
- **Must add `suppressFloatingFilterButton: false`** on every column definition that uses `floatingFilterComponent: MultiValueFloatingFilter`. This tells AG Grid to render the column filter icon (▼) alongside the custom component, matching native columns.

#### CSS Rules (use AG Grid CSS variables for theme consistency)

- `.wrapper` — `position: relative; display: flex; width: 100%; height: 100%; overflow: visible` (overflow: visible lets the tooltip escape the fixed-height row)
- `.input` — `width: 100%; height: 100%; border: var(--ag-borders-input) var(--ag-input-border-color); border-radius: var(--ag-border-radius); background: var(--ag-background-color)`. On focus: `border-color: var(--ag-input-focus-border-color); box-shadow: var(--ag-input-focus-box-shadow)`.
- `.compactDisplay` — Same border, border-radius, background, and `height: 100%` as `.input`. Uses `justify-content: space-between` to keep badge left + ✕ right.
- `.valueBadge` — replaces `.moreCount` and `.compactLabel`. Shows **only a count** (e.g., "3 values"). No first value displayed. Uses `--ag-active-color` for background, white text, pill shape.
- `.clearButton` — `opacity: 0.5` at rest, `opacity: 1` on hover. Hover: `color: var(--ag-invalid-color); background-color: color-mix(in srgb, transparent, var(--ag-invalid-color) 10%)`. Uses `var(--ag-border-radius)` for consistent rounding.
- `.errorIcon` — `position: absolute; right: 4px; top: 50%; transform: translateY(-50%)` — small red `!` circle using `--ag-invalid-color`
- `.tooltip` — `position: absolute; bottom: calc(100% + 4px)` — floats above, `z-index: 1000; pointer-events: none`

#### AG Grid CSS Variable References

| Variable | Usage |
|----------|-------|
| `--ag-borders-input` | Border shorthand (resolves to `solid 1px`) |
| `--ag-input-border-color` | Resting border color |
| `--ag-input-focus-border-color` | Hover + focus border color |
| `--ag-input-focus-box-shadow` | Focus ring (Quartz: 3px blue glow) |
| `--ag-input-border-color-invalid` | Error border |
| `--ag-input-error-focus-box-shadow` | Error focus ring |
| `--ag-background-color` | Input background |
| `--ag-border-radius` | Corner rounding (Quartz: 4px) |
| `--ag-active-color` | Badge background (Quartz: #2196f3) |
| `--ag-invalid-color` | Error/clear hover color |
| `--ag-foreground-color` | Clear button text |

---

## Step 5 — `MultiValueFloatingFilter.tsx` (Full Rewrite)

### Component Params Interface
```ts
interface MultiValueFloatingFilterParams {
  defaultOperator?: 'OR' | 'AND'  // default: 'OR'
  debounceMs?: number              // default: 300
  maxNumConditions?: number        // mirrors filterParams.maxNumConditions
}
```
Access via: `const componentParams = props as unknown as MultiValueFloatingFilterParams` (AG Grid merges `floatingFilterComponentParams` into props).

Detect number filter: `params.column.getColDef().filter === 'agNumberColumnFilter'` — use `filterType: 'number'` + `type: 'equals'` + `filter: Number(v)`.

### State
```ts
const [inputValue, setInputValue] = useState('')
const [values, setValues] = useState<string[]>([])
const [isEditMode, setIsEditMode] = useState(true)
const [errorMsg, setErrorMsg] = useState<string | null>(null)
const [showTooltip, setShowTooltip] = useState(false)
const inputRef = useRef<HTMLInputElement>(null)
const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const lastOperatorRef = useRef<'OR' | 'AND'>('OR')
```

### `parseValues` (exported for testing)
Returns `{ ok: true; values: string[]; operator: 'OR' | 'AND' | null } | { ok: false; error: 'mixed-operators' }`.
- Detect OR: `/,|\sOR\s/i`; detect AND: `/\sAND\s/i`
- If both found → `{ ok: false, error: 'mixed-operators' }`
- Split on `/,|\sOR\s|\sAND\s/i`, trim, filter empty

### `buildFilterModel` (exported for testing)
```ts
function buildFilterModel(
  values: string[], operator: 'OR' | 'AND', isNumber: boolean
): Record<string, unknown> | null
```
- 0 values → `null`
- `filterType` = `isNumber ? 'number' : 'text'`; leaf `type` = `isNumber ? 'equals' : 'contains'`; `filter` = `isNumber ? Number(v) : v`
- 1 value → simple `{ filterType, type, filter }`
- 2 values → `condition1`/`condition2` shape + `operator`
- 3+ values → `conditions[]` shape + `operator`

### `handleChange` (debounced)
1. Update `inputValue` immediately
2. Clear debounce timer, start new 300ms timer
3. On fire: call `parseValues`, check `maxNumConditions` from `componentParams` or `filterParams`
4. Error → `setErrorMsg(...)`, `onModelChange(null)`, stay in edit mode
5. No error → `setErrorMsg(null)`, store operator in `lastOperatorRef`, call `onModelChange(buildFilterModel(...))`
6. Comma detected in raw input with ≥1 valid value → call `commitAndEnterCompactMode()` immediately (auto-switch)

### `commitAndEnterCompactMode`
Cancel debounce → re-parse → if valid values, `setValues(...)`, `setIsEditMode(false)`, `setInputValue('')`

### Exit edit mode triggers
- `onBlur` → `commitAndEnterCompactMode()`
- `onKeyDown` Enter → `commitAndEnterCompactMode()`
- `onKeyDown` Escape → `commitAndEnterCompactMode()` (commit as-is)

### `enterEditMode` (from compact → edit)
`setIsEditMode(true)` → reconstruct `inputValue` from `values.join(sep)` using `lastOperatorRef` → `setTimeout(() => inputRef.current?.focus(), 0)`

### `handleClear`
`setValues([])`, `setInputValue('')`, `setIsEditMode(true)`, `setErrorMsg(null)`, `onModelChange(null)`

### Bidirectional sync (`useEffect` on `model`)
- `model === null/undefined` → reset to empty edit mode (existing behavior)
- `model` set externally → call `extractValuesFromModel(model)` to get `string[]` → `setValues(...)`, `setIsEditMode(false)`

**`extractValuesFromModel`**: reads `filter`, `condition1`/`condition2`, or `conditions[]` back into a plain `string[]`

### JSX Structure

**Compact display**: Show only a count badge + ✕ (no first value). This prevents layout overflow regardless of column width or number of values.

```tsx
<div className={styles.wrapper}>
  {isEditMode ? (
    <input ref={inputRef} className={`${styles.input}${errorMsg ? ` ${styles.hasError}` : ''}`} ... />
  ) : (
    <div className={styles.compactDisplay} onClick={enterEditMode}>
      <span className={styles.valueBadge}>
        {values.length} {values.length === 1 ? 'value' : 'values'}
      </span>
      <button className={styles.clearButton} onClick={(e) => { e.stopPropagation(); handleClear() }}>✕</button>
    </div>
  )}
  {errorMsg && (
    <span className={styles.errorIcon} onMouseEnter={...} onMouseLeave={...} onFocus={...} onBlur={...} tabIndex={0}>
      !
      {showTooltip && <span className={styles.tooltip}>{errorMsg}</span>}
    </span>
  )}
</div>
```

---

## Step 6 — `ServerSideGrid.tsx`

In the `defaultColDef` useMemo, add before `...customDefaultColDef`:
```ts
floatingFilter: true,
filterParams: {
  maxNumConditions: 10,
  numAlwaysVisibleConditions: 2,
  defaultJoinOperator: 'OR',
},
```
> **Note:** AG Grid does NOT deep-merge `filterParams` — a column-level `filterParams` completely replaces the default. Columns using `MultiValueFloatingFilter` must re-specify `maxNumConditions: 10` in their own `filterParams` to keep AG Grid's column filter modal accepting up to 10 conditions.

---

## Step 7 — `FxCashTab.tsx`

1. Remove `defaultColDef={{ floatingFilter: true }}` from `<ServerSideGrid>` — now provided globally
2. `currencyPair` column: keep as-is (already has `MultiValueFloatingFilter` + correct `filterParams`). **Add `suppressFloatingFilterButton: false`** to show the column filter icon.
3. `buyAmount` column: add `floatingFilterComponent: MultiValueFloatingFilter`, `floatingFilterComponentParams: { defaultOperator: 'OR', debounceMs: 300 }`, **`suppressFloatingFilterButton: false`**, and explicit `filterParams: { maxNumConditions: 10, numAlwaysVisibleConditions: 2, defaultJoinOperator: 'OR' }`

> **Important:** Every column that uses `floatingFilterComponent: MultiValueFloatingFilter` must also set `suppressFloatingFilterButton: false`. Without this, AG Grid wraps the custom component in `ag-floating-filter-full-body` (full width, no filter button), making the column filter icon (▼) disappear — inconsistent with native columns.

---

## Step 8 — `FxOptionsTab.tsx`

1. Import `MultiValueFloatingFilter`
2. `currencyPair` column: add `floatingFilterComponent: MultiValueFloatingFilter` + `filterParams: { maxNumConditions: 10, numAlwaysVisibleConditions: 2, defaultJoinOperator: 'OR' }` + **`suppressFloatingFilterButton: false`**
3. `notionalAmount` column: add `floatingFilterComponent: MultiValueFloatingFilter` + same `filterParams` + `floatingFilterComponentParams: { defaultOperator: 'OR' }` + **`suppressFloatingFilterButton: false`**

---

## Step 9 — Tests (`MultiValueFloatingFilter.test.tsx`)

Use `render` from `@/test/utils`. Use `vi.useFakeTimers()` for all debounce tests.

**Test groups:**
1. `parseValues` — comma sep, OR keyword, AND keyword, mixed (error), single value, empty, whitespace-only
2. `buildFilterModel` — 0/1/2/3+ text values; 0/1/2 number values; AND operator
3. Initial render — edit mode, input visible, placeholder present
4. Debounce — `onModelChange` NOT called before 300ms; called exactly once after `vi.runAllTimers()`; rapid typing coalesces into single call
5. Compact display — after blur with 2+ values shows `"2 values"` badge + ✕ button; 1 value shows `"1 value"` badge + ✕ button
6. Edit/display toggle — clicking compact re-enters edit mode; `inputValue` reconstructed correctly
7. Clear button — `onModelChange(null)` called; edit mode restored; compact display gone; `e.stopPropagation` prevents opening edit mode
8. Error: mixed operators — error icon shown; `onModelChange(null)` called; tooltip text appears on hover
9. Error: max exceeded — with `filterParams: { maxNumConditions: 2 }`, 3 values → error; `onModelChange(null)`
10. Bidirectional sync — `model` prop `null` → reset; single-condition model → compact shows value; two-condition model → compact shows `"val1 +1 more"`
11. Number filter — column with `agNumberColumnFilter` → `onModelChange` called with `{ filterType: 'number', type: 'equals', filter: 1000000 }`
12. AND operator — `"USD/EUR AND AUD/USD"` → model has `operator: 'AND'`

---

## Verification

1. `npm run dev` — navigate to Trade Activity → FX Cash tab; confirm floating filters visible on all columns; type `"USD/EUR, AUD/USD"` in Currency Pair → rows filter; compact display shows `"2 values"` badge + ✕; click ✕ → clears
2. **Visual consistency**: custom floating filter inputs must have the same height, border, and border-radius as AG Grid's native floating filter inputs on adjacent columns. The column filter icon (▼) must appear next to the custom floating filter, identical to native columns.
3. Open column filter panel on Currency Pair → set 3 conditions manually → floating filter updates to compact display
4. Type `"USD/EUR AND AUD/USD OR GBP"` → error tooltip appears; rows not filtered
5. Navigate to FX Options tab → confirm `currencyPair` and `notionalAmount` have floating filters
6. Type `"50000, 75000"` in Buy Amount (FxCash) or Notional (FxOptions) → number rows filter
7. `npx vitest run src/components/ui/MultiValueFloatingFilter.test.tsx` — all tests pass, coverage ≥80%
8. `npm run build` — no TypeScript errors
9. `npm run lint` — no ESLint issues
