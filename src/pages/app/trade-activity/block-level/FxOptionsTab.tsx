/**
 * FX Options tab content
 * Displays FX Options trade data using AG Grid Server-Side Row Model
 */
import { useMemo, useState } from 'react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { ServerSideGrid, MultiValueFloatingFilter } from '@/components/ui'
import type { FxOptionTrade } from '@/mocks/data/fx-options'
import styles from '@/styles/shared.module.css'
import localStyles from './FxOptionsTab.module.css'

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
 * Format price with 4 decimal places
 */
function formatPrice(value: number): string {
  return value.toFixed(4)
}

/**
 * Format Greek value with appropriate precision
 */
function formatGreek(value: number, decimals: number = 4): string {
  return value.toFixed(decimals)
}

export function FxOptionsTab() {
  const [selectedRows, setSelectedRows] = useState<FxOptionTrade[]>([])

  // Column definitions for FX Options trades
  const columnDefs = useMemo<ColDef<FxOptionTrade>[]>(
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
        filterParams: {
          maxNumConditions: 10,
          numAlwaysVisibleConditions: 2,
          defaultJoinOperator: 'OR',
        },
        floatingFilterComponent: MultiValueFloatingFilter,
        suppressFloatingFilterButton: false,
        minWidth: 130,
      },
      {
        field: 'optionType',
        headerName: 'Type',
        filter: 'agTextColumnFilter',
        minWidth: 90,
        cellStyle: (params) => ({
          color: params.value === 'Call' ? '#22c55e' : '#ef4444',
          fontWeight: 500,
        }),
      },
      {
        field: 'strikePrice',
        headerName: 'Strike',
        filter: 'agNumberColumnFilter',
        minWidth: 100,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatPrice(params.value) : '',
      },
      {
        field: 'spotPrice',
        headerName: 'Spot',
        filter: 'agNumberColumnFilter',
        minWidth: 100,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatPrice(params.value) : '',
      },
      {
        field: 'notionalAmount',
        headerName: 'Notional',
        filter: 'agNumberColumnFilter',
        filterParams: {
          maxNumConditions: 10,
          numAlwaysVisibleConditions: 2,
          defaultJoinOperator: 'OR',
        },
        floatingFilterComponent: MultiValueFloatingFilter,
        floatingFilterComponentParams: { defaultOperator: 'OR' },
        suppressFloatingFilterButton: false,
        minWidth: 140,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatCurrency(params.value) : '',
      },
      {
        field: 'premium',
        headerName: 'Premium',
        filter: 'agNumberColumnFilter',
        minWidth: 120,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatCurrency(params.value) : '',
      },
      {
        field: 'tradeDate',
        headerName: 'Trade Date',
        filter: 'agTextColumnFilter',
        minWidth: 120,
      },
      {
        field: 'expiryDate',
        headerName: 'Expiry Date',
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
            Active: '#22c55e',
            Exercised: '#3b82f6',
            Expired: '#6b7280',
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
        minWidth: 140,
      },
      {
        field: 'delta',
        headerName: 'Delta',
        filter: 'agNumberColumnFilter',
        minWidth: 90,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatGreek(params.value) : '',
      },
      {
        field: 'gamma',
        headerName: 'Gamma',
        filter: 'agNumberColumnFilter',
        minWidth: 90,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatGreek(params.value) : '',
      },
      {
        field: 'vega',
        headerName: 'Vega',
        filter: 'agNumberColumnFilter',
        minWidth: 90,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatGreek(params.value, 2) : '',
      },
      {
        field: 'theta',
        headerName: 'Theta',
        filter: 'agNumberColumnFilter',
        minWidth: 90,
        valueFormatter: (params: ValueFormatterParams<FxOptionTrade, number>) =>
          params.value != null ? formatGreek(params.value, 2) : '',
      },
    ],
    []
  )

  const handleRowSelected = (rows: FxOptionTrade[]) => {
    setSelectedRows(rows)
  }

  return (
    <div className="tab-panel">
      <div className={styles.tabHeader}>
        <h3 className={styles.tabTitle}>FX Options Trades</h3>
        {selectedRows.length > 0 && (
          <p className={styles.selectedCount}>
            {selectedRows.length} trade{selectedRows.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className={localStyles.gridContainer}>
        <ServerSideGrid<FxOptionTrade>
          columnDefs={columnDefs}
          fetchUrl="/api/fx-options"
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
