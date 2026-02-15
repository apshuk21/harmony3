# AG Grid Filter Architect Memory

## Key File Paths
- `src/components/ui/MultiValueFloatingFilter.tsx` — component (only exports `MultiValueFloatingFilter`)
- `src/components/ui/multiValueFilterUtils.ts` — utility functions (`parseValues`, `buildFilterModel`, `extractValuesFromModel`)
- `src/components/ui/MultiValueFloatingFilter.module.css` — CSS module for the floating filter
- `src/components/ui/index.ts` — barrel exports
- `src/mocks/handlers/filter-utils.ts` — MSW shared filter evaluation (`evaluateColumnFilter`, `evaluateSingleCondition`)
- `src/mocks/handlers/fx-cash.ts` — MSW FX Cash handler
- `src/mocks/handlers/fx-options.ts` — MSW FX Options handler
- `src/components/ui/__tests__/MultiValueFloatingFilter.test.tsx` — 39 tests

## ESLint Rules to Watch
- `react-refresh/only-export-components`: Component files must ONLY export components. Non-component exports (utility functions) must live in separate files and imported/re-exported via a separate utils file.
- `react-hooks/set-state-in-effect`: Never call `setState()` multiple times inside a `useEffect`. Use `useReducer` with a single `dispatch()` call instead — one dispatch batches all state updates.

## Filter Model Shapes
```ts
// 1 value
{ filterType: 'text'|'number', type: 'contains'|'equals', filter: string|number }

// 2 values
{ filterType, operator: 'OR'|'AND', condition1: Leaf, condition2: Leaf }

// 3+ values
{ filterType, operator: 'OR'|'AND', conditions: Leaf[] }
```

## Per-Column maxNumConditions Pattern
Pass `filterParams.maxNumConditions` in each ColDef. The `ServerSideGrid` defaultColDef sets `maxNumConditions: 10` as a global default; per-column overrides via ColDef take precedence.

## MSW Multi-Condition Filter Pattern
`filter-utils.ts` exports `evaluateColumnFilter(rowValue, filter: ColumnFilterModel)` which handles single, two-condition, and multi-condition (conditions[]) filter shapes. Import this in handlers to replace manual switch-case filtering.

## Component Architecture Decisions
- Uses `useReducer` (not multiple `useState`) to batch model-sync updates from `useEffect`
- Auto-commits to compact mode when user types a comma
- `commitAndEnterCompactMode` takes `currentInput` as a parameter (not reading from state closure) to avoid stale closures on blur/keydown handlers
- Number filter detection: reads `column.getColDef().filter === 'agNumberColumnFilter'`

See `patterns.md` for detailed implementation notes.
