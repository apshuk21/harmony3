# AG Grid Patterns and Filter Notes

## Custom Floating Filter Lifecycle (SSRM)

A custom floating filter implementing `CustomFloatingFilterProps` must handle:

1. `onModelChange(model)` — called by the component to push a new filter model UP to AG Grid
2. `model` prop — pushed DOWN from AG Grid when the parent column filter changes (e.g., cleared via header menu)
3. The component must sync local state from the `model` prop using `useEffect` to stay in sync.

Missing `model`-driven sync is the most common bug in custom floating filter implementations.

## AG Grid Text Filter Model Shapes

Three shapes depending on condition count (all must be handled server-side):

```ts
// 0 conditions — clear filter
null

// 1 condition
{ filterType: 'text', type: 'contains', filter: 'USD/EUR' }

// 2 conditions
{
  filterType: 'text',
  operator: 'OR',
  condition1: { filterType: 'text', type: 'contains', filter: 'USD/EUR' },
  condition2: { filterType: 'text', type: 'contains', filter: 'AUD/USD' },
}

// 3+ conditions
{
  filterType: 'text',
  operator: 'OR',
  conditions: [
    { filterType: 'text', type: 'contains', filter: 'USD/EUR' },
    { filterType: 'text', type: 'contains', filter: 'AUD/USD' },
    { filterType: 'text', type: 'contains', filter: 'USD/CHF' },
  ],
}
```

Reference: `docs/filters/ag-grid-ssrm-filters.md`

## ServerSideGrid Known Technical Debt

- Uses bare `fetch()` instead of `apiFetch<T>()` — bypasses auth, request-ID headers, error classification
- Multiple `console.log` / `console.error` debug calls in the datasource `getRows` method
- Both issues are in `src/components/ui/ServerSideGrid.tsx` lines 272–313
