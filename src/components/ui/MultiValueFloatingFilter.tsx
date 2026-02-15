/**
 * Custom floating filter that parses delimiter-separated input into
 * multiple OR conditions on the parent column filter.
 *
 * Typing "USD/EUR, AUD/USD, USD/CHF" (or "USD/EUR OR AUD/USD OR USD/CHF")
 * produces 3 separate "contains" conditions joined by OR.
 *
 * Ref: docs/filters/ag-grid-ssrm-filters.md — "Floating Filters and Multi-Condition Input"
 * AG Grid docs: https://www.ag-grid.com/react-data-grid/component-floating-filter/
 */
import { useCallback, useEffect, useState } from 'react'
import type { CustomFloatingFilterProps } from 'ag-grid-react'

/**
 * Splits raw input on comma or " OR " (case-insensitive) into trimmed, non-empty values.
 */
function parseValues(raw: string): string[] {
  return raw
    .split(/,|\sOR\s/i)
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * Builds the AG Grid text filter model for the given values.
 *
 * - 0 values  → null (clear filter)
 * - 1 value   → simple model
 * - 2 values  → condition1/condition2 shape
 * - 3+ values → conditions array shape
 *
 * The parent column filter must have `maxNumConditions` set high enough
 * to accommodate the number of values.
 */
function buildFilterModel(values: string[]): Record<string, unknown> | null {
  if (values.length === 0) {
    return null
  }

  if (values.length === 1) {
    return {
      filterType: 'text',
      type: 'contains',
      filter: values[0],
    }
  }

  if (values.length === 2) {
    return {
      filterType: 'text',
      operator: 'OR',
      condition1: { filterType: 'text', type: 'contains', filter: values[0] },
      condition2: { filterType: 'text', type: 'contains', filter: values[1] },
    }
  }

  return {
    filterType: 'text',
    operator: 'OR',
    conditions: values.map((v) => ({
      filterType: 'text',
      type: 'contains',
      filter: v,
    })),
  }
}

export function MultiValueFloatingFilter({ onModelChange, model }: CustomFloatingFilterProps) {
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (model === null || model === undefined) {
      setInputValue('')
    }
  }, [model])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setInputValue(raw)

      const values = parseValues(raw)
      onModelChange(buildFilterModel(values))
    },
    [onModelChange]
  )

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      placeholder="e.g. USD/EUR, AUD/USD"
      style={{ width: '100%', height: '100%', padding: '0 4px', boxSizing: 'border-box' }}
    />
  )
}
