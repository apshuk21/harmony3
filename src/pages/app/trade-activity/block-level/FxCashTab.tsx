/**
 * FX Cash tab content
 * Displays FX Cash trade data using AG Grid Server-Side Row Model
 */
import { useMemo, useState } from 'react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { ServerSideGrid } from '@/components/ui'
import type { FxCashTrade } from '@/mocks/data/fx-cash'

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
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>FX Cash Trades</h3>
        {selectedRows.length > 0 && (
          <p style={{ margin: '8px 0 0', color: '#666' }}>
            {selectedRows.length} trade{selectedRows.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

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
  )
}
