/**
 * Shared multi-condition filter evaluation utilities for MSW handlers.
 * Used by fx-cash.ts and fx-options.ts to evaluate AG Grid filter models.
 */

interface SingleCondition {
  filterType: string
  type: string
  filter?: string | number
  filterTo?: string | number
  values?: string[]
}

interface TwoConditionModel {
  filterType: string
  operator: 'OR' | 'AND'
  condition1: SingleCondition
  condition2: SingleCondition
}

interface MultiConditionModel {
  filterType: string
  operator: 'OR' | 'AND'
  conditions: SingleCondition[]
}

export type ColumnFilterModel = SingleCondition | TwoConditionModel | MultiConditionModel

export function evaluateSingleCondition(rowValue: unknown, condition: SingleCondition): boolean {
  const { filterType, type, filter, filterTo, values } = condition

  if (filterType === 'text' && filter !== undefined) {
    const filterValue = String(filter).toLowerCase()
    const cellValue = String(rowValue).toLowerCase()

    switch (type) {
      case 'contains':
        return cellValue.includes(filterValue)
      case 'notContains':
        return !cellValue.includes(filterValue)
      case 'equals':
        return cellValue === filterValue
      case 'notEqual':
        return cellValue !== filterValue
      case 'startsWith':
        return cellValue.startsWith(filterValue)
      case 'endsWith':
        return cellValue.endsWith(filterValue)
      default:
        return cellValue.includes(filterValue)
    }
  }

  if (filterType === 'number' && filter !== undefined) {
    const filterValue = Number(filter)
    const cellValue = Number(rowValue)

    switch (type) {
      case 'equals':
        return cellValue === filterValue
      case 'notEqual':
        return cellValue !== filterValue
      case 'greaterThan':
        return cellValue > filterValue
      case 'greaterThanOrEqual':
        return cellValue >= filterValue
      case 'lessThan':
        return cellValue < filterValue
      case 'lessThanOrEqual':
        return cellValue <= filterValue
      case 'inRange':
        if (filterTo !== undefined) {
          return cellValue >= filterValue && cellValue <= Number(filterTo)
        }
        return true
      default:
        return true
    }
  }

  if (filterType === 'set' && values) {
    return values.includes(String(rowValue))
  }

  return true
}

export function evaluateColumnFilter(rowValue: unknown, filter: ColumnFilterModel): boolean {
  if ('condition1' in filter && 'condition2' in filter) {
    const result1 = evaluateSingleCondition(rowValue, filter.condition1)
    const result2 = evaluateSingleCondition(rowValue, filter.condition2)
    return filter.operator === 'AND' ? result1 && result2 : result1 || result2
  }

  if ('conditions' in filter && Array.isArray(filter.conditions)) {
    if (filter.operator === 'AND') {
      return filter.conditions.every((c) => evaluateSingleCondition(rowValue, c))
    }
    return filter.conditions.some((c) => evaluateSingleCondition(rowValue, c))
  }

  return evaluateSingleCondition(rowValue, filter as SingleCondition)
}
