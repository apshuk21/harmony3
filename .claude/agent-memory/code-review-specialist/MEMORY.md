# Code Review Specialist Memory

## Key Project Patterns

- CSS Modules only — no inline `style` props. All scoped styles go in `.module.css` files.
- `apiFetch<T>()` from `@/lib/api/client.ts` must be used for all API calls. `ServerSideGrid.tsx` currently violates this (bare `fetch()`).
- `console.log` debug statements left in `ServerSideGrid.tsx` datasource — flag these in reviews.

## AG Grid Conventions

- Always use `ServerSideGrid<T>` wrapper; never raw `AgGridReact`.
- Custom floating filters must implement `onParentModelChanged` (via the `model` prop from `CustomFloatingFilterProps`) to stay in sync when the parent filter is reset externally.
- Three filter model shapes for SSRM text filters: single condition, 2-condition (`condition1`/`condition2`), 3+ condition (`conditions` array). Server must handle all three. See `docs/filters/ag-grid-ssrm-filters.md`.
- `maxNumConditions` must be set on the parent column filter when using a custom multi-value floating filter.

## Common Issues Found

- Unmemoized callback props passed to grid (`handleRowSelected`, `updateSearch` in FxCashTab.tsx) — wrap with `useCallback`.
- Fragile ISO date formatting with regex (`.replace(/[TZ]/g, ' ')`) — flag and replace with `Intl.DateTimeFormat`.
- `buildFilterModel` return type left as inferred — should be explicitly typed (or use `TextFilterModel` from `ag-grid-community`).

## Files of Note

- `src/components/ui/ServerSideGrid.tsx` — SSRM grid wrapper, uses bare `fetch()` (violation), has debug console logs
- `src/components/ui/MultiValueFloatingFilter.tsx` — custom floating filter for comma/OR-delimited multi-value input
- `src/components/ui/index.ts` — UI barrel file
- `src/pages/app/trade-activity/block-level/FxCashTab.tsx` — only current consumer of MultiValueFloatingFilter
- `docs/filters/ag-grid-ssrm-filters.md` — detailed guide on SSRM filter shapes and custom floating filters

## Detailed Notes

See `patterns.md` for extended notes on AG Grid filter model shapes and floating filter lifecycle.
