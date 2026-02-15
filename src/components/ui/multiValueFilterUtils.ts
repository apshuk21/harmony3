/**
 * Utility functions for MultiValueFloatingFilter.
 * Kept in a separate file to satisfy react-refresh/only-export-components.
 */

interface ParseSuccess {
  ok: true
  values: string[]
  operator: 'OR' | 'AND' | null
}

interface ParseError {
  ok: false
  error: 'mixed-operators'
}

export type ParseResult = ParseSuccess | ParseError

/**
 * Parses raw input into values and detected operator.
 *
 * Rules:
 * - Comma or " OR " (case-insensitive) → operator: 'OR'
 * - " AND " (case-insensitive) → operator: 'AND'
 * - Both OR and AND present → error: 'mixed-operators'
 * - Neither → operator: null (caller should use default)
 */
export function parseValues(raw: string): ParseResult {
  const hasOr = /,|\sOR\s/i.test(raw)
  const hasAnd = /\sAND\s/i.test(raw)

  if (hasOr && hasAnd) {
    return { ok: false, error: 'mixed-operators' }
  }

  const operator: 'OR' | 'AND' | null = hasAnd ? 'AND' : hasOr ? 'OR' : null
  const values = raw
    .split(/,|\sOR\s|\sAND\s/i)
    .map((v) => v.trim())
    .filter(Boolean)

  return { ok: true, values, operator }
}

/**
 * Builds the AG Grid filter model for the given values and operator.
 *
 * Filter model shapes:
 * - 0 values  → null (clear filter)
 * - 1 value   → { filterType, type, filter }
 * - 2 values  → { filterType, operator, condition1, condition2 }
 * - 3+ values → { filterType, operator, conditions: [...] }
 */
export function buildFilterModel(
  values: string[],
  operator: 'OR' | 'AND',
  isNumber: boolean
): Record<string, unknown> | null {
  if (values.length === 0) return null

  const filterType = isNumber ? 'number' : 'text'
  const conditionType = isNumber ? 'equals' : 'contains'
  const toLeaf = (v: string) => ({
    filterType,
    type: conditionType,
    filter: isNumber ? Number(v) : v,
  })

  if (values.length === 1) {
    return toLeaf(values[0])
  }

  if (values.length === 2) {
    return {
      filterType,
      operator,
      condition1: toLeaf(values[0]),
      condition2: toLeaf(values[1]),
    }
  }

  return {
    filterType,
    operator,
    conditions: values.map(toLeaf),
  }
}

/**
 * Extracts plain string values back from a filter model (for bidirectional sync).
 */
export function extractValuesFromModel(model: Record<string, unknown>): string[] {
  if (!model) return []

  if ('conditions' in model && Array.isArray(model.conditions)) {
    return (model.conditions as Array<{ filter?: unknown }>)
      .map((c) => String(c.filter ?? ''))
      .filter(Boolean)
  }

  if ('condition1' in model && 'condition2' in model) {
    const c1 = (model.condition1 as { filter?: unknown })?.filter
    const c2 = (model.condition2 as { filter?: unknown })?.filter
    return [c1, c2].filter((v) => v != null).map(String)
  }

  if ('filter' in model && model.filter != null) {
    return [String(model.filter)]
  }

  return []
}
