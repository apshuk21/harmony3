/**
 * FX Cash tab content
 * Displays FX Cash trade data using AG Grid Server-Side Row Model
 *
 * Uses Zod-validated search params from the route.
 * Reference: docs/harmony/15-zod-validation-guide.md
 */
import { useMemo, useState } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { ServerSideGrid } from '@/components/ui'
import type { FxCashTrade } from '@/mocks/data/fx-cash'
import type { FxCashSearchParams } from '@/routes/_authenticated/_app/trade-activity/block-level/fx-cash'
import styles from '@/styles/shared.module.css'
import localStyles from './FxCashTab.module.css'

/**
 * Format number as currency with commas
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format rate with 4 decimal places
 */
function formatRate(value: number): string {
  return value.toFixed(4)
}

export function FxCashTab() {
  const [selectedRows, setSelectedRows] = useState<FxCashTrade[]>([])

  // Get validated search params from URL (typed via Zod schema)
  const searchParams = useSearch({
    from: '/_authenticated/_app/trade-activity/block-level/fx-cash',
  })

  // Navigate function for updating search params
  const navigate = useNavigate({
    from: '/trade-activity/block-level/fx-cash',
  })

  // Update search params (e.g., when user changes status filter)
  const updateSearch = (updates: Partial<FxCashSearchParams>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    })
  }

  // Column definitions for FX Cash trades
  const columnDefs = useMemo<ColDef<FxCashTrade>[]>(
    () => [
      {
        field: 'tradeId',
        headerName: 'Trade ID',
        filter: 'agTextColumnFilter',
        minWidth: 130,
      },
      {
        field: 'currencyPair',
        headerName: 'Currency Pair',
        filter: 'agTextColumnFilter',
        minWidth: 130,
      },
      {
        field: 'buyCurrency',
        headerName: 'Buy CCY',
        filter: 'agTextColumnFilter',
        minWidth: 100,
      },
      {
        field: 'sellCurrency',
        headerName: 'Sell CCY',
        filter: 'agTextColumnFilter',
        minWidth: 100,
      },
      {
        field: 'buyAmount',
        headerName: 'Buy Amount',
        filter: 'agNumberColumnFilter',
        minWidth: 140,
        valueFormatter: (params: ValueFormatterParams<FxCashTrade, number>) =>
          params.value != null ? formatCurrency(params.value) : '',
      },
      {
        field: 'sellAmount',
        headerName: 'Sell Amount',
        filter: 'agNumberColumnFilter',
        minWidth: 140,
        valueFormatter: (params: ValueFormatterParams<FxCashTrade, number>) =>
          params.value != null ? formatCurrency(params.value) : '',
      },
      {
        field: 'rate',
        headerName: 'Rate',
        filter: 'agNumberColumnFilter',
        minWidth: 100,
        valueFormatter: (params: ValueFormatterParams<FxCashTrade, number>) =>
          params.value != null ? formatRate(params.value) : '',
      },
      {
        field: 'tradeDate',
        headerName: 'Trade Date',
        filter: 'agTextColumnFilter',
        minWidth: 120,
      },
      {
        field: 'valueDate',
        headerName: 'Value Date',
        filter: 'agTextColumnFilter',
        minWidth: 120,
      },
      {
        field: 'counterparty',
        headerName: 'Counterparty',
        filter: 'agTextColumnFilter',
        minWidth: 150,
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: 'agTextColumnFilter',
        minWidth: 110,
        cellStyle: (params) => {
          const statusColors: Record<string, string> = {
            Completed: '#22c55e',
            Pending: '#eab308',
            Settled: '#3b82f6',
            Cancelled: '#ef4444',
          }
          return {
            color: statusColors[params.value as string] ?? 'inherit',
            fontWeight: 500,
          }
        },
      },
      {
        field: 'trader',
        headerName: 'Trader',
        filter: 'agTextColumnFilter',
        minWidth: 130,
      },
      {
        field: 'desk',
        headerName: 'Desk',
        filter: 'agTextColumnFilter',
        minWidth: 120,
      },
    ],
    []
  )

  const handleRowSelected = (rows: FxCashTrade[]) => {
    setSelectedRows(rows)
  }

  return (
    <div className="tab-panel">
      <div className={styles.tabHeader}>
        <div className={styles.tabHeaderRow}>
          <h3 className={styles.tabTitle}>FX Cash Trades</h3>

          {/* Status filter using Zod-validated search params */}
          <div className={styles.filterControls}>
            <label htmlFor="status-filter" className={styles.filterLabel}>
              Status:
            </label>
            <select
              id="status-filter"
              className={styles.filterSelect}
              value={searchParams.status}
              onChange={(e) => updateSearch({ status: e.target.value as typeof searchParams.status })}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Search input */}
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              value={searchParams.search ?? ''}
              onChange={(e) => updateSearch({ search: e.target.value || undefined })}
            />
          </div>
        </div>

        {selectedRows.length > 0 && (
          <p className={styles.selectedCount}>
            {selectedRows.length} trade{selectedRows.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className={localStyles.gridContainer}>
        <ServerSideGrid<FxCashTrade>
          columnDefs={columnDefs}
          fetchUrl="/api/fx-cash"
          rowSelectionMode="multiple"
          onRowSelected={handleRowSelected}
          height="calc(100vh - 300px)"
          cacheBlockSize={100}
          getRowIdFromData={(data) => data.id}
        />
      </div>
    </div>
  )
}
