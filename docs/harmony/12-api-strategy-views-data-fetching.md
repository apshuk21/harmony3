# API Strategy for Views Data Fetching

## Executive Summary

This document outlines the recommended API strategy for fetching view-specific data in an enterprise post-trade application. The solution addresses the challenge of loading multiple data sources (grid configurations, row data, filters, sorting, chips, date ranges) when users switch between views.

**Recommended Approach: Hybrid Strategy with Parallel Fetching + Intelligent Caching**

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Data Sources Analysis](#data-sources-analysis)
3. [API Strategy Options](#api-strategy-options)
4. [Recommended Solution](#recommended-solution)
5. [Implementation Architecture](#implementation-architecture)
6. [Caching Strategy](#caching-strategy)
7. [Performance Considerations](#performance-considerations)
8. [Error Handling](#error-handling)
9. [Load Time Analysis](#load-time-analysis)
10. [Code Examples](#code-examples)
11. [Tab-Based Pages: Applying the Hybrid Strategy](#tab-based-pages-applying-the-hybrid-strategy)
12. [Design Decision Analysis: Why Separate /stats Endpoint?](#design-decision-analysis-why-separate-stats-endpoint)
13. [Design Decision Analysis: Parallel Calls Coupling](#design-decision-analysis-parallel-calls-coupling)

---

## Problem Statement

When a user selects a view from the dropdown, the application needs to fetch:

| Data Source | Description | Volatility | Size |
|-------------|-------------|------------|------|
| Grid Column Definitions | Column configs, widths, visibility | Low (changes rarely) | Small (~5-10KB) |
| Grid Row Data | Actual trade data | High (user interactions) | Large (50KB-500KB+) |
| Saved Filters | User's persisted filter configurations | Low | Small (~1-2KB) |
| Saved Sorting | User's persisted sort preferences | Low | Small (~500B) |
| Chips Data | Status counts (Confirmed, Pending, etc.) | Medium | Small (~1KB) |
| Date Range | Default/saved date range for the view | Low | Small (~200B) |
| View Metadata | View name, permissions, settings | Low | Small (~1KB) |

**Key Challenges:**
- Single endpoint: Higher latency, blocks entire UI
- Multiple endpoints: Network overhead, coordination complexity
- User-specific configurations: Personalization requirements
- Occasional view switching: Need responsive UX without over-engineering

---

## Data Sources Analysis

### Classification by Change Frequency

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA VOLATILITY MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STATIC (Cache Aggressively)          DYNAMIC (Fetch Fresh)                │
│   ─────────────────────────            ────────────────────                 │
│                                                                             │
│   • Column Definitions                 • Grid Row Data                      │
│   • View Metadata                      • Chips Counts                       │
│   • Date Range Defaults                                                     │
│                                                                             │
│   SEMI-STATIC (Cache with Revalidation)                                     │
│   ─────────────────────────────────────                                     │
│                                                                             │
│   • Saved Filters (user may update)                                         │
│   • Saved Sorting (user may update)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Classification by Render Dependency

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RENDER DEPENDENCY GRAPH                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CRITICAL PATH (Blocks Initial Render)                                     │
│   ─────────────────────────────────────                                     │
│   1. Column Definitions  ──► Grid can't render without columns              │
│   2. View Metadata       ──► Page title, permissions                        │
│                                                                             │
│   PROGRESSIVE (Can Load After Initial Render)                               │
│   ────────────────────────────────────────────                              │
│   3. Grid Row Data       ──► Show loading state, then populate              │
│   4. Chips Data          ──► Show skeleton, then update counts              │
│   5. Saved Filters       ──► Apply after grid is ready                      │
│   6. Saved Sorting       ──► Apply after grid is ready                      │
│   7. Date Range          ──► Can show default, then update                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Strategy Options

### Option 1: Single Monolithic Endpoint

```
GET /api/views/{viewId}/complete
```

**Response:**
```json
{
  "viewMetadata": { ... },
  "columnDefs": [ ... ],
  "rowData": [ ... ],
  "savedFilters": { ... },
  "savedSorting": [ ... ],
  "chipsData": { ... },
  "dateRange": { ... }
}
```

| Pros | Cons |
|------|------|
| Single network request | High latency (all-or-nothing) |
| Simple client implementation | Large payload size |
| Atomic data consistency | Can't show progressive UI |
| Easier to cache as unit | Backend complexity (aggregation) |
| | Wastes bandwidth on unchanged data |
| | Single point of failure |

**Verdict:** ❌ Not recommended for enterprise applications with complex views.

---

### Option 2: Multiple Independent Endpoints

```
GET /api/views/{viewId}/metadata
GET /api/views/{viewId}/columns
GET /api/views/{viewId}/filters
GET /api/views/{viewId}/sorting
GET /api/views/{viewId}/chips
GET /api/views/{viewId}/date-range
POST /api/views/{viewId}/data  (with pagination)
```

| Pros | Cons |
|------|------|
| Granular caching | Many network requests (7+) |
| Progressive loading | Coordination complexity |
| Independent failure handling | Potential waterfall if dependent |
| Smaller individual payloads | HTTP/1.1 connection limits |
| Cache individual pieces | Harder to ensure consistency |

**Verdict:** ⚠️ Good foundation but needs optimization.

---

### Option 3: Hybrid - Grouped Endpoints (Recommended)

```
GET  /api/views/{viewId}/config     → Static/semi-static data (cached)
POST /api/views/{viewId}/data       → Dynamic row data (fresh)
GET  /api/views/{viewId}/stats      → Chips counts (fresh or short cache)
```

| Pros | Cons |
|------|------|
| Balanced network requests (3) | Slightly more complex than single endpoint |
| Logical grouping by volatility | Need to manage 3 responses |
| Optimal caching strategy | |
| Progressive rendering | |
| Parallel fetching possible | |
| Graceful degradation | |

**Verdict:** ✅ **Recommended for enterprise applications.**

---

## Recommended Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HYBRID API STRATEGY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Selects View                                                         │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────┐         │
│   │              PARALLEL REQUEST ORCHESTRATION                   │         │
│   │                                                               │         │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │         │
│   │   │   CONFIG    │  │    DATA     │  │    STATS    │         │         │
│   │   │  Endpoint   │  │  Endpoint   │  │  Endpoint   │         │         │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │         │
│   │          │                │                │                 │         │
│   │          ▼                ▼                ▼                 │         │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │         │
│   │   │ Cache First │  │ Network     │  │ Stale While │         │         │
│   │   │ (Long TTL)  │  │ Only        │  │ Revalidate  │         │         │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │         │
│   │          │                │                │                 │         │
│   └──────────┼────────────────┼────────────────┼─────────────────┘         │
│              │                │                │                            │
│              ▼                ▼                ▼                            │
│   ┌──────────────────────────────────────────────────────────────┐         │
│   │                    RENDER ORCHESTRATION                       │         │
│   │                                                               │         │
│   │   Phase 1: Config Ready → Render Grid Shell + Columns         │         │
│   │   Phase 2: Stats Ready  → Update Chips                        │         │
│   │   Phase 3: Data Ready   → Populate Grid Rows                  │         │
│   │                                                               │         │
│   └──────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Endpoint Specifications

#### 1. Configuration Endpoint (Static + Semi-Static)

```
GET /api/views/{viewId}/config
```

**Response:**
```json
{
  "viewId": "fx-cash-default",
  "viewName": "Default View",
  "version": "1.2.3",
  "lastModified": "2024-01-15T10:30:00Z",

  "metadata": {
    "description": "Standard FX Cash trading view",
    "permissions": ["read", "filter", "export"],
    "owner": "system"
  },

  "columnDefs": [
    {
      "field": "tradeId",
      "headerName": "Trade ID",
      "width": 150,
      "filter": "agTextColumnFilter",
      "sortable": true,
      "pinned": "left"
    }
    // ... more columns
  ],

  "savedFilters": {
    "default": { /* filter model */ },
    "custom": [ /* user's saved filters */ ]
  },

  "savedSorting": [
    { "colId": "tradeDate", "sort": "desc" }
  ],

  "dateRange": {
    "type": "relative",
    "value": "last_7_days",
    "start": "2024-01-08",
    "end": "2024-01-15"
  }
}
```

**Caching Strategy:**
- Cache-Control: `max-age=300, stale-while-revalidate=3600`
- ETag-based validation
- Invalidate on user config change

---

#### 2. Data Endpoint (Dynamic)

```
POST /api/views/{viewId}/data
```

**Request:**
```json
{
  "startRow": 0,
  "endRow": 100,
  "sortModel": [{ "colId": "tradeDate", "sort": "desc" }],
  "filterModel": {
    "status": { "filterType": "set", "values": ["Confirmed", "Pending"] }
  },
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-15"
  }
}
```

**Response:**
```json
{
  "rowData": [ /* trade objects */ ],
  "rowCount": 1250,
  "lastUpdated": "2024-01-15T14:32:00Z"
}
```

**Caching Strategy:**
- No caching (always fresh)
- Consider short cache (30s) for pagination within same filter state

---

#### 3. Stats Endpoint (Semi-Dynamic)

```
GET /api/views/{viewId}/stats?dateStart=2024-01-01&dateEnd=2024-01-15
```

**Response:**
```json
{
  "chips": {
    "confirmed": { "count": 7, "label": "Confirmed" },
    "pending": { "count": 32, "label": "Pending" },
    "rejected": { "count": 1, "label": "Rejected" },
    "history": { "count": 6, "label": "History" }
  },
  "totalRecords": 46,
  "lastUpdated": "2024-01-15T14:30:00Z"
}
```

**Caching Strategy:**
- Cache-Control: `max-age=30, stale-while-revalidate=60`
- Invalidate on data mutation

---

## Implementation Architecture

### Frontend Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TANSTACK QUERY IMPLEMENTATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   // Query Keys Structure                                                   │
│   const queryKeys = {                                                       │
│     views: {                                                                │
│       all: ['views'] as const,                                              │
│       config: (viewId: string) => ['views', viewId, 'config'] as const,    │
│       data: (viewId: string, params: DataParams) =>                        │
│         ['views', viewId, 'data', params] as const,                        │
│       stats: (viewId: string, dateRange: DateRange) =>                     │
│         ['views', viewId, 'stats', dateRange] as const,                    │
│     }                                                                       │
│   }                                                                         │
│                                                                             │
│   // Parallel Queries with useQueries                                       │
│   const results = useQueries({                                              │
│     queries: [                                                              │
│       {                                                                     │
│         queryKey: queryKeys.views.config(viewId),                          │
│         queryFn: () => fetchViewConfig(viewId),                            │
│         staleTime: 5 * 60 * 1000,  // 5 minutes                            │
│         gcTime: 30 * 60 * 1000,    // 30 minutes                           │
│       },                                                                    │
│       {                                                                     │
│         queryKey: queryKeys.views.stats(viewId, dateRange),                │
│         queryFn: () => fetchViewStats(viewId, dateRange),                  │
│         staleTime: 30 * 1000,      // 30 seconds                           │
│       },                                                                    │
│     ]                                                                       │
│   })                                                                        │
│                                                                             │
│   // Separate query for data (depends on config for initial sort/filter)   │
│   const dataQuery = useQuery({                                             │
│     queryKey: queryKeys.views.data(viewId, dataParams),                    │
│     queryFn: () => fetchViewData(viewId, dataParams),                      │
│     enabled: !!configQuery.data,  // Wait for config                       │
│     staleTime: 0,                 // Always fetch fresh                    │
│   })                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPONENT HIERARCHY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   <ViewContainer viewId={selectedView}>                                     │
│     │                                                                       │
│     ├── <ViewHeader>                                                        │
│     │     ├── <ViewSelector />           ← Triggers view change            │
│     │     ├── <DateRangePicker />        ← From config, updates stats/data │
│     │     └── <ActionButtons />                                             │
│     │                                                                       │
│     ├── <ChipsBar>                                                          │
│     │     └── <StatusChip />             ← From stats endpoint             │
│     │         (shows skeleton while loading)                                │
│     │                                                                       │
│     └── <GridContainer>                                                     │
│           ├── <FilterBar />              ← From config.savedFilters        │
│           └── <ServerSideGrid>           ← columnDefs from config          │
│               (shows loading overlay while data loads)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Caching Strategy

### Multi-Layer Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CACHING LAYERS                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Layer 1: Browser Cache (HTTP Cache)                                       │
│   ────────────────────────────────────                                      │
│   • Config endpoint: Cache-Control headers                                  │
│   • ETag for conditional requests                                           │
│   • Reduces network for unchanged configs                                   │
│                                                                             │
│   Layer 2: TanStack Query Cache (Memory)                                    │
│   ──────────────────────────────────────                                    │
│   • Instant access for recent queries                                       │
│   • Automatic background revalidation                                       │
│   • Shared across components                                                │
│                                                                             │
│   Layer 3: Persistent Cache (Optional - IndexedDB)                          │
│   ────────────────────────────────────────────────                          │
│   • Survives page refresh                                                   │
│   • Useful for large column definitions                                     │
│   • Consider for offline support                                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    CACHE TTL RECOMMENDATIONS                     │      │
│   ├─────────────────────────────────────────────────────────────────┤      │
│   │  Data Source        │ staleTime    │ gcTime       │ HTTP Cache  │      │
│   ├─────────────────────┼──────────────┼──────────────┼─────────────┤      │
│   │  View Config        │ 5 minutes    │ 30 minutes   │ 5 min + SWR │      │
│   │  Stats/Chips        │ 30 seconds   │ 5 minutes    │ 30s + SWR   │      │
│   │  Row Data           │ 0 (always)   │ 5 minutes    │ No cache    │      │
│   │  View List          │ 10 minutes   │ 60 minutes   │ 10 min      │      │
│   └─────────────────────┴──────────────┴──────────────┴─────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Strategy

```typescript
// When user saves filter configuration
queryClient.invalidateQueries({
  queryKey: queryKeys.views.config(viewId)
})

// When user performs action that changes data
queryClient.invalidateQueries({
  queryKey: queryKeys.views.stats(viewId)
})
queryClient.invalidateQueries({
  queryKey: queryKeys.views.data(viewId)
})

// Optimistic update for better UX
queryClient.setQueryData(
  queryKeys.views.stats(viewId, dateRange),
  (old) => ({
    ...old,
    chips: {
      ...old.chips,
      confirmed: { ...old.chips.confirmed, count: old.chips.confirmed.count + 1 }
    }
  })
)
```

---

## Performance Considerations

### Request Waterfall Prevention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AVOIDING WATERFALL REQUESTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ❌ BAD: Sequential (Waterfall)                                            │
│   ──────────────────────────────                                            │
│                                                                             │
│   Time ──────────────────────────────────────────────────────────────►     │
│                                                                             │
│   Config   ████████████                                                     │
│   Stats                 ████████                                            │
│   Data                           ████████████████████                       │
│                                                                             │
│   Total: ~1500ms                                                            │
│                                                                             │
│   ✅ GOOD: Parallel with Smart Dependencies                                 │
│   ──────────────────────────────────────────                                │
│                                                                             │
│   Time ──────────────────────────────────────────────────────────────►     │
│                                                                             │
│   Config   ████████████                                                     │
│   Stats    ████████                                                         │
│   Data             ████████████████████  (starts after config ready)        │
│                                                                             │
│   Total: ~800ms (Config + Data, Stats parallel)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prefetching Strategy

```typescript
// Prefetch on hover over view dropdown option
const handleViewHover = (viewId: string) => {
  // Prefetch config (likely to be needed)
  queryClient.prefetchQuery({
    queryKey: queryKeys.views.config(viewId),
    queryFn: () => fetchViewConfig(viewId),
    staleTime: 5 * 60 * 1000,
  })
}

// Prefetch adjacent views on initial load
const prefetchAdjacentViews = (currentViewId: string, allViews: View[]) => {
  const currentIndex = allViews.findIndex(v => v.id === currentViewId)
  const adjacentViews = allViews.slice(
    Math.max(0, currentIndex - 1),
    Math.min(allViews.length, currentIndex + 2)
  )

  adjacentViews.forEach(view => {
    if (view.id !== currentViewId) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.views.config(view.id),
        queryFn: () => fetchViewConfig(view.id),
      })
    }
  })
}
```

---

## Error Handling

### Graceful Degradation Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING MATRIX                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Endpoint Failed    │ User Experience                │ Recovery Action     │
│   ───────────────────┼────────────────────────────────┼────────────────────│
│   Config             │ Show error, can't render grid  │ Retry with backoff │
│   Stats              │ Show "--" in chips, grid works │ Silent retry       │
│   Data               │ Show empty grid with message   │ Retry button       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    FALLBACK HIERARCHY                            │      │
│   ├─────────────────────────────────────────────────────────────────┤      │
│   │                                                                  │      │
│   │   1. Fresh Data (Network)                                        │      │
│   │          ↓ (if fails)                                            │      │
│   │   2. Stale Cache (TanStack Query)                                │      │
│   │          ↓ (if not available)                                    │      │
│   │   3. Persistent Cache (IndexedDB)                                │      │
│   │          ↓ (if not available)                                    │      │
│   │   4. Default Config (Bundled fallback)                           │      │
│   │          ↓ (if critical failure)                                 │      │
│   │   5. Error State with Retry                                      │      │
│   │                                                                  │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
const { data: config, error: configError, isLoading: configLoading } = useQuery({
  queryKey: queryKeys.views.config(viewId),
  queryFn: () => fetchViewConfig(viewId),
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  // Use stale data while retrying
  staleTime: 5 * 60 * 1000,
  // Fallback to default config
  placeholderData: (previousData) => previousData ?? defaultViewConfig,
})

// Partial failure handling
const renderGrid = () => {
  if (configError && !config) {
    return <ErrorState onRetry={() => refetch()} />
  }

  return (
    <ServerSideGrid
      columnDefs={config?.columnDefs ?? defaultColumnDefs}
      // ... other props
    />
  )
}
```

---

## Load Time Analysis

### Target: 1-3 Seconds (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    1-3 SECOND LOAD TIME BREAKDOWN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Phase 1: Initial Render (0-200ms)                                         │
│   ─────────────────────────────────                                         │
│   • React component mount                                                   │
│   • Show loading skeletons                                                  │
│   • Fire parallel API requests                                              │
│                                                                             │
│   Phase 2: Config Ready (200-500ms)                                         │
│   ────────────────────────────────                                          │
│   • Config endpoint responds (or cache hit)                                 │
│   • Render grid shell with columns                                          │
│   • Apply saved filters/sorting to UI                                       │
│   • Show grid loading overlay                                               │
│                                                                             │
│   Phase 3: Stats Ready (300-600ms)                                          │
│   ───────────────────────────────                                           │
│   • Stats endpoint responds                                                 │
│   • Update chips with counts                                                │
│   • Remove chips skeleton                                                   │
│                                                                             │
│   Phase 4: Data Ready (500-2000ms)                                          │
│   ────────────────────────────────                                          │
│   • Data endpoint responds                                                  │
│   • Populate grid rows                                                      │
│   • Remove loading overlay                                                  │
│   • Grid fully interactive                                                  │
│                                                                             │
│   Timeline:                                                                 │
│   0ms        500ms       1000ms      1500ms      2000ms      2500ms        │
│   │──────────│───────────│───────────│───────────│───────────│            │
│   ▼          ▼           ▼           ▼           ▼           ▼            │
│   ┌──────────┬───────────┬───────────┬───────────┐                        │
│   │ Skeleton │Grid Shell │Chips Done │Data Done  │ FULLY LOADED          │
│   └──────────┴───────────┴───────────┴───────────┘                        │
│                                                                             │
│   User perceives: "Fast initial response, progressive completion"           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comparison: 3-5 Seconds Load Time

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    3-5 SECOND LOAD TIME ANALYSIS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PROS:                                                                     │
│   ─────                                                                     │
│   • Simpler implementation (can use single endpoint)                        │
│   • Less code complexity                                                    │
│   • Guaranteed data consistency                                             │
│   • Easier testing                                                          │
│   • Lower server load (fewer requests)                                      │
│                                                                             │
│   CONS:                                                                     │
│   ─────                                                                     │
│   • Poor perceived performance (feels slow)                                 │
│   • User may think app is frozen                                            │
│   • Higher bounce rate on view switches                                     │
│   • Frustrating for frequent view switchers                                 │
│   • Below enterprise UX standards                                           │
│   • Users may start clicking repeatedly                                     │
│                                                                             │
│   WHEN ACCEPTABLE:                                                          │
│   ────────────────                                                          │
│   • Complex analytical dashboards with heavy computations                   │
│   • Report generation (user expects wait)                                   │
│   • Initial app load (with progress indicator)                              │
│   • Batch operations                                                        │
│                                                                             │
│   MITIGATION STRATEGIES (if 3-5s unavoidable):                              │
│   ────────────────────────────────────────────                              │
│   • Show progress bar with stages                                           │
│   • Display loading messages ("Loading trades...", "Applying filters...")   │
│   • Allow cancellation                                                      │
│   • Consider background loading for non-active views                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Budget

| Metric | Target (1-3s) | Acceptable (3-5s) |
|--------|---------------|-------------------|
| Time to First Paint | < 200ms | < 500ms |
| Time to Grid Shell | < 500ms | < 1500ms |
| Time to Interactive | < 2000ms | < 4000ms |
| Time to Full Load | < 3000ms | < 5000ms |

---

## Code Examples

### Complete Hook Implementation

```typescript
// src/hooks/useViewData.ts

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

interface ViewConfig {
  viewId: string
  viewName: string
  columnDefs: ColDef[]
  savedFilters: FilterModel
  savedSorting: SortModel[]
  dateRange: DateRange
}

interface ViewStats {
  chips: Record<string, { count: number; label: string }>
  totalRecords: number
}

interface ViewDataParams {
  startRow: number
  endRow: number
  sortModel: SortModel[]
  filterModel: FilterModel
  dateRange: DateRange
}

// Query key factory
export const viewQueryKeys = {
  all: ['views'] as const,
  lists: () => [...viewQueryKeys.all, 'list'] as const,
  config: (viewId: string) => [...viewQueryKeys.all, viewId, 'config'] as const,
  stats: (viewId: string, dateRange: DateRange) =>
    [...viewQueryKeys.all, viewId, 'stats', dateRange] as const,
  data: (viewId: string, params: ViewDataParams) =>
    [...viewQueryKeys.all, viewId, 'data', params] as const,
}

// API functions
const fetchViewConfig = async (viewId: string): Promise<ViewConfig> => {
  const response = await fetch(`/api/views/${viewId}/config`)
  if (!response.ok) throw new Error('Failed to fetch view config')
  return response.json()
}

const fetchViewStats = async (viewId: string, dateRange: DateRange): Promise<ViewStats> => {
  const params = new URLSearchParams({
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
  })
  const response = await fetch(`/api/views/${viewId}/stats?${params}`)
  if (!response.ok) throw new Error('Failed to fetch view stats')
  return response.json()
}

const fetchViewData = async (viewId: string, params: ViewDataParams): Promise<GridData> => {
  const response = await fetch(`/api/views/${viewId}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Failed to fetch view data')
  return response.json()
}

// Main hook
export function useViewData(viewId: string, dateRange: DateRange) {
  const queryClient = useQueryClient()

  // Parallel fetch of config and stats
  const [configQuery, statsQuery] = useQueries({
    queries: [
      {
        queryKey: viewQueryKeys.config(viewId),
        queryFn: () => fetchViewConfig(viewId),
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 30 * 60 * 1000,    // 30 minutes
      },
      {
        queryKey: viewQueryKeys.stats(viewId, dateRange),
        queryFn: () => fetchViewStats(viewId, dateRange),
        staleTime: 30 * 1000,      // 30 seconds
        gcTime: 5 * 60 * 1000,     // 5 minutes
      },
    ],
  })

  // Derive initial data params from config
  const initialDataParams = useMemo((): ViewDataParams | null => {
    if (!configQuery.data) return null
    return {
      startRow: 0,
      endRow: 100,
      sortModel: configQuery.data.savedSorting,
      filterModel: configQuery.data.savedFilters,
      dateRange,
    }
  }, [configQuery.data, dateRange])

  // Prefetch function for view hover
  const prefetchView = (targetViewId: string) => {
    queryClient.prefetchQuery({
      queryKey: viewQueryKeys.config(targetViewId),
      queryFn: () => fetchViewConfig(targetViewId),
      staleTime: 5 * 60 * 1000,
    })
  }

  // Invalidate data on user action
  const invalidateData = () => {
    queryClient.invalidateQueries({
      queryKey: viewQueryKeys.stats(viewId, dateRange),
    })
  }

  return {
    // Config
    config: configQuery.data,
    configLoading: configQuery.isLoading,
    configError: configQuery.error,

    // Stats
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,

    // Initial params for grid
    initialDataParams,

    // Actions
    prefetchView,
    invalidateData,

    // Combined loading state
    isInitialLoading: configQuery.isLoading,
  }
}
```

### View Container Component

```typescript
// src/components/ViewContainer.tsx

import { useState, useCallback } from 'react'
import { useViewData } from '@/hooks/useViewData'
import { ServerSideGrid } from '@/components/ui/ServerSideGrid'

export function ViewContainer({ viewId }: { viewId: string }) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: '2024-01-01',
    end: '2024-01-15',
  })

  const {
    config,
    configLoading,
    configError,
    stats,
    statsLoading,
    initialDataParams,
    prefetchView,
  } = useViewData(viewId, dateRange)

  // Handle view selection change
  const handleViewChange = useCallback((newViewId: string) => {
    // Navigation will trigger re-render with new viewId
    navigate(`/views/${newViewId}`)
  }, [])

  // Handle view hover for prefetching
  const handleViewHover = useCallback((targetViewId: string) => {
    prefetchView(targetViewId)
  }, [prefetchView])

  // Error state
  if (configError && !config) {
    return (
      <ErrorState
        message="Failed to load view configuration"
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="view-container">
      {/* Header with view selector */}
      <ViewHeader
        currentView={viewId}
        onViewChange={handleViewChange}
        onViewHover={handleViewHover}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Chips bar */}
      <ChipsBar
        chips={stats?.chips}
        loading={statsLoading}
      />

      {/* Grid */}
      {configLoading ? (
        <GridSkeleton />
      ) : config ? (
        <ServerSideGrid
          columnDefs={config.columnDefs}
          fetchUrl={`/api/views/${viewId}/data`}
          defaultColDef={config.defaultColDef}
          initialSortModel={config.savedSorting}
          initialFilterModel={config.savedFilters}
        />
      ) : null}
    </div>
  )
}
```

---

## Summary

### Recommended Approach

1. **Use 3 grouped endpoints** organized by data volatility:
   - `/config` - Static configuration (cached aggressively)
   - `/data` - Dynamic row data (fresh on each request)
   - `/stats` - Semi-dynamic counts (short cache)

2. **Fetch in parallel** where possible, with smart dependencies

3. **Implement progressive rendering**:
   - Grid shell appears first
   - Chips populate independently
   - Data loads last

4. **Layer caching strategically**:
   - HTTP cache for configs
   - TanStack Query for memory cache
   - Optional IndexedDB for persistence

5. **Target 1-3 second load time** with progressive feedback

### Key Benefits

| Benefit | Impact |
|---------|--------|
| Perceived Performance | Users see immediate response |
| Network Efficiency | Only fetch what changed |
| Resilience | Partial failures don't block UI |
| Scalability | Independent scaling of endpoints |
| Developer Experience | Clear separation of concerns |
| User Experience | Progressive, responsive interface |

---

## Tab-Based Pages: Applying the Hybrid Strategy

### Overview

In the application, we have tab-based pages like **FX Trade Confirmations** with tabs for "FX Cash" and "FX Options". The question is: **Does the hybrid 3-endpoint strategy still work for tabs?**

**Answer: Yes, with modifications.** The strategy adapts well to tabs, but the endpoint structure needs to account for the page-tab-view hierarchy.

---

### Page vs Tab vs View Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAGE → TAB → VIEW HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   FX Trade Confirmations (Page)                                             │
│   │                                                                         │
│   ├── FX Cash (Tab)                                                         │
│   │     ├── Default View                                                    │
│   │     ├── My Custom View                                                  │
│   │     └── Settlement View                                                 │
│   │                                                                         │
│   └── FX Options (Tab)                                                      │
│         ├── Default View                                                    │
│         ├── Greeks View                                                     │
│         └── Expiry View                                                     │
│                                                                             │
│   Each level has different data characteristics:                            │
│                                                                             │
│   PAGE LEVEL:                                                               │
│   • Page metadata (title, permissions)                                      │
│   • Available tabs list                                                     │
│   • Shared filters (date range applies to all tabs)                         │
│                                                                             │
│   TAB LEVEL:                                                                │
│   • Tab-specific column definitions                                         │
│   • Tab-specific data source/endpoint                                       │
│   • Tab-specific chips (status counts)                                      │
│   • Available views for this tab                                            │
│                                                                             │
│   VIEW LEVEL:                                                               │
│   • View-specific column visibility/order                                   │
│   • View-specific saved filters                                             │
│   • View-specific saved sorting                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Adapted Endpoint Structure for Tabs

#### Option A: Tab-Aware Endpoints (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAB-AWARE ENDPOINT STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Endpoint 1: Page + Tab Configuration                                      │
│   ──────────────────────────────────────                                    │
│   GET /api/pages/{pageId}/tabs/{tabId}/views/{viewId}/config                │
│                                                                             │
│   Returns:                                                                  │
│   {                                                                         │
│     "page": { "title": "FX Trade Confirmations", ... },                     │
│     "tab": { "id": "fx-cash", "label": "FX Cash", ... },                   │
│     "view": {                                                               │
│       "viewId": "default",                                                  │
│       "columnDefs": [...],                                                  │
│       "savedFilters": {...},                                                │
│       "savedSorting": [...]                                                 │
│     },                                                                      │
│     "availableTabs": ["fx-cash", "fx-options"],                            │
│     "availableViews": ["default", "custom-1", "settlement"]                │
│   }                                                                         │
│                                                                             │
│   Endpoint 2: Tab Data                                                      │
│   ────────────────────                                                      │
│   POST /api/pages/{pageId}/tabs/{tabId}/data                                │
│                                                                             │
│   Request: { startRow, endRow, sortModel, filterModel, dateRange }          │
│   Returns: { rowData, rowCount }                                            │
│                                                                             │
│   Endpoint 3: Tab Stats (Chips)                                             │
│   ─────────────────────────────                                             │
│   GET /api/pages/{pageId}/tabs/{tabId}/stats?dateStart=...&dateEnd=...      │
│                                                                             │
│   Returns: { chips: { confirmed: 7, pending: 32, ... } }                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Option B: Simplified Tab Endpoints

If the view is always implied by the tab context:

```
GET  /api/tabs/{tabId}/config?viewId={viewId}   → Config for tab + view
POST /api/tabs/{tabId}/data                      → Grid data
GET  /api/tabs/{tabId}/stats                     → Chips counts
```

---

### Tab Switching Scenarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAB SWITCHING SCENARIOS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   SCENARIO 1: User switches from FX Cash → FX Options (same page)           │
│   ─────────────────────────────────────────────────────────────────         │
│                                                                             │
│   What changes:                                                             │
│   • Column definitions (different fields for options vs cash)               │
│   • Grid data (different data source)                                       │
│   • Chips counts (different status distribution)                            │
│   • Available views (each tab has its own views)                            │
│                                                                             │
│   What stays the same:                                                      │
│   • Page metadata                                                           │
│   • Date range selection (shared across tabs)                               │
│   • User's general preferences                                              │
│                                                                             │
│   API calls needed:                                                         │
│   ┌───────────────────────────────────────────────────────────────┐        │
│   │ 1. GET  /tabs/fx-options/config    (fetch new config)         │        │
│   │ 2. POST /tabs/fx-options/data      (fetch new data)           │        │
│   │ 3. GET  /tabs/fx-options/stats     (fetch new stats)          │        │
│   └───────────────────────────────────────────────────────────────┘        │
│                                                                             │
│                                                                             │
│   SCENARIO 2: User switches views within same tab                           │
│   ───────────────────────────────────────────────                           │
│                                                                             │
│   What changes:                                                             │
│   • Column visibility/order                                                 │
│   • Saved filters                                                           │
│   • Saved sorting                                                           │
│                                                                             │
│   What stays the same:                                                      │
│   • Base column definitions (same fields)                                   │
│   • Chips counts (same data, different view)                                │
│   • Page and tab metadata                                                   │
│                                                                             │
│   API calls needed:                                                         │
│   ┌───────────────────────────────────────────────────────────────┐        │
│   │ 1. GET  /tabs/fx-cash/config?viewId=settlement  (new view)    │        │
│   │ 2. POST /tabs/fx-cash/data  (data with new filters/sort)      │        │
│   │ 3. Stats can be SKIPPED (same underlying data)                │        │
│   └───────────────────────────────────────────────────────────────┘        │
│                                                                             │
│                                                                             │
│   SCENARIO 3: User changes date range (affects all tabs)                    │
│   ──────────────────────────────────────────────────────                    │
│                                                                             │
│   What changes:                                                             │
│   • Grid data (filtered by new date range)                                  │
│   • Chips counts (recalculated for new date range)                          │
│                                                                             │
│   What stays the same:                                                      │
│   • All configuration                                                       │
│                                                                             │
│   API calls needed:                                                         │
│   ┌───────────────────────────────────────────────────────────────┐        │
│   │ 1. Config can be SKIPPED (unchanged)                          │        │
│   │ 2. POST /tabs/{currentTab}/data  (new date range)             │        │
│   │ 3. GET  /tabs/{currentTab}/stats (new date range)             │        │
│   └───────────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Caching Strategy for Tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAB-AWARE CACHING STRATEGY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   QUERY KEY STRUCTURE                                                       │
│   ───────────────────                                                       │
│                                                                             │
│   const tabQueryKeys = {                                                    │
│     all: ['tabs'] as const,                                                 │
│                                                                             │
│     // Tab config (includes view-specific settings)                         │
│     config: (tabId: string, viewId: string) =>                              │
│       ['tabs', tabId, 'config', viewId] as const,                          │
│                                                                             │
│     // Tab data (keyed by all filter parameters)                            │
│     data: (tabId: string, params: DataParams) =>                            │
│       ['tabs', tabId, 'data', params] as const,                            │
│                                                                             │
│     // Tab stats (keyed by date range)                                      │
│     stats: (tabId: string, dateRange: DateRange) =>                         │
│       ['tabs', tabId, 'stats', dateRange] as const,                        │
│   }                                                                         │
│                                                                             │
│                                                                             │
│   CACHE BEHAVIOR BY TAB ACTION                                              │
│   ────────────────────────────                                              │
│                                                                             │
│   ┌──────────────────┬────────────┬────────────┬────────────┐              │
│   │ Action           │ Config     │ Data       │ Stats      │              │
│   ├──────────────────┼────────────┼────────────┼────────────┤              │
│   │ Switch Tab       │ Fetch/Cache│ Fetch      │ Fetch      │              │
│   │ Switch View      │ Fetch/Cache│ Fetch      │ Skip (SWR) │              │
│   │ Change Date      │ Skip       │ Fetch      │ Fetch      │              │
│   │ Apply Filter     │ Skip       │ Fetch      │ Skip       │              │
│   │ Change Sort      │ Skip       │ Fetch      │ Skip       │              │
│   │ Refresh          │ Revalidate │ Fetch      │ Fetch      │              │
│   └──────────────────┴────────────┴────────────┴────────────┘              │
│                                                                             │
│   Skip = Use cached value                                                   │
│   SWR = Stale-While-Revalidate (show cached, fetch in background)          │
│   Fetch = Always get fresh data                                             │
│   Fetch/Cache = Fetch if not cached, use cache if available                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Prefetching Strategy for Tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAB PREFETCHING STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   WHEN TO PREFETCH                                                          │
│   ────────────────                                                          │
│                                                                             │
│   1. On Page Load: Prefetch config for all tabs                             │
│   ─────────────────────────────────────────────                             │
│                                                                             │
│   useEffect(() => {                                                         │
│     // User landed on FX Cash tab                                           │
│     // Prefetch FX Options config in background                             │
│     queryClient.prefetchQuery({                                             │
│       queryKey: tabQueryKeys.config('fx-options', 'default'),               │
│       queryFn: () => fetchTabConfig('fx-options', 'default'),               │
│     })                                                                      │
│   }, [])                                                                    │
│                                                                             │
│                                                                             │
│   2. On Tab Hover: Prefetch that tab's data                                 │
│   ─────────────────────────────────────────                                 │
│                                                                             │
│   const handleTabHover = (tabId: string) => {                               │
│     // Prefetch config (if not already cached)                              │
│     queryClient.prefetchQuery({                                             │
│       queryKey: tabQueryKeys.config(tabId, 'default'),                      │
│       queryFn: () => fetchTabConfig(tabId, 'default'),                      │
│     })                                                                      │
│                                                                             │
│     // Optionally prefetch first page of data                               │
│     queryClient.prefetchQuery({                                             │
│       queryKey: tabQueryKeys.stats(tabId, currentDateRange),                │
│       queryFn: () => fetchTabStats(tabId, currentDateRange),                │
│     })                                                                      │
│   }                                                                         │
│                                                                             │
│                                                                             │
│   3. On Idle: Prefetch adjacent views                                       │
│   ───────────────────────────────────                                       │
│                                                                             │
│   // Use requestIdleCallback for low-priority prefetching                   │
│   requestIdleCallback(() => {                                               │
│     availableViews.forEach(viewId => {                                      │
│       if (viewId !== currentViewId) {                                       │
│         queryClient.prefetchQuery({                                         │
│           queryKey: tabQueryKeys.config(currentTabId, viewId),              │
│           queryFn: () => fetchTabConfig(currentTabId, viewId),              │
│         })                                                                  │
│       }                                                                     │
│     })                                                                      │
│   })                                                                        │
│                                                                             │
│                                                                             │
│   PREFETCH PRIORITY                                                         │
│   ─────────────────                                                         │
│                                                                             │
│   High Priority (immediate):                                                │
│   • Current tab's data and stats                                            │
│   • Current tab's config (if not cached)                                    │
│                                                                             │
│   Medium Priority (on hover/idle):                                          │
│   • Other tabs' configs                                                     │
│   • Other tabs' stats                                                       │
│                                                                             │
│   Low Priority (background):                                                │
│   • Other views' configs within current tab                                 │
│   • Historical data (if applicable)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Implementation for Tab-Based Pages

```typescript
// src/hooks/useTabData.ts

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

interface TabConfig {
  tabId: string
  tabLabel: string
  viewId: string
  columnDefs: ColDef[]
  savedFilters: FilterModel
  savedSorting: SortModel[]
  availableViews: string[]
}

interface TabStats {
  chips: Record<string, { count: number; label: string }>
  totalRecords: number
}

// Query key factory for tabs
export const tabQueryKeys = {
  all: ['tabs'] as const,
  config: (tabId: string, viewId: string) =>
    ['tabs', tabId, 'config', viewId] as const,
  data: (tabId: string, params: DataParams) =>
    ['tabs', tabId, 'data', params] as const,
  stats: (tabId: string, dateRange: DateRange) =>
    ['tabs', tabId, 'stats', dateRange] as const,
}

// Main hook for tab-based pages
export function useTabData(
  tabId: string,
  viewId: string,
  dateRange: DateRange
) {
  const queryClient = useQueryClient()

  // Fetch config and stats in parallel
  const [configQuery, statsQuery] = useQueries({
    queries: [
      {
        queryKey: tabQueryKeys.config(tabId, viewId),
        queryFn: () => fetchTabConfig(tabId, viewId),
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 30 * 60 * 1000,    // 30 minutes
      },
      {
        queryKey: tabQueryKeys.stats(tabId, dateRange),
        queryFn: () => fetchTabStats(tabId, dateRange),
        staleTime: 30 * 1000,      // 30 seconds
        gcTime: 5 * 60 * 1000,     // 5 minutes
      },
    ],
  })

  // Prefetch other tab's config when hovering
  const prefetchTab = (targetTabId: string) => {
    queryClient.prefetchQuery({
      queryKey: tabQueryKeys.config(targetTabId, 'default'),
      queryFn: () => fetchTabConfig(targetTabId, 'default'),
    })
    queryClient.prefetchQuery({
      queryKey: tabQueryKeys.stats(targetTabId, dateRange),
      queryFn: () => fetchTabStats(targetTabId, dateRange),
    })
  }

  // Prefetch other view's config within same tab
  const prefetchView = (targetViewId: string) => {
    queryClient.prefetchQuery({
      queryKey: tabQueryKeys.config(tabId, targetViewId),
      queryFn: () => fetchTabConfig(tabId, targetViewId),
    })
  }

  return {
    config: configQuery.data,
    configLoading: configQuery.isLoading,
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    prefetchTab,
    prefetchView,
  }
}
```

---

### Component Structure for Tabs

```typescript
// src/pages/FxTradeConfirmations.tsx

function FxTradeConfirmations() {
  const [activeTab, setActiveTab] = useState('fx-cash')
  const [activeView, setActiveView] = useState('default')
  const [dateRange, setDateRange] = useState<DateRange>({ ... })

  const {
    config,
    configLoading,
    stats,
    statsLoading,
    prefetchTab,
    prefetchView,
  } = useTabData(activeTab, activeView, dateRange)

  return (
    <div className="page-container">
      {/* Page Header - shared across tabs */}
      <PageHeader
        title="FX Trade Confirmations"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Tab Bar */}
      <TabBar
        tabs={[
          { id: 'fx-cash', label: 'FX Cash' },
          { id: 'fx-options', label: 'FX Options' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTabHover={prefetchTab}  // Prefetch on hover!
      />

      {/* View Selector - changes per tab */}
      <ViewSelector
        views={config?.availableViews ?? []}
        activeView={activeView}
        onViewChange={setActiveView}
        onViewHover={prefetchView}  // Prefetch on hover!
      />

      {/* Chips - tab-specific */}
      <ChipsBar
        chips={stats?.chips}
        loading={statsLoading}
      />

      {/* Grid - tab and view specific */}
      {configLoading ? (
        <GridSkeleton />
      ) : config ? (
        <ServerSideGrid
          key={`${activeTab}-${activeView}`}  // Force remount on tab/view change
          columnDefs={config.columnDefs}
          fetchUrl={`/api/tabs/${activeTab}/data`}
          initialFilterModel={config.savedFilters}
          initialSortModel={config.savedSorting}
        />
      ) : null}
    </div>
  )
}
```

---

### Summary: Tabs + Hybrid Strategy

| Aspect | Single View Page | Tab-Based Page |
|--------|------------------|----------------|
| Config Endpoint | `/views/{viewId}/config` | `/tabs/{tabId}/config?viewId=...` |
| Data Endpoint | `/views/{viewId}/data` | `/tabs/{tabId}/data` |
| Stats Endpoint | `/views/{viewId}/stats` | `/tabs/{tabId}/stats` |
| Cache Key Includes | viewId | tabId + viewId |
| Prefetch On | View hover | Tab hover + View hover |
| Shared State | None | Date range across tabs |

**Key Insights:**

1. **The 3-endpoint strategy still works** - just add `tabId` to the URL structure
2. **Cache keys need both tabId and viewId** - to properly separate cached data
3. **Prefetching becomes more valuable** - users likely switch between tabs
4. **Date range is shared** - changing it should invalidate data for all tabs
5. **Tab switch = full data refresh** - different columns, different data source
6. **View switch = partial refresh** - same data, different presentation

---

## Design Decision Analysis: Why Separate `/stats` Endpoint?

### The Question

> Why did we create a separate `/stats` endpoint for chips data? Can't we include it in `/config` or `/data`?

This is an excellent architectural question. Let's analyze the trade-offs.

---

### Option Analysis: Where Should Chips Data Live?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHIPS DATA PLACEMENT OPTIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   OPTION A: Include in /config                                              │
│   ─────────────────────────────                                             │
│                                                                             │
│   GET /api/tabs/{tabId}/config                                              │
│   {                                                                         │
│     "columnDefs": [...],                                                    │
│     "savedFilters": {...},                                                  │
│     "savedSorting": [...],                                                  │
│     "chips": {                      ← Chips included here                   │
│       "confirmed": 7,                                                       │
│       "pending": 32                                                         │
│     }                                                                       │
│   }                                                                         │
│                                                                             │
│   ❌ PROBLEMS:                                                              │
│   • Config is cached for 5 minutes, chips would be stale                   │
│   • Changing date range requires refetching entire config                   │
│   • Config rarely changes, chips change with every data mutation            │
│   • Mixing static and dynamic data breaks caching strategy                  │
│                                                                             │
│                                                                             │
│   OPTION B: Include in /data response                                       │
│   ────────────────────────────────────                                      │
│                                                                             │
│   POST /api/tabs/{tabId}/data                                               │
│   Response: {                                                               │
│     "rowData": [...],                                                       │
│     "rowCount": 1250,                                                       │
│     "chips": {                      ← Chips included here                   │
│       "confirmed": 7,                                                       │
│       "pending": 32                                                         │
│     }                                                                       │
│   }                                                                         │
│                                                                             │
│   ⚠️ TRADE-OFFS:                                                            │
│   ✅ Always fresh (fetched with data)                                       │
│   ✅ Consistent with displayed data                                         │
│   ❌ Pagination problem: chips need ALL data, not just current page         │
│   ❌ Backend must aggregate twice (once for page, once for chips)           │
│   ❌ Can't show chips until first data page loads                           │
│   ❌ Sorting/filtering data doesn't need chip recalculation                 │
│                                                                             │
│                                                                             │
│   OPTION C: Separate /stats endpoint (RECOMMENDED)                          │
│   ─────────────────────────────────────────────────                         │
│                                                                             │
│   GET /api/tabs/{tabId}/stats?dateStart=...&dateEnd=...                     │
│   {                                                                         │
│     "chips": { "confirmed": 7, "pending": 32 },                             │
│     "totalRecords": 46                                                      │
│   }                                                                         │
│                                                                             │
│   ✅ BENEFITS:                                                              │
│   • Independent caching (30 seconds)                                        │
│   • Can be fetched in parallel with config                                  │
│   • Backend can optimize aggregation query separately                       │
│   • UI can show chips while data is still loading                           │
│   • Only refetch when date range changes, not on sort/filter                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Deep Dive: Why NOT Include Chips in `/data`?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE PAGINATION PROBLEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Scenario: User is viewing FX Cash trades                                  │
│   ─────────────────────────────────────────                                 │
│                                                                             │
│   Total trades in database: 10,000                                          │
│   Current page: rows 0-100 (first 100 trades)                               │
│                                                                             │
│   Chips show:                                                               │
│   • 7 Confirmed    ← These counts are from ALL 10,000 trades               │
│   • 32 Pending     ← NOT from the 100 currently displayed                  │
│   • 1 Rejected                                                              │
│   • 6 History                                                               │
│                                                                             │
│                                                                             │
│   If chips came from /data endpoint:                                        │
│   ─────────────────────────────────                                         │
│                                                                             │
│   POST /api/tabs/fx-cash/data                                               │
│   Request: { startRow: 0, endRow: 100 }                                     │
│                                                                             │
│   Backend must:                                                             │
│   1. Fetch rows 0-100 for the grid                                          │
│   2. ALSO run COUNT(*) GROUP BY status on ALL 10,000 rows for chips        │
│                                                                             │
│   This means EVERY pagination request recalculates chips!                   │
│                                                                             │
│   User scrolls to page 2:                                                   │
│   POST /api/tabs/fx-cash/data { startRow: 100, endRow: 200 }               │
│   → Backend recalculates chips again (wasteful!)                           │
│                                                                             │
│   User scrolls to page 3:                                                   │
│   POST /api/tabs/fx-cash/data { startRow: 200, endRow: 300 }               │
│   → Backend recalculates chips AGAIN (wasteful!)                           │
│                                                                             │
│                                                                             │
│   With separate /stats endpoint:                                            │
│   ──────────────────────────────                                            │
│                                                                             │
│   Initial load:                                                             │
│   • GET /stats → returns chips (one aggregation query)                      │
│   • POST /data → returns page 1 (simple SELECT with LIMIT)                  │
│                                                                             │
│   User scrolls to page 2:                                                   │
│   • POST /data → returns page 2 (no chips recalculation!)                   │
│                                                                             │
│   User scrolls to page 3:                                                   │
│   • POST /data → returns page 3 (no chips recalculation!)                   │
│                                                                             │
│   Chips only refetch when date range changes!                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### When DOES Chips Data Need to Refresh?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHIPS REFRESH TRIGGERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Action                    │ Refetch Chips? │ Reason                       │
│   ──────────────────────────┼────────────────┼─────────────────────────────│
│   Change date range         │ ✅ YES         │ Different data set           │
│   Switch tab                │ ✅ YES         │ Different data source        │
│   User confirms a trade     │ ✅ YES         │ Status count changed         │
│   ──────────────────────────┼────────────────┼─────────────────────────────│
│   Pagination (scroll)       │ ❌ NO          │ Same underlying data         │
│   Sort by column            │ ❌ NO          │ Same data, different order   │
│   Filter by column          │ ❌ NO*         │ Same totals, display subset  │
│   Switch view               │ ❌ NO          │ Same data, different columns │
│   Resize columns            │ ❌ NO          │ UI only                      │
│                                                                             │
│   * Note: Chips show TOTAL counts regardless of grid filters                │
│     If you want filtered chips, that's a different UX pattern               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Recommendation Summary: Chips Placement

| Option | Use When |
|--------|----------|
| **In /config** | ❌ Never - breaks caching, mixes static/dynamic |
| **In /data** | ✅ OK if chips show counts for CURRENT PAGE ONLY |
| **Separate /stats** | ✅ RECOMMENDED if chips show TOTAL counts across all data |

**For enterprise apps with pagination, separate `/stats` is almost always correct.**

---

## Design Decision Analysis: Parallel Calls Coupling

### The Question

> You made parallel calls for /config and /stats. Doesn't it bind both calls together?

This is a subtle but important distinction. Let's clarify.

---

### What "Parallel" Actually Means

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL vs COUPLED                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   "Parallel" = Started at the same time                                     │
│   "Coupled" = Must complete together / depend on each other                 │
│                                                                             │
│   These are DIFFERENT concepts!                                             │
│                                                                             │
│                                                                             │
│   OUR IMPLEMENTATION:                                                       │
│   ───────────────────                                                       │
│                                                                             │
│   // Parallel fetch - INDEPENDENT completion                                │
│   const [configQuery, statsQuery] = useQueries({                            │
│     queries: [                                                              │
│       { queryKey: ['config'], queryFn: fetchConfig },                       │
│       { queryKey: ['stats'], queryFn: fetchStats },                         │
│     ]                                                                       │
│   })                                                                        │
│                                                                             │
│   // Each query resolves independently!                                     │
│   // UI can react to each as it completes                                   │
│                                                                             │
│   return (                                                                  │
│     <>                                                                      │
│       {/* Chips render as soon as stats is ready */}                        │
│       <ChipsBar                                                             │
│         chips={statsQuery.data?.chips}                                      │
│         loading={statsQuery.isLoading}                                      │
│       />                                                                    │
│                                                                             │
│       {/* Grid renders as soon as config is ready */}                       │
│       {configQuery.isLoading ? (                                            │
│         <Skeleton />                                                        │
│       ) : (                                                                 │
│         <Grid columnDefs={configQuery.data.columnDefs} />                   │
│       )}                                                                    │
│     </>                                                                     │
│   )                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Timeline: How Parallel Requests Complete Independently

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL REQUEST TIMELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Time ──────────────────────────────────────────────────────────────►     │
│   0ms     100ms    200ms    300ms    400ms    500ms    600ms               │
│   │        │        │        │        │        │        │                  │
│                                                                             │
│   SCENARIO A: Stats faster than Config                                      │
│   ─────────────────────────────────────                                     │
│                                                                             │
│   Config  ████████████████████████████████████  (500ms)                    │
│   Stats   ████████████  (200ms)                                            │
│                        ↑                                                    │
│                        │                                                    │
│                   Stats ready!                                              │
│                   → Chips render                                            │
│                   → Grid still loading                                      │
│                                            ↑                                │
│                                            │                                │
│                                       Config ready!                         │
│                                       → Grid renders                        │
│                                                                             │
│   User sees: Chips appear first, then grid appears                          │
│                                                                             │
│                                                                             │
│   SCENARIO B: Config faster than Stats                                      │
│   ─────────────────────────────────────                                     │
│                                                                             │
│   Config  ████████████  (200ms)                                            │
│   Stats   ████████████████████████████████████  (500ms)                    │
│                        ↑                                                    │
│                        │                                                    │
│                   Config ready!                                             │
│                   → Grid shell renders                                      │
│                   → Chips still loading (skeleton)                          │
│                                            ↑                                │
│                                            │                                │
│                                       Stats ready!                          │
│                                       → Chips render                        │
│                                                                             │
│   User sees: Grid appears first, chips appear after                         │
│                                                                             │
│                                                                             │
│   SCENARIO C: Stats fails, Config succeeds                                  │
│   ────────────────────────────────────────                                  │
│                                                                             │
│   Config  ████████████  (200ms) ✅                                         │
│   Stats   ████████████  (200ms) ❌ Error                                   │
│                                                                             │
│   User sees:                                                                │
│   • Grid renders normally with data                                         │
│   • Chips show "--" or retry button                                        │
│   • App is still usable!                                                    │
│                                                                             │
│                                                                             │
│   KEY INSIGHT: Parallel ≠ Coupled                                           │
│   ───────────────────────────────                                           │
│   • Requests START together                                                 │
│   • Requests COMPLETE independently                                         │
│   • UI REACTS to each independently                                         │
│   • FAILURES are isolated                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Contrasting with True Coupling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL vs COUPLED vs WATERFALL                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   WATERFALL (Sequential) ❌                                                 │
│   ────────────────────────                                                  │
│                                                                             │
│   const config = await fetchConfig()  // Wait 500ms                         │
│   const stats = await fetchStats()    // Then wait 300ms                    │
│   // Total: 800ms                                                           │
│                                                                             │
│   Config  ████████████████████                                              │
│   Stats                       ████████████                                  │
│   Total   ══════════════════════════════════  (800ms)                      │
│                                                                             │
│                                                                             │
│   COUPLED (Wait for All) ⚠️                                                 │
│   ─────────────────────────                                                 │
│                                                                             │
│   const [config, stats] = await Promise.all([                               │
│     fetchConfig(),                                                          │
│     fetchStats()                                                            │
│   ])                                                                        │
│   // Can't use either until BOTH complete                                   │
│                                                                             │
│   Config  ████████████████████                                              │
│   Stats   ████████████                                                      │
│   Wait    ════════════════════  (must wait for slowest)                    │
│   Render                      │ (everything renders at once)               │
│                                                                             │
│                                                                             │
│   PARALLEL INDEPENDENT (Our Approach) ✅                                    │
│   ──────────────────────────────────────                                    │
│                                                                             │
│   // Using useQueries - each resolves independently                         │
│   const [configQuery, statsQuery] = useQueries(...)                         │
│                                                                             │
│   Config  ████████████████████                                              │
│   Stats   ████████████                                                      │
│                       ↑        ↑                                            │
│                       │        │                                            │
│                  Chips render  Grid renders                                 │
│                  immediately   when ready                                   │
│                                                                             │
│   // PROGRESSIVE RENDERING - best UX!                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Implementation: Truly Independent Parallel Queries

```typescript
// src/hooks/useTabData.ts

export function useTabData(tabId: string, viewId: string, dateRange: DateRange) {
  // These run in parallel but complete INDEPENDENTLY
  const configQuery = useQuery({
    queryKey: ['tabs', tabId, 'config', viewId],
    queryFn: () => fetchConfig(tabId, viewId),
    staleTime: 5 * 60 * 1000,
  })

  const statsQuery = useQuery({
    queryKey: ['tabs', tabId, 'stats', dateRange],
    queryFn: () => fetchStats(tabId, dateRange),
    staleTime: 30 * 1000,
  })

  // Each can be used independently in the UI
  return {
    // Config state
    config: configQuery.data,
    configLoading: configQuery.isLoading,
    configError: configQuery.error,

    // Stats state (completely independent)
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,
  }
}

// In component - each section renders when its data is ready
function TabContent() {
  const { config, configLoading, stats, statsLoading } = useTabData(...)

  return (
    <>
      {/* Chips render independently - as soon as stats is ready */}
      {statsLoading ? (
        <ChipsSkeleton />
      ) : statsError ? (
        <ChipsError onRetry={refetchStats} />
      ) : (
        <ChipsBar chips={stats.chips} />
      )}

      {/* Grid renders independently - as soon as config is ready */}
      {configLoading ? (
        <GridSkeleton />
      ) : configError ? (
        <GridError onRetry={refetchConfig} />
      ) : (
        <ServerSideGrid columnDefs={config.columnDefs} />
      )}
    </>
  )
}
```

---

### Alternative: Using useQueries for Grouped Parallel Calls

```typescript
// This is what we showed earlier - still independent!
const [configQuery, statsQuery] = useQueries({
  queries: [
    { queryKey: ['config', tabId], queryFn: () => fetchConfig(tabId) },
    { queryKey: ['stats', tabId], queryFn: () => fetchStats(tabId) },
  ]
})

// useQueries is just syntactic sugar for multiple useQuery calls
// Each query still completes independently!
// The array is for convenience, not coupling
```

---

### Summary: Parallel Calls Design

| Aspect | Our Implementation |
|--------|-------------------|
| Requests start | Together (parallel) |
| Requests complete | Independently |
| UI updates | As each completes (progressive) |
| Error handling | Isolated per request |
| Caching | Independent TTLs |
| Refetching | Can refetch one without the other |

**Key Takeaway:** `useQueries` groups queries for convenience, but they remain **independent**. The UI can and should react to each query's state separately for the best user experience.

---

## Related Documentation

- [10-ag-grid-server-side-setup.md](./10-ag-grid-server-side-setup.md) - AG Grid configuration
- [11-msw-service-worker-internals.md](./11-msw-service-worker-internals.md) - Mock API setup
- [TanStack Query Documentation](https://tanstack.com/query/latest) - Data fetching library
