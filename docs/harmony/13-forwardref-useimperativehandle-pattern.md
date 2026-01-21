# Understanding forwardRef and useImperativeHandle in React

## Table of Contents

1. [Overview](#overview)
2. [The Problem: Why Can't Parents Access Child Refs?](#the-problem-why-cant-parents-access-child-refs)
3. [Solution 1: forwardRef](#solution-1-forwardref)
4. [Solution 2: useImperativeHandle](#solution-2-useimperativehandle)
5. [How They Work Together](#how-they-work-together)
6. [Implementation in ServerSideGrid](#implementation-in-serversidegrid)
7. [Usage Examples](#usage-examples)
8. [TypeScript Considerations](#typescript-considerations)
9. [Best Practices](#best-practices)
10. [Common Pitfalls](#common-pitfalls)

---

## Overview

In React, data flows one way: from parent to child via props. But sometimes a parent component needs to **imperatively** call methods on a child component. This is where `forwardRef` and `useImperativeHandle` come in.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA FLOW IN REACT                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   NORMAL FLOW (Declarative - Props Down)                                    │
│   ──────────────────────────────────────                                    │
│                                                                             │
│   Parent                                                                    │
│     │                                                                       │
│     │  props (data, callbacks)                                              │
│     ▼                                                                       │
│   Child                                                                     │
│                                                                             │
│                                                                             │
│   IMPERATIVE ACCESS (Using Refs)                                            │
│   ──────────────────────────────                                            │
│                                                                             │
│   Parent                                                                    │
│     │                                                                       │
│     │  ref.current.doSomething()                                            │
│     ▼                                                                       │
│   Child                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Problem: Why Can't Parents Access Child Refs?

### Refs Don't Pass Through Components

In React, `ref` is a special prop that doesn't get forwarded like normal props. If you try to pass a ref to a function component, it won't work:

```tsx
// ❌ This doesn't work!
function MyInput(props) {
  // props.ref is undefined!
  return <input ref={props.ref} />
}

function Parent() {
  const inputRef = useRef(null)

  // Trying to focus the input won't work
  const handleClick = () => {
    inputRef.current?.focus()  // inputRef.current is null!
  }

  return (
    <>
      <MyInput ref={inputRef} />
      <button onClick={handleClick}>Focus</button>
    </>
  )
}
```

### Why This Limitation Exists

React intentionally doesn't pass refs through because:

1. **Encapsulation**: Child components should be able to change their internal structure without breaking parent code
2. **Abstraction**: Parent shouldn't need to know about internal DOM elements
3. **Safety**: Prevents accidental coupling between components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE REF PROBLEM                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Parent Component                                                          │
│   ┌────────────────────────────────────────┐                               │
│   │                                        │                               │
│   │  const ref = useRef(null)              │                               │
│   │                                        │                               │
│   │  <ChildComponent ref={ref} />          │                               │
│   │                     │                  │                               │
│   └─────────────────────┼──────────────────┘                               │
│                         │                                                   │
│                         ▼                                                   │
│                    ┌─────────┐                                              │
│                    │ ref prop │  ← React IGNORES this!                      │
│                    │ is lost! │                                              │
│                    └─────────┘                                              │
│                         │                                                   │
│                         ▼                                                   │
│   Child Component (Function)                                                │
│   ┌────────────────────────────────────────┐                               │
│   │                                        │                               │
│   │  function ChildComponent(props) {      │                               │
│   │    // props.ref is UNDEFINED!          │                               │
│   │    return <input ref={props.ref} />    │                               │
│   │  }                                     │                               │
│   │                                        │                               │
│   └────────────────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Solution 1: forwardRef

`forwardRef` is a React function that lets a component receive a ref and forward it to a child.

### Basic Syntax

```tsx
const MyComponent = forwardRef((props, ref) => {
  // Now we can use ref!
  return <input ref={ref} {...props} />
})
```

### How forwardRef Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     forwardRef MECHANISM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Parent Component                                                          │
│   ┌────────────────────────────────────────┐                               │
│   │                                        │                               │
│   │  const ref = useRef(null)              │                               │
│   │                                        │                               │
│   │  <MyInput ref={ref} />                 │                               │
│   │              │                         │                               │
│   └──────────────┼─────────────────────────┘                               │
│                  │                                                          │
│                  ▼                                                          │
│            ┌───────────┐                                                    │
│            │ forwardRef │  ← Intercepts the ref                             │
│            │  wrapper   │                                                   │
│            └─────┬─────┘                                                    │
│                  │                                                          │
│                  ▼                                                          │
│   Child Component                                                           │
│   ┌────────────────────────────────────────┐                               │
│   │                                        │                               │
│   │  const MyInput = forwardRef(           │                               │
│   │    (props, ref) => {                   │  ← ref is passed as 2nd arg   │
│   │      return <input ref={ref} />        │                               │
│   │    }                                   │                               │
│   │  )                                     │                               │
│   │                                        │                               │
│   └────────────────────────────────────────┘                               │
│                                                                             │
│   Result: Parent's ref.current = <input> DOM element                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Simple Example

```tsx
import { forwardRef, useRef } from 'react'

// Child component with forwardRef
const FancyInput = forwardRef<HTMLInputElement, { label: string }>(
  (props, ref) => {
    return (
      <div>
        <label>{props.label}</label>
        <input ref={ref} className="fancy-input" />
      </div>
    )
  }
)

// Parent component
function Form() {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    // Now we can access the input!
    console.log(inputRef.current?.value)
    inputRef.current?.focus()
  }

  return (
    <>
      <FancyInput ref={inputRef} label="Name" />
      <button onClick={handleSubmit}>Submit</button>
    </>
  )
}
```

---

## Solution 2: useImperativeHandle

While `forwardRef` lets you pass a ref through, `useImperativeHandle` lets you **customize what the ref exposes** to the parent.

### The Problem with Direct DOM Access

Exposing the entire DOM element or component internals has drawbacks:

```tsx
// ❌ Exposing entire DOM element
const MyInput = forwardRef((props, ref) => {
  return <input ref={ref} />
})

// Parent can do ANYTHING to the input:
inputRef.current.style.display = 'none'  // Hide it
inputRef.current.remove()                 // Remove it from DOM!
inputRef.current.type = 'password'        // Change its type
```

### useImperativeHandle Creates a Controlled API

```tsx
// ✅ Controlled API with useImperativeHandle
const MyInput = forwardRef((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    // Only expose what parent needs
    focus: () => inputRef.current?.focus(),
    clear: () => {
      if (inputRef.current) inputRef.current.value = ''
    },
    getValue: () => inputRef.current?.value ?? '',
  }))

  return <input ref={inputRef} />
})

// Parent can only use the exposed methods:
inputRef.current.focus()              // ✅ Works
inputRef.current.clear()              // ✅ Works
inputRef.current.getValue()           // ✅ Works
inputRef.current.style.display = '...' // ❌ Error: style doesn't exist
```

### How useImperativeHandle Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     useImperativeHandle MECHANISM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Parent Component                                                          │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │  const ref = useRef<MyHandle>(null)                             │       │
│   │                                                                 │       │
│   │  // ref.current is the CUSTOM OBJECT, not DOM element          │       │
│   │  ref.current.focus()                                            │       │
│   │  ref.current.getValue()                                         │       │
│   │                                                                 │       │
│   └────────────────────────────────────────────────────────────────┘       │
│                         │                                                   │
│                         │ ref                                               │
│                         ▼                                                   │
│   Child Component                                                           │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │  const realInputRef = useRef<HTMLInputElement>(null)            │       │
│   │                                                                 │       │
│   │  useImperativeHandle(ref, () => ({                              │       │
│   │    // This object becomes ref.current in parent                 │       │
│   │    focus: () => realInputRef.current?.focus(),                  │       │
│   │    getValue: () => realInputRef.current?.value,                 │       │
│   │  }))                                                            │       │
│   │                                                                 │       │
│   │  return <input ref={realInputRef} />                            │       │
│   │                                                                 │       │
│   └────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                  │      │
│   │   Parent's ref.current = {                                       │      │
│   │     focus: [Function],     // Custom method                      │      │
│   │     getValue: [Function],  // Custom method                      │      │
│   │   }                                                              │      │
│   │                                                                  │      │
│   │   NOT:                                                           │      │
│   │   Parent's ref.current = <input> DOM element                     │      │
│   │                                                                  │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How They Work Together

### The Complete Pattern

```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react'

// 1. Define the handle interface (what parent can access)
interface MyComponentHandle {
  doSomething: () => void
  getValue: () => string
}

// 2. Define props interface
interface MyComponentProps {
  label: string
  onChange?: (value: string) => void
}

// 3. Create component with forwardRef
const MyComponent = forwardRef<MyComponentHandle, MyComponentProps>(
  (props, ref) => {
    // Internal ref to actual DOM element
    const internalRef = useRef<HTMLInputElement>(null)

    // 4. Use useImperativeHandle to customize what's exposed
    useImperativeHandle(ref, () => ({
      doSomething: () => {
        console.log('Doing something!')
        internalRef.current?.focus()
      },
      getValue: () => {
        return internalRef.current?.value ?? ''
      },
    }))

    return (
      <div>
        <label>{props.label}</label>
        <input
          ref={internalRef}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      </div>
    )
  }
)

// 5. Parent uses the component with ref
function Parent() {
  const myRef = useRef<MyComponentHandle>(null)

  const handleClick = () => {
    myRef.current?.doSomething()
    const value = myRef.current?.getValue()
    console.log('Value:', value)
  }

  return (
    <>
      <MyComponent ref={myRef} label="Enter name" />
      <button onClick={handleClick}>Do Action</button>
    </>
  )
}
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE forwardRef + useImperativeHandle FLOW                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Parent creates ref                                                     │
│      const ref = useRef<Handle>(null)                                       │
│                                                                             │
│   2. Parent passes ref to child                                             │
│      <Child ref={ref} />                                                    │
│                                                                             │
│   3. forwardRef intercepts and passes ref as 2nd argument                   │
│      forwardRef((props, ref) => { ... })                                    │
│                                                                             │
│   4. useImperativeHandle creates custom object                              │
│      useImperativeHandle(ref, () => ({ method1, method2 }))                 │
│                                                                             │
│   5. React assigns custom object to parent's ref.current                    │
│      ref.current = { method1, method2 }                                     │
│                                                                             │
│   6. Parent calls methods on ref.current                                    │
│      ref.current.method1()                                                  │
│                                                                             │
│   Timeline:                                                                 │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│   Mount Phase:                                                              │
│   [Parent render] → [Child render] → [useImperativeHandle runs]            │
│                                       → [ref.current is set]               │
│                                                                             │
│   Usage Phase:                                                              │
│   [User clicks button] → [Parent calls ref.current.method()]               │
│                        → [Method executes in child context]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation in ServerSideGrid

### The Handle Interface

```typescript
// src/components/ui/ServerSideGrid.tsx

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

  /** Show loading overlay */
  showLoadingOverlay: () => void

  /** Hide overlay */
  hideOverlay: () => void

  /** Get displayed row count */
  getDisplayedRowCount: () => number
}
```

### The Implementation

```typescript
function ServerSideGridInner<T extends object>(
  props: ServerSideGridProps<T>,
  ref: React.ForwardedRef<ServerSideGridHandle<T>>
) {
  // Internal ref to the actual AgGridReact component
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

    // ... more methods
  }))

  return (
    <AgGridReact<T>
      ref={gridRef}  // Internal ref
      // ... props
    />
  )
}

// Wrap with forwardRef and export
export const ServerSideGrid = forwardRef(ServerSideGridInner)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  ServerSideGrid ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   FxCashTab (Parent)                                                        │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │  const gridRef = useRef<ServerSideGridHandle<FxCashTrade>>()   │       │
│   │                                                                 │       │
│   │  // Can call these methods:                                     │       │
│   │  gridRef.current?.refreshData()                                 │       │
│   │  gridRef.current?.getSelectedRows()                             │       │
│   │  gridRef.current?.exportToCsv('trades.csv')                     │       │
│   │                                                                 │       │
│   │  <ServerSideGrid ref={gridRef} ... />                           │       │
│   │                                                                 │       │
│   └────────────────────────────────────────────────────────────────┘       │
│                         │                                                   │
│                         │ ref (ServerSideGridHandle)                        │
│                         ▼                                                   │
│   ServerSideGrid (Child)                                                    │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │  // Internal ref to AG Grid (not exposed)                       │       │
│   │  const gridRef = useRef<AgGridReact<T>>()                       │       │
│   │                                                                 │       │
│   │  useImperativeHandle(ref, () => ({                              │       │
│   │    // Controlled API surface                                    │       │
│   │    refreshData: () => gridRef.current?.api?.refresh...,         │       │
│   │    getSelectedRows: () => gridRef.current?.api?.getSelected..., │       │
│   │    exportToCsv: (name) => gridRef.current?.api?.exportData...,  │       │
│   │  }))                                                            │       │
│   │                                                                 │       │
│   │  <AgGridReact ref={gridRef} ... />                              │       │
│   │                                                                 │       │
│   └────────────────────────────────────────────────────────────────┘       │
│                         │                                                   │
│                         │ internal ref (AgGridReact)                        │
│                         ▼                                                   │
│   AgGridReact (Internal)                                                    │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │  AG Grid with full GridApi                                      │       │
│   │  (Hidden from parent - only accessible via handle methods)      │       │
│   │                                                                 │       │
│   └────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Usage Examples

### Basic Usage in FxCashTab

```tsx
// src/pages/app/trade-activity/block-level/FxCashTab.tsx

import { useRef } from 'react'
import { ServerSideGrid, ServerSideGridHandle } from '@/components/ui'
import type { FxCashTrade } from '@/mocks/data/fx-cash'

export function FxCashTab() {
  // Create typed ref
  const gridRef = useRef<ServerSideGridHandle<FxCashTrade>>(null)

  // Refresh data when needed
  const handleRefresh = () => {
    gridRef.current?.refreshData()
  }

  // Export functionality
  const handleExport = () => {
    gridRef.current?.exportToCsv('fx-cash-trades.csv')
  }

  // Get selected for bulk actions
  const handleBulkAction = () => {
    const selected = gridRef.current?.getSelectedRows()
    if (selected && selected.length > 0) {
      console.log('Processing', selected.length, 'trades')
      // Process selected trades...
    }
  }

  // Apply filter programmatically
  const handleFilterByStatus = (status: string) => {
    gridRef.current?.setFilterModel({
      status: {
        filterType: 'set',
        values: [status],
      },
    })
  }

  return (
    <div>
      <div className="toolbar">
        <button onClick={handleRefresh}>Refresh</button>
        <button onClick={handleExport}>Export CSV</button>
        <button onClick={handleBulkAction}>Bulk Action</button>
        <button onClick={() => handleFilterByStatus('Pending')}>
          Show Pending Only
        </button>
      </div>

      <ServerSideGrid<FxCashTrade>
        ref={gridRef}
        columnDefs={columnDefs}
        fetchUrl="/api/fx-cash"
        rowSelectionMode="multiple"
        onRowSelected={handleRowSelected}
        height="calc(100vh - 300px)"
      />
    </div>
  )
}
```

### Advanced: Cross-Component Communication

```tsx
// Parent page that coordinates multiple grids

function TradingDashboard() {
  const cashGridRef = useRef<ServerSideGridHandle<FxCashTrade>>(null)
  const optionsGridRef = useRef<ServerSideGridHandle<FxOptionTrade>>(null)

  // Refresh all grids at once
  const refreshAll = () => {
    cashGridRef.current?.refreshData()
    optionsGridRef.current?.refreshData()
  }

  // Export all data
  const exportAll = () => {
    cashGridRef.current?.exportToCsv('cash-trades.csv')
    optionsGridRef.current?.exportToCsv('options-trades.csv')
  }

  // Sync selection state
  const syncSelection = (selectedCashIds: string[]) => {
    // When cash trades are selected, find related options
    const relatedOptionIds = findRelatedOptions(selectedCashIds)
    optionsGridRef.current?.selectRowsById(relatedOptionIds)
  }

  return (
    <div className="dashboard">
      <div className="actions">
        <button onClick={refreshAll}>Refresh All</button>
        <button onClick={exportAll}>Export All</button>
      </div>

      <div className="grids">
        <ServerSideGrid<FxCashTrade>
          ref={cashGridRef}
          fetchUrl="/api/fx-cash"
          onRowSelected={(rows) => {
            syncSelection(rows.map(r => r.id))
          }}
          // ...
        />

        <ServerSideGrid<FxOptionTrade>
          ref={optionsGridRef}
          fetchUrl="/api/fx-options"
          // ...
        />
      </div>
    </div>
  )
}
```

---

## TypeScript Considerations

### Generic Component with forwardRef

The tricky part is preserving generics with forwardRef. Here's the pattern:

```typescript
// Inner function preserves the generic
function ServerSideGridInner<T extends object>(
  props: ServerSideGridProps<T>,
  ref: React.ForwardedRef<ServerSideGridHandle<T>>
) {
  // ... implementation
}

// Type assertion to preserve generic in exported component
export const ServerSideGrid = forwardRef(ServerSideGridInner) as <T extends object>(
  props: ServerSideGridProps<T> & { ref?: React.ForwardedRef<ServerSideGridHandle<T>> }
) => React.ReactElement
```

### Why This Type Assertion is Needed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              TypeScript Generic Preservation                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Problem: forwardRef loses the generic type                                │
│   ─────────────────────────────────────────────                             │
│                                                                             │
│   // Without assertion, T becomes 'unknown'                                 │
│   export const Grid = forwardRef(GridInner)                                 │
│   // Grid is: ForwardRefExoticComponent<...unknown...>                      │
│                                                                             │
│                                                                             │
│   Solution: Type assertion preserves generic                                │
│   ──────────────────────────────────────────                                │
│                                                                             │
│   export const Grid = forwardRef(GridInner) as <T>(                         │
│     props: Props<T> & { ref?: ForwardedRef<Handle<T>> }                     │
│   ) => ReactElement                                                         │
│   // Grid is: <T>(props: Props<T>) => ReactElement                          │
│                                                                             │
│                                                                             │
│   Usage works correctly:                                                    │
│   ──────────────────────                                                    │
│                                                                             │
│   // T is inferred as FxCashTrade                                           │
│   <Grid<FxCashTrade> ref={ref} columnDefs={cols} />                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Best Practices

### 1. Only Expose What's Necessary

```tsx
// ❌ Bad: Exposing everything
useImperativeHandle(ref, () => ({
  api: gridRef.current?.api,  // Exposes entire API
  gridRef: gridRef,            // Exposes internal ref
}))

// ✅ Good: Controlled API surface
useImperativeHandle(ref, () => ({
  refreshData: () => gridRef.current?.api?.refreshServerSide({ purge: true }),
  getSelectedRows: () => gridRef.current?.api?.getSelectedRows() ?? [],
}))
```

### 2. Handle Null Safety

```tsx
useImperativeHandle(ref, () => ({
  // Always handle the case where internal ref might be null
  getValue: () => {
    return inputRef.current?.value ?? ''  // Fallback to empty string
  },

  getSelectedRows: () => {
    return gridRef.current?.api?.getSelectedRows() ?? []  // Fallback to empty array
  },
}))
```

### 3. Document the Interface

```tsx
/**
 * Imperative handle for ServerSideGrid
 *
 * @example
 * ```tsx
 * const gridRef = useRef<ServerSideGridHandle<MyData>>(null)
 * gridRef.current?.refreshData()
 * ```
 */
export interface ServerSideGridHandle<T> {
  /** Refresh grid data from server */
  refreshData: (purge?: boolean) => void
  // ...
}
```

### 4. Use Specific Types

```tsx
// ❌ Vague types
interface Handle {
  doSomething: () => any
}

// ✅ Specific types
interface Handle {
  getSelectedRows: () => T[]
  setFilterModel: (model: FilterModel) => void
}
```

---

## Common Pitfalls

### 1. Forgetting to Update Dependencies

```tsx
// ❌ Missing dependency - methods use stale closure values
useImperativeHandle(ref, () => ({
  getFilteredCount: () => {
    return filteredData.length  // Uses stale filteredData!
  },
}))  // Missing dependency array!

// ✅ Include dependencies
useImperativeHandle(ref, () => ({
  getFilteredCount: () => {
    return filteredData.length
  },
}), [filteredData])  // Recreates handle when filteredData changes
```

### 2. Calling Methods Before Mount

```tsx
// ❌ Calling immediately in useEffect with empty deps
useEffect(() => {
  gridRef.current?.refreshData()  // May be null on first render!
}, [])

// ✅ Check for null or wait for ready state
useEffect(() => {
  if (gridRef.current) {
    gridRef.current.refreshData()
  }
}, [isReady])
```

### 3. Exposing Mutable Internal State

```tsx
// ❌ Exposing mutable array
useImperativeHandle(ref, () => ({
  getData: () => internalData,  // Parent can mutate this!
}))

// ✅ Return a copy
useImperativeHandle(ref, () => ({
  getData: () => [...internalData],  // Safe copy
}))
```

---

## Summary

| Concept | Purpose | When to Use |
|---------|---------|-------------|
| `forwardRef` | Pass ref through component | When parent needs any ref access to child |
| `useImperativeHandle` | Customize what ref exposes | When you want to control the API surface |
| Both together | Full control of imperative API | Reusable components with specific capabilities |

### Key Takeaways

1. **`forwardRef`** makes the ref available inside a function component
2. **`useImperativeHandle`** customizes what the parent sees in `ref.current`
3. Together, they create a **controlled imperative API** for your component
4. Always prefer **declarative props** over imperative methods when possible
5. Use TypeScript to ensure **type safety** across the ref boundary

---

## Related Documentation

- [React forwardRef Documentation](https://react.dev/reference/react/forwardRef)
- [React useImperativeHandle Documentation](https://react.dev/reference/react/useImperativeHandle)
- [AG Grid API Reference](https://www.ag-grid.com/react-data-grid/grid-api/)
- [10-ag-grid-server-side-setup.md](./10-ag-grid-server-side-setup.md)
