/**
 * Reusable Server-Side AG Grid Component
 *
 * A configurable AG Grid component using the Server-Side Row Model.
 * Supports sorting, filtering, pagination, row selection, and column resizing.
 *
 * Features:
 * - Server-Side Row Model for handling large datasets
 * - Configurable columns via props
 * - Built-in loading states
 * - Row selection (single/multi)
 * - Sorting and filtering
 * - Column resizing
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * <ServerSideGrid<MyDataType>
 *   columnDefs={columns}
 *   fetchUrl="/api/my-endpoint"
 *   rowSelectionMode="multiple"
 *   onRowSelected={(rows) => console.log(rows)}
 *   getRowIdFromData={(data) => data.id}
 * />
 *
 * // With ref for imperative access
 * const gridRef = useRef<ServerSideGridHandle<MyDataType>>(null)
 *
 * // Access grid operations
 * gridRef.current?.refreshData()
 * gridRef.current?.getSelectedRows()
 * gridRef.current?.exportToCsv('export.csv')
 *
 * <ServerSideGrid<MyDataType>
 *   ref={gridRef}
 *   columnDefs={columns}
 *   fetchUrl="/api/my-endpoint"
 * />
 * ```
 *
 * This component extends AgGridReactProps, so you can pass any AG Grid prop directly.
 */
import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { AgGridReactProps } from 'ag-grid-react'
import type {
  ColDef,
  GridReadyEvent,
  IServerSideDatasource,
  GetRowIdParams,
  SelectionChangedEvent,
  RowSelectionOptions,
  Module,
  GridApi,
} from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

// Register AG Grid modules globally (Enterprise for Server-Side Row Model)
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

// Combined modules for passing to grid
const modules: Module[] = [AllCommunityModule, AllEnterpriseModule]

/**
 * Server-Side request structure sent to the API
 */
export interface ServerSideRequest {
  startRow: number
  endRow: number
  sortModel: Array<{
    colId: string
    sort: 'asc' | 'desc'
  }>
  filterModel: Record<string, unknown>
}

/**
 * Server-Side response structure expected from the API
 */
export interface ServerSideResponse<T> {
  rowData: T[]
  rowCount: number
}

/**
 * Custom props specific to ServerSideGrid (not from AG Grid)
 */
export interface ServerSideGridCustomProps<T> {
  /** API endpoint URL for fetching data */
  fetchUrl: string
  /** Row selection mode: 'single', 'multiple', or undefined for no selection */
  rowSelectionMode?: 'single' | 'multiple'
  /** Callback when row selection changes */
  onRowSelected?: (selectedRows: T[]) => void
  /** Custom CSS class for the grid container */
  className?: string
  /** Grid height (default: '500px') */
  height?: string | number
  /** Simplified getRowId - just pass the data, we handle the params */
  getRowIdFromData?: (data: T) => string
}

/**
 * Props for the ServerSideGrid component
 * Extends AgGridReactProps to inherit all AG Grid props
 */
export type ServerSideGridProps<T> = ServerSideGridCustomProps<T> &
  Omit<
    AgGridReactProps<T>,
    | 'rowModelType' // Always 'serverSide' for this component
    | 'onGridReady' // We handle this internally to set up datasource
    | 'rowSelection' // Use rowSelectionMode instead (simplified API)
    | 'getRowId' // Use getRowIdFromData instead (simplified API)
    | 'onSelectionChanged' // We handle this internally
    | 'onRowSelected' // Conflicts with our custom onRowSelected callback
  >

/**
 * Imperative handle exposed to parent components via ref
 * Provides controlled access to grid operations
 */
export interface ServerSideGridHandle<T> {
  /** Get the AG Grid API instance */
  getApi: () => GridApi<T> | undefined
  /** Refresh server-side data (purge cache and reload) */
  refreshData: (purge?: boolean) => void
  /** Get currently selected rows */
  getSelectedRows: () => T[]
  /** Clear all row selections */
  clearSelection: () => void
  /** Select rows by their IDs */
  selectRowsById: (ids: string[]) => void
  /** Export data to CSV */
  exportToCsv: (fileName?: string) => void
  /** Export data to Excel */
  exportToExcel: (fileName?: string) => void
  /** Set filter model programmatically */
  setFilterModel: (filterModel: Record<string, unknown>) => void
  /** Get current filter model */
  getFilterModel: () => Record<string, unknown> | null
  /** Set sort model programmatically */
  setSortModel: (sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>) => void
  /** Get current sort model */
  getSortModel: () => Array<{ colId: string; sort: 'asc' | 'desc' | null }>
  /** Show loading overlay */
  showLoadingOverlay: () => void
  /** Hide overlay */
  hideOverlay: () => void
  /** Get displayed row count */
  getDisplayedRowCount: () => number
}

/**
 * Inner component implementation (not exported)
 */
function ServerSideGridInner<T extends object>(
  {
    // Custom props
    fetchUrl,
    rowSelectionMode,
    onRowSelected,
    className = '',
    height = '500px',
    getRowIdFromData,
    // AG Grid props with defaults
    cacheBlockSize = 100,
    rowHeight = 40,
    headerHeight = 48,
    defaultColDef: customDefaultColDef,
    // Rest of AG Grid props
    ...agGridProps
  }: ServerSideGridProps<T>,
  ref: React.ForwardedRef<ServerSideGridHandle<T>>
) {
  const gridRef = useRef<AgGridReact<T>>(null)

  // Expose imperative methods to parent via ref
  useImperativeHandle(ref, () => ({
    getApi: () => gridRef.current?.api,

    refreshData: (purge = true) => {
      gridRef.current?.api?.refreshServerSide({ purge })
    },

    getSelectedRows: () => {
      return gridRef.current?.api?.getSelectedRows() ?? []
    },

    clearSelection: () => {
      gridRef.current?.api?.deselectAll()
    },

    selectRowsById: (ids: string[]) => {
      const api = gridRef.current?.api
      if (!api) return

      api.deselectAll()
      api.forEachNode((node) => {
        if (node.data) {
          const rowId = getRowIdFromData
            ? getRowIdFromData(node.data)
            : (node.data as T & { id?: string }).id

          if (rowId && ids.includes(rowId)) {
            node.setSelected(true)
          }
        }
      })
    },

    exportToCsv: (fileName = 'export.csv') => {
      gridRef.current?.api?.exportDataAsCsv({ fileName })
    },

    exportToExcel: (fileName = 'export.xlsx') => {
      gridRef.current?.api?.exportDataAsExcel({ fileName })
    },

    setFilterModel: (filterModel: Record<string, unknown>) => {
      gridRef.current?.api?.setFilterModel(filterModel)
    },

    getFilterModel: () => {
      return gridRef.current?.api?.getFilterModel() ?? null
    },

    setSortModel: (sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>) => {
      gridRef.current?.api?.applyColumnState({
        state: sortModel.map((s) => ({ colId: s.colId, sort: s.sort })),
        defaultState: { sort: null },
      })
    },

    getSortModel: () => {
      const columnState = gridRef.current?.api?.getColumnState() ?? []
      return columnState
        .filter((col) => col.sort)
        .map((col) => ({ colId: col.colId, sort: col.sort })) as Array<{
        colId: string
        sort: 'asc' | 'desc' | null
      }>
    },

    showLoadingOverlay: () => {
      gridRef.current?.api?.showLoadingOverlay()
    },

    hideOverlay: () => {
      gridRef.current?.api?.hideOverlay()
    },

    getDisplayedRowCount: () => {
      return gridRef.current?.api?.getDisplayedRowCount() ?? 0
    },
  }))

  // Default column configuration - merge with any custom defaults
  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
      flex: 1,
      floatingFilter: true,
      filterParams: {
        maxNumConditions: 10,
        numAlwaysVisibleConditions: 2,
        defaultJoinOperator: 'OR',
      },
      ...customDefaultColDef,
    }),
    [customDefaultColDef]
  )

  // Create the server-side datasource
  const createDatasource = useCallback((): IServerSideDatasource => {
    console.log('[ServerSideGrid] Creating datasource for:', fetchUrl)
    return {
      getRows: async (params) => {
        console.log('[ServerSideGrid] getRows called:', params.request)
        const { startRow, endRow, sortModel, filterModel } = params.request

        const request: ServerSideRequest = {
          startRow: startRow ?? 0,
          endRow: endRow ?? cacheBlockSize,
          sortModel: (sortModel ?? []) as ServerSideRequest['sortModel'],
          filterModel: (filterModel ?? {}) as Record<string, unknown>,
        }

        try {
          console.log('[ServerSideGrid] Fetching:', fetchUrl, request)
          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data: ServerSideResponse<T> = await response.json()
          console.log('[ServerSideGrid] Received data:', data)

          // Supply rows to the grid
          params.success({
            rowData: data.rowData,
            rowCount: data.rowCount,
          })
        } catch (error) {
          console.error('[ServerSideGrid] Error fetching data:', error)
          params.fail()
        }
      },
    }
  }, [fetchUrl, cacheBlockSize])

  // Handle grid ready event
  const onGridReady = useCallback(
    (params: GridReadyEvent<T>) => {
      console.log('[ServerSideGrid] Grid ready, setting datasource')
      const datasource = createDatasource()
      params.api.setGridOption('serverSideDatasource', datasource)
    },
    [createDatasource]
  )

  // Handle row selection changes
  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent<T>) => {
      if (onRowSelected) {
        const selectedRows = event.api.getSelectedRows()
        onRowSelected(selectedRows)
      }
    },
    [onRowSelected]
  )

  // Row ID getter
  const getRowIdCallback = useCallback(
    (params: GetRowIdParams<T>) => {
      if (getRowIdFromData) {
        return getRowIdFromData(params.data)
      }
      // Default to 'id' field if it exists
      const data = params.data as T & { id?: string }
      return data.id ?? String(Math.random())
    },
    [getRowIdFromData]
  )

  // Selection configuration
  const selectionConfig = useMemo((): RowSelectionOptions | undefined => {
    if (!rowSelectionMode) return undefined

    return {
      mode: rowSelectionMode === 'multiple' ? 'multiRow' : 'singleRow',
      checkboxes: rowSelectionMode === 'multiple',
      headerCheckbox: rowSelectionMode === 'multiple',
    }
  }, [rowSelectionMode])

  return (
    <div
      className={`server-side-grid ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
    >
      <AgGridReact<T>
        ref={gridRef}
        modules={modules}
        theme={themeQuartz}
        // Spread AG Grid props passed from parent
        {...agGridProps}
        // Props we control/override
        defaultColDef={defaultColDef}
        rowModelType="serverSide"
        cacheBlockSize={cacheBlockSize}
        maxBlocksInCache={10}
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        rowSelection={selectionConfig}
        getRowId={getRowIdCallback}
        // Default props (can be overridden via agGridProps spread above)
        animateRows={agGridProps.animateRows ?? true}
        pagination={agGridProps.pagination ?? true}
        paginationPageSize={agGridProps.paginationPageSize ?? 20}
        paginationPageSizeSelector={agGridProps.paginationPageSizeSelector ?? [10, 20, 50, 100]}
        suppressCellFocus={agGridProps.suppressCellFocus ?? true}
        enableCellTextSelection={agGridProps.enableCellTextSelection ?? true}
        ensureDomOrder={agGridProps.ensureDomOrder ?? true}
      />
    </div>
  )
}

/**
 * Reusable AG Grid component with Server-Side Row Model
 *
 * Wrapped with forwardRef to expose imperative handle to parent components.
 * Use the ref to access grid operations like refreshData, getSelectedRows, etc.
 *
 * @example
 * ```tsx
 * const gridRef = useRef<ServerSideGridHandle<MyDataType>>(null)
 *
 * // Refresh data
 * gridRef.current?.refreshData()
 *
 * // Get selected rows
 * const selected = gridRef.current?.getSelectedRows()
 *
 * // Export to CSV
 * gridRef.current?.exportToCsv('my-export.csv')
 *
 * return (
 *   <ServerSideGrid<MyDataType>
 *     ref={gridRef}
 *     columnDefs={columns}
 *     fetchUrl="/api/data"
 *   />
 * )
 * ```
 */
export const ServerSideGrid = forwardRef(ServerSideGridInner) as <T extends object>(
  props: ServerSideGridProps<T> & { ref?: React.ForwardedRef<ServerSideGridHandle<T>> }
) => React.ReactElement

export default ServerSideGrid
