# PRD: AG Grid Custom Filters — Harmony App

## 1. Overview

Enhance the AG Grid SSRM grids in Harmony with a configurable, user-friendly filtering system consisting of two synchronized filter interfaces:

1. **Column Filter** — the panel that opens when clicking the filter icon in a column header
2. **Floating Filter** — the inline input row visible directly below column headers

Both filters must stay in sync at all times: changes in one must reflect in the other.

---

## 2. Goals

- Allow users to filter by multiple values quickly via the floating filter
- Support comma-separated and operator-based (`OR`, `AND`) input in floating filters
- Make the number of filter conditions configurable (default: 10, overridable per-column)
- Provide a clean, compact floating filter UX that doesn't overflow when many values are entered
- Ensure column filter and floating filter stay bidirectionally synchronized

---

## 3. Scope

### In Scope

| Column Type | Column Filter | Multi-Value Floating Filter |
|-------------|--------------|----------------------------|
| Text        | Yes          | Yes                        |
| Number      | Yes          | Yes                        |
| Date        | Yes          | No (use AG Grid default)   |

### Out of Scope

- Date column floating filters (use AG Grid's built-in date filter)
- Set Filters with server-side value fetching
- Cross-column filter dependencies

---

## 4. Functional Requirements

### 4.1 Column Filter

| ID    | Requirement |
|-------|------------|
| CF-1  | The column filter must support multiple conditions (not just the AG Grid default of 2). |
| CF-2  | The default maximum number of conditions is **10**. |
| CF-3  | The max conditions must be configurable **per-column** via `filterParams.maxNumConditions`. If a column does not specify it, the global default (10) applies. |
| CF-4  | The `numAlwaysVisibleConditions` should default to **2** (AG Grid's default) so the filter panel isn't overwhelmed on open — additional condition rows appear as the user adds them. |
| CF-5  | The default join operator between conditions is **OR**. This must be configurable per-column via `filterParams.defaultJoinOperator`. |
| CF-6  | Text column filters must support the standard AG Grid text filter operations: `contains`, `notContains`, `equals`, `notEqual`, `startsWith`, `endsWith`, `blank`, `notBlank`. |
| CF-7  | Number column filters must support: `equals`, `notEqual`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `inRange`, `blank`, `notBlank`. |

### 4.2 Floating Filter — Input Behavior

| ID    | Requirement |
|-------|------------|
| FF-1  | Users can type **comma-separated values** in the floating filter input. Example: `USD/EUR, GBP/USD, AUD/USD`. |
| FF-2  | Users can type values separated by the **`OR` keyword** (case-insensitive). Example: `USD/EUR OR GBP/USD`. |
| FF-3  | Users can type values separated by the **`AND` keyword** (case-insensitive). Example: `value1 AND value2`. |
| FF-4  | Comma-separated values default to the **OR** operator. This default must be configurable. |
| FF-5  | Each parsed value becomes a separate condition in the underlying AG Grid filter model. |
| FF-6  | Leading/trailing whitespace in each value must be trimmed. |
| FF-7  | Empty values (e.g., `a,,b`) must be ignored. |

### 4.3 Floating Filter — Display UX

| ID    | Requirement |
|-------|------------|
| FD-1  | When **0 values** are entered, the floating filter shows an empty input with a placeholder (e.g., `"Filter..."`). |
| FD-2  | When **1 value** is entered, the floating filter displays the value as typed in the input. |
| FD-3  | When **2+ values** are entered, the floating filter switches to a **compact display** showing: the **first value** followed by a **badge** indicating the additional count (e.g., `USD/EUR` `+3 more`), and a **clear (✕) icon** to remove all values. |
| FD-4  | Clicking the **clear (✕) icon** removes all filter values, clears the floating filter input, and clears the corresponding column filter. |
| FD-5  | Clicking on the compact display (FD-3) should re-enter edit mode so the user can modify the raw input string. |
| FD-6  | The floating filter must not overflow or break the grid layout regardless of how many values are entered. |

### 4.4 Synchronization

| ID    | Requirement |
|-------|------------|
| SY-1  | When the user modifies the **floating filter**, the column filter model must update to reflect the same conditions. |
| SY-2  | When the user modifies the **column filter** (opens the panel and changes conditions), the floating filter display must update accordingly. |
| SY-3  | When the column filter is cleared (via the column menu), the floating filter must also clear. |
| SY-4  | When the floating filter is cleared (via ✕ icon), the column filter must also clear. |
| SY-5  | The filter model sent to the server must be identical regardless of whether the filter was set via the floating filter or the column filter. |

---

## 5. Filter Model Shape

The filter model must follow AG Grid's standard structure to ensure compatibility with the SSRM backend.

### Single condition

```json
{
  "filterType": "text",
  "type": "contains",
  "filter": "USD/EUR"
}
```

### Two conditions

```json
{
  "filterType": "text",
  "operator": "OR",
  "condition1": { "filterType": "text", "type": "contains", "filter": "USD/EUR" },
  "condition2": { "filterType": "text", "type": "contains", "filter": "GBP/USD" }
}
```

### Three or more conditions

```json
{
  "filterType": "text",
  "operator": "OR",
  "conditions": [
    { "filterType": "text", "type": "contains", "filter": "USD/EUR" },
    { "filterType": "text", "type": "contains", "filter": "GBP/USD" },
    { "filterType": "text", "type": "contains", "filter": "AUD/USD" }
  ]
}
```

### Number filter (single condition)

```json
{
  "filterType": "number",
  "type": "equals",
  "filter": 50000
}
```

---

## 6. Configuration API

### Global defaults (applied via `defaultColDef`)

```typescript
const defaultColDef = {
  filter: true,
  floatingFilter: true,
  filterParams: {
    maxNumConditions: 10,
    numAlwaysVisibleConditions: 2,
    defaultJoinOperator: 'OR',
  },
}
```

### Per-column override

```typescript
const columnDefs = [
  {
    field: 'tradeId',
    filter: 'agTextColumnFilter',
    filterParams: {
      maxNumConditions: 5,              // Override: only 5 for this column
      defaultJoinOperator: 'AND',       // Override: AND for this column
    },
    floatingFilterComponent: MultiValueFloatingFilter,
    floatingFilterComponentParams: {
      defaultOperator: 'AND',           // Match the column filter's operator
    },
  },
  {
    field: 'currencyPair',
    filter: 'agTextColumnFilter',
    // Inherits global defaults: maxNumConditions=10, operator=OR
    floatingFilterComponent: MultiValueFloatingFilter,
  },
]
```

---

## 7. Component Architecture

### Existing Components to Modify

| Component | File | Changes |
|-----------|------|---------|
| `MultiValueFloatingFilter` | `src/components/ui/MultiValueFloatingFilter.tsx` | Add compact display mode (pill + badge + clear icon), support `AND` operator, support number filter type, add edit/display mode toggle |
| `ServerSideGrid` | `src/components/ui/ServerSideGrid.tsx` | Update `defaultColDef` to include global filter defaults (`maxNumConditions: 10`, `defaultJoinOperator: 'OR'`) |

### MSW Handler Updates

| Handler | File | Changes |
|---------|------|---------|
| FX Cash handler | `src/mocks/handlers/fx-cash.ts` | Support multi-condition filter models (3+ conditions with `conditions` array) |
| FX Options handler | `src/mocks/handlers/fx-options.ts` | Same as above |

### Column Definition Updates

| Page | File | Changes |
|------|------|---------|
| FxCashTab | `src/pages/app/trade-activity/block-level/FxCashTab.tsx` | Apply `MultiValueFloatingFilter` to relevant text and number columns |
| FxOptionsTab | `src/pages/app/trade-activity/block-level/FxOptionsTab.tsx` | Same as above |

---

## 8. UX Mockups (Text Description)

### Floating Filter States

```
State: Empty
┌──────────────────────────────┐
│  Filter...                   │
└──────────────────────────────┘

State: Single value
┌──────────────────────────────┐
│  USD/EUR                     │
└──────────────────────────────┘

State: Multiple values (compact display)
┌──────────────────────────────┐
│  USD/EUR  [+3 more]      ✕  │
└──────────────────────────────┘

State: Edit mode (user clicked on compact display)
┌──────────────────────────────┐
│  USD/EUR, GBP/USD, AUD/USD,…│
└──────────────────────────────┘
```

---

## 9. Acceptance Criteria

1. User can enter comma-separated values in the floating filter and see matching rows filtered with OR logic.
2. User can use `OR` / `AND` keywords to separate values in the floating filter.
3. When 2+ values are entered, the floating filter collapses to show `"<first value> +N more ✕"`.
4. Clicking ✕ clears all filter values from both the floating filter and the column filter.
5. Clicking the compact display re-enters edit mode with the full raw input string.
6. Modifying conditions in the column filter panel updates the floating filter display.
7. Modifying the floating filter updates the column filter panel conditions.
8. The column filter supports up to 10 conditions by default.
9. A column can override the default max conditions (e.g., set to 5).
10. A column can override the default join operator (e.g., `AND` instead of `OR`).
11. Text and Number columns support the multi-value floating filter.
12. Date columns use AG Grid's default floating filter (no custom behavior).
13. The filter model sent to the backend is correct for 1, 2, and 3+ conditions.
14. No TypeScript errors, ESLint/Prettier compliance.
15. Tests with >= 80% coverage for the `MultiValueFloatingFilter` component.

---

## 10. Technical Constraints

- AG Grid requires all join operators in a single column filter to be the same (all OR or all AND, no mixing).
- AG Grid's filter model shape differs between 2 conditions (`condition1`/`condition2`) and 3+ conditions (`conditions` array). The component must handle both.
- The floating filter component receives `IFloatingFilterParams` from AG Grid — sync must use `params.parentFilterInstance()` and `onModelChanged()`.
- SSRM grids send the filter model to the server — the MSW handlers must correctly process multi-condition models.

---

## 11. Future Considerations

- Date column multi-value floating filters (date range lists)
- Set Filter integration with async server-side value fetching
- Saved/named filter presets
- Filter model URL serialization (persist filters in search params via TanStack Router)
