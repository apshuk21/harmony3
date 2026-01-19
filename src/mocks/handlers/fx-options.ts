/**
 * FX Options API Handlers
 *
 * MSW handlers for FX Options trade endpoints.
 * Supports AG Grid Server-Side Row Model with sorting, filtering, and pagination.
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import { http, HttpResponse, delay } from 'msw'
import { mockFxOptionsTrades } from '../data/fx-options'
import type { FxOptionTrade } from '../data/fx-options'

/**
 * AG Grid Server-Side Row Model request structure
 */
interface ServerSideRequest {
  startRow: number
  endRow: number
  sortModel: Array<{
    colId: string
    sort: 'asc' | 'desc'
  }>
  filterModel: Record<
    string,
    {
      filterType: string
      type?: string
      filter?: string | number
      filterTo?: string | number
      values?: string[]
    }
  >
}

/**
 * AG Grid Server-Side Row Model response structure
 */
interface ServerSideResponse<T> {
  rowData: T[]
  rowCount: number
}

/**
 * Apply sorting to data based on AG Grid sort model
 */
function applySorting(data: FxOptionTrade[], sortModel: ServerSideRequest['sortModel']) {
  if (!sortModel || sortModel.length === 0) return data

  return [...data].sort((a, b) => {
    for (const sort of sortModel) {
      const colId = sort.colId as keyof FxOptionTrade
      const aVal = a[colId]
      const bVal = b[colId]

      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      }

      if (comparison !== 0) {
        return sort.sort === 'asc' ? comparison : -comparison
      }
    }
    return 0
  })
}

/**
 * Apply filtering to data based on AG Grid filter model
 */
function applyFiltering(
  data: FxOptionTrade[],
  filterModel: ServerSideRequest['filterModel']
) {
  if (!filterModel || Object.keys(filterModel).length === 0) return data

  return data.filter((row) => {
    for (const [colId, filter] of Object.entries(filterModel)) {
      const value = row[colId as keyof FxOptionTrade]

      if (filter.filterType === 'text' && filter.filter) {
        const filterValue = String(filter.filter).toLowerCase()
        const cellValue = String(value).toLowerCase()

        switch (filter.type) {
          case 'contains':
            if (!cellValue.includes(filterValue)) return false
            break
          case 'notContains':
            if (cellValue.includes(filterValue)) return false
            break
          case 'equals':
            if (cellValue !== filterValue) return false
            break
          case 'notEqual':
            if (cellValue === filterValue) return false
            break
          case 'startsWith':
            if (!cellValue.startsWith(filterValue)) return false
            break
          case 'endsWith':
            if (!cellValue.endsWith(filterValue)) return false
            break
          default:
            if (!cellValue.includes(filterValue)) return false
        }
      }

      if (filter.filterType === 'number' && filter.filter !== undefined) {
        const filterValue = Number(filter.filter)
        const cellValue = Number(value)

        switch (filter.type) {
          case 'equals':
            if (cellValue !== filterValue) return false
            break
          case 'notEqual':
            if (cellValue === filterValue) return false
            break
          case 'greaterThan':
            if (cellValue <= filterValue) return false
            break
          case 'greaterThanOrEqual':
            if (cellValue < filterValue) return false
            break
          case 'lessThan':
            if (cellValue >= filterValue) return false
            break
          case 'lessThanOrEqual':
            if (cellValue > filterValue) return false
            break
          case 'inRange':
            if (filter.filterTo !== undefined) {
              if (cellValue < filterValue || cellValue > Number(filter.filterTo))
                return false
            }
            break
        }
      }

      if (filter.filterType === 'set' && filter.values) {
        if (!filter.values.includes(String(value))) return false
      }
    }
    return true
  })
}

export const fxOptionsHandlers = [
  // POST /api/fx-options - Server-Side Row Model endpoint
  http.post('/api/fx-options', async ({ request }) => {
    await delay(150)

    const body = (await request.json()) as ServerSideRequest
    const { startRow, endRow, sortModel, filterModel } = body

    // Apply filtering first
    let filteredData = applyFiltering(mockFxOptionsTrades, filterModel)

    // Then apply sorting
    filteredData = applySorting(filteredData, sortModel)

    // Get total count after filtering
    const rowCount = filteredData.length

    // Apply pagination
    const rowData = filteredData.slice(startRow, endRow)

    const response: ServerSideResponse<FxOptionTrade> = {
      rowData,
      rowCount,
    }

    return HttpResponse.json(response)
  }),

  // GET /api/fx-options/:id - Get single FX Option trade
  http.get('/api/fx-options/:id', async ({ params }) => {
    const { id } = params
    const trade = mockFxOptionsTrades.find((t) => t.id === id)

    if (!trade) {
      return HttpResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return HttpResponse.json(trade)
  }),
]
