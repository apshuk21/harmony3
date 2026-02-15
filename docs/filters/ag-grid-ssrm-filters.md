# AG Grid Filters with Server-Side Row Model (SSRM)

## The 2-Condition Limit (Default Behaviour)

By default, AG Grid's **Column Filters** (Text, Number, Date) allow a maximum of **2 conditions** joined by a single `AND` / `OR` operator. This is controlled by `maxNumConditions`, which defaults to `2`.

This means out-of-the-box you can only express queries like:

```
tradeId contains "FXC-000001" OR tradeId contains "FXC-000010"
```

You **cannot** add a third condition without changing the default.

---

## Solutions for Multi-Value Filtering

### Option 1 -- Increase `maxNumConditions` (Column Filter approach)

Set `maxNumConditions` in `filterParams` to allow more than 2 conditions.

```ts
{
  field: 'tradeId',
  headerName: 'Trade ID',
  filter: 'agTextColumnFilter',
  filterParams: {
    maxNumConditions: 10,              // allow up to 10 conditions
    numAlwaysVisibleConditions: 2,     // show 2 input rows by default
    defaultJoinOperator: 'OR',         // default the join to OR
  },
}
```

**How it works:**
- Users see additional condition rows as they fill in previous ones, up to the max.
- All join operators share the **same** value (all AND or all OR) -- you cannot mix them.
- Only the first join operator dropdown is editable; the rest follow automatically.

**Filter model sent to server (3+ conditions):**

```jsonc
{
  "tradeId": {
    "filterType": "text",
    "operator": "OR",
    "conditions": [
      { "filterType": "text", "type": "contains", "filter": "FXC-000001" },
      { "filterType": "text", "type": "contains", "filter": "FXC-000010" },
      { "filterType": "text", "type": "contains", "filter": "FXC-000011" }
    ]
  }
}
```

> When there are exactly 2 conditions, AG Grid uses `condition1` / `condition2` keys.
> When there are **3 or more**, it switches to a `conditions` array.
> The server datasource must handle both shapes.

**Relevant `filterParams` properties:**

| Property                      | Default | Description                                        |
|-------------------------------|---------|----------------------------------------------------|
| `maxNumConditions`            | `2`     | Maximum number of conditions allowed                |
| `numAlwaysVisibleConditions`  | `1`     | Number of condition rows visible by default         |
| `defaultJoinOperator`         | `'AND'` | Default join operator between conditions            |

**Docs:** https://www.ag-grid.com/react-data-grid/filter-conditions/

---

### Option 2 -- Use the Set Filter (Recommended for discrete value lists)

The **Set Filter** (`agSetColumnFilter`) works like Excel's AutoFilter -- it shows a checklist of values and the user can select/deselect any number of them. There is **no condition limit** because filtering is based on a set of selected values, not individual conditions.

```ts
{
  field: 'tradeId',
  headerName: 'Trade ID',
  filter: 'agSetColumnFilter',
  filterParams: {
    // Required for SSRM -- the grid cannot discover values on its own
    values: ['FXC-000001', 'FXC-000010', 'FXC-000011'],
  },
}
```

**Filter model sent to server:**

```jsonc
{
  "tradeId": {
    "filterType": "set",
    "values": ["FXC-000001", "FXC-000011"]  // only checked items
  }
}
```

**Key points for SSRM:**
- Values **must** be supplied explicitly (sync array or async callback) because the grid does not have access to all rows.
- Async values example:
  ```ts
  filterParams: {
    values: (params) => {
      fetch('/api/trade-ids')
        .then(res => res.json())
        .then(data => params.success(data))
    },
  }
  ```
- The `suppressClearModelOnRefreshValues` option is useful when updating filter values based on other column filters.
- Includes a built-in **Mini Filter** (search box) for narrowing down long value lists.

**Docs:** https://www.ag-grid.com/react-data-grid/filter-set/

> **Note:** The Set Filter is an AG Grid **Enterprise** feature.

---

### Option 3 -- Use the Multi Filter (Combines both approaches)

The **Multi Filter** (`agMultiColumnFilter`) wraps multiple child filters on a single column. By default it pairs a Text Filter + Set Filter, giving users both free-text search and checklist selection.

```ts
{
  field: 'tradeId',
  headerName: 'Trade ID',
  filter: 'agMultiColumnFilter',
  filterParams: {
    filters: [
      {
        filter: 'agTextColumnFilter',
        filterParams: {
          maxNumConditions: 5,
          defaultJoinOperator: 'OR',
        },
      },
      {
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['FXC-000001', 'FXC-000010', 'FXC-000011'],
        },
      },
    ],
  },
}
```

**Docs:** https://www.ag-grid.com/react-data-grid/filter-multi/

> **Note:** The Multi Filter is an AG Grid **Enterprise** feature.

---

## Recommendation

| Approach                  | Best for                                         | Enterprise? |
|---------------------------|--------------------------------------------------|-------------|
| `maxNumConditions`        | Free-text / numeric conditions beyond 2          | No          |
| Set Filter                | Picking from a known list of values              | Yes         |
| Multi Filter              | Combining free-text search + checklist on 1 col  | Yes         |

For the `tradeId` column where we have a **known list of values** (`FXC-000001`, `FXC-000010`, `FXC-000011`), the **Set Filter** is the most natural fit -- users check/uncheck IDs from a list with no condition limit.

If Enterprise features are not available, increasing `maxNumConditions` on a Text Filter with `defaultJoinOperator: 'OR'` is the community-edition alternative.

---

## SSRM Server-Side Considerations

Regardless of which filter type is used, the server must parse the `filterModel` from the SSRM request and translate it to the appropriate query. Key things to handle:

1. **Column Filters (2 conditions):** `condition1` + `condition2` + `operator`
2. **Column Filters (3+ conditions):** `conditions` array + `operator`
3. **Set Filters:** `values` array (list of selected items)
4. **Multi Filters:** `filterModels` array (one entry per child filter, `null` if inactive)

**Reference docs:**
- https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#enabling-filtering
- https://www.ag-grid.com/react-data-grid/filtering/

---

## Floating Filters and Multi-Condition Input

### The Problem

When `floatingFilter: true` is enabled and `maxNumConditions` is set to a value greater than 2, typing a string like `USD/EUR OR AUD/USD OR USD/CHF` into the floating filter input sends the **entire string** as the value of a single condition. It does **not** parse the `OR` keyword and split it into multiple conditions.

This is by design. AG Grid's built-in floating filters have two key limitations:

1. **Single-value input only** -- The floating filter text box maps directly to **one** condition in the underlying column filter. It does not parse expressions.
2. **Read-only with 2+ conditions** -- Once the underlying column filter has more than one active condition, the floating filter switches to **read-only mode** and simply displays a summary string (e.g. `USD/EUR OR AUD/USD`). It cannot be edited.

This means you **cannot** natively type a multi-value expression into a floating filter and have it apply multiple conditions.

**Docs:** https://www.ag-grid.com/react-data-grid/floating-filters/

### Solutions

#### Solution A -- Custom Floating Filter Component (Recommended)

Build a custom React floating filter that:
- Accepts a delimiter-separated input (e.g. comma `,` or ` OR `)
- Parses the input into individual values
- Calls `onModelChange()` with a properly structured multi-condition filter model

```tsx
// Example: CustomMultiValueFloatingFilter.tsx
import type { CustomFloatingFilterProps } from 'ag-grid-react';
import { useCallback, useState } from 'react';

/**
 * Custom floating filter that parses comma-separated input into
 * multiple OR conditions on the parent column filter.
 *
 * Typing "USD/EUR, AUD/USD, USD/CHF" produces 3 separate conditions.
 */
export function MultiValueFloatingFilter({ onModelChange }: CustomFloatingFilterProps) {
  const [inputValue, setInputValue] = useState('');

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);

      // Split on comma (or " OR ") and trim whitespace
      const values = raw
        .split(/,|\sOR\s/i)
        .map((v) => v.trim())
        .filter(Boolean);

      if (values.length === 0) {
        // No filter
        onModelChange(null);
      } else if (values.length === 1) {
        // Single condition
        onModelChange({
          filterType: 'text',
          type: 'contains',
          filter: values[0],
        });
      } else if (values.length === 2) {
        // Two conditions -- use condition1/condition2 shape
        onModelChange({
          filterType: 'text',
          operator: 'OR',
          condition1: { filterType: 'text', type: 'contains', filter: values[0] },
          condition2: { filterType: 'text', type: 'contains', filter: values[1] },
        });
      } else {
        // 3+ conditions -- use conditions array shape
        onModelChange({
          filterType: 'text',
          operator: 'OR',
          conditions: values.map((v) => ({
            filterType: 'text',
            type: 'contains',
            filter: v,
          })),
        });
      }
    },
    [onModelChange],
  );

  return (
    <input
      type="text"
      value={inputValue}
      onChange={onInputChange}
      placeholder="e.g. USD/EUR, AUD/USD"
      style={{ width: '100%' }}
    />
  );
}
```

**Usage in column definition:**

```ts
{
  field: 'currencyPair',
  headerName: 'Currency Pair',
  filter: 'agTextColumnFilter',
  filterParams: {
    maxNumConditions: 10,
    defaultJoinOperator: 'OR',
  },
  floatingFilterComponent: MultiValueFloatingFilter,
}
```

**Key points:**
- The component calls `onModelChange(model)` with the correct filter model shape.
- Must respect the 2-condition vs 3+-condition model difference (`condition1`/`condition2` vs `conditions` array).
- `maxNumConditions` on the parent filter must be high enough to accommodate the number of parsed values.
- Supports any delimiter -- comma, `OR` keyword, semicolon, etc.

**Docs:** https://www.ag-grid.com/react-data-grid/component-floating-filter/

#### Solution B -- Use Set Filter with Floating Filter

With the Set Filter, the floating filter shows a mini text input that narrows the checklist. While it doesn't parse expressions either, users can quickly search and check multiple values from the list. The floating filter then displays a read-only summary like `(A, B, C)`.

This avoids the parsing problem entirely -- users pick values from a list instead of typing expressions.

```ts
{
  field: 'currencyPair',
  headerName: 'Currency Pair',
  filter: 'agSetColumnFilter',
  filterParams: {
    values: ['USD/EUR', 'AUD/USD', 'USD/CHF', 'GBP/USD', /* ... */],
  },
}
```

> **Note:** Set Filter is an AG Grid **Enterprise** feature.

### Comparison

| Approach                     | Typing experience           | Parses expressions? | Enterprise? |
|------------------------------|-----------------------------|----------------------|-------------|
| Built-in floating filter     | Single value only            | No                   | No          |
| Custom floating filter       | Free-text with delimiters    | Yes (custom logic)   | No          |
| Set Filter floating filter   | Search + checklist           | N/A (pick from list) | Yes         |
