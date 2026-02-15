/**
 * Tests for MultiValueFloatingFilter component.
 *
 * Covers:
 * - parseValues unit tests (comma, OR, AND, mixed error, single value, empty)
 * - buildFilterModel unit tests (0/1/2/3+ text values, number values, AND operator)
 * - Initial render (edit mode, input visible, placeholder)
 * - Debounce behavior
 * - Compact display (after blur shows first value + "+N more")
 * - Edit/display toggle
 * - Clear button
 * - Error: mixed operators
 * - Error: max exceeded
 * - Bidirectional sync
 * - Number filter
 * - AND operator
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { render } from '@/test/utils'
import { MultiValueFloatingFilter } from '@/components/ui/MultiValueFloatingFilter'
import { parseValues, buildFilterModel } from '@/components/ui/multiValueFilterUtils'
import type { CustomFloatingFilterProps } from 'ag-grid-react'

// ---------------------------------------------------------------------------
// parseValues unit tests
// ---------------------------------------------------------------------------

describe('parseValues', () => {
  it('returns empty values for empty string', () => {
    const result = parseValues('')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual([])
      expect(result.operator).toBeNull()
    }
  })

  it('returns empty values for whitespace-only string', () => {
    const result = parseValues('   ')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual([])
      expect(result.operator).toBeNull()
    }
  })

  it('returns single value with null operator', () => {
    const result = parseValues('USD/EUR')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['USD/EUR'])
      expect(result.operator).toBeNull()
    }
  })

  it('parses comma-separated values with OR operator', () => {
    const result = parseValues('USD/EUR, AUD/USD, USD/CHF')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['USD/EUR', 'AUD/USD', 'USD/CHF'])
      expect(result.operator).toBe('OR')
    }
  })

  it('parses OR keyword (case-insensitive) with OR operator', () => {
    const result = parseValues('abc OR wer OR uru')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['abc', 'wer', 'uru'])
      expect(result.operator).toBe('OR')
    }
  })

  it('parses OR keyword case-insensitively', () => {
    const result = parseValues('abc or wer or uru')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['abc', 'wer', 'uru'])
      expect(result.operator).toBe('OR')
    }
  })

  it('parses AND keyword with AND operator', () => {
    const result = parseValues('abc AND wer AND uru')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['abc', 'wer', 'uru'])
      expect(result.operator).toBe('AND')
    }
  })

  it('parses AND keyword case-insensitively', () => {
    const result = parseValues('abc and wer and uru')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['abc', 'wer', 'uru'])
      expect(result.operator).toBe('AND')
    }
  })

  it('returns error for mixed OR and AND operators', () => {
    const result = parseValues('abc OR wer AND uru')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('mixed-operators')
    }
  })

  it('returns error for mixed comma and AND', () => {
    const result = parseValues('abc, wer AND uru')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('mixed-operators')
    }
  })

  it('trims whitespace from each value', () => {
    const result = parseValues('  USD/EUR  ,  AUD/USD  ')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toEqual(['USD/EUR', 'AUD/USD'])
    }
  })
})

// ---------------------------------------------------------------------------
// buildFilterModel unit tests
// ---------------------------------------------------------------------------

describe('buildFilterModel', () => {
  it('returns null for empty values', () => {
    expect(buildFilterModel([], 'OR', false)).toBeNull()
  })

  it('returns simple leaf model for single text value', () => {
    const model = buildFilterModel(['USD'], 'OR', false)
    expect(model).toEqual({ filterType: 'text', type: 'contains', filter: 'USD' })
  })

  it('returns condition1/condition2 model for two text values', () => {
    const model = buildFilterModel(['USD', 'EUR'], 'OR', false)
    expect(model).toEqual({
      filterType: 'text',
      operator: 'OR',
      condition1: { filterType: 'text', type: 'contains', filter: 'USD' },
      condition2: { filterType: 'text', type: 'contains', filter: 'EUR' },
    })
  })

  it('returns conditions array for 3+ text values', () => {
    const model = buildFilterModel(['USD', 'EUR', 'GBP'], 'OR', false)
    expect(model).toEqual({
      filterType: 'text',
      operator: 'OR',
      conditions: [
        { filterType: 'text', type: 'contains', filter: 'USD' },
        { filterType: 'text', type: 'contains', filter: 'EUR' },
        { filterType: 'text', type: 'contains', filter: 'GBP' },
      ],
    })
  })

  it('uses AND operator when specified', () => {
    const model = buildFilterModel(['USD', 'EUR'], 'AND', false)
    expect(model).toEqual({
      filterType: 'text',
      operator: 'AND',
      condition1: { filterType: 'text', type: 'contains', filter: 'USD' },
      condition2: { filterType: 'text', type: 'contains', filter: 'EUR' },
    })
  })

  it('returns number filter model for single number value', () => {
    const model = buildFilterModel(['1000'], 'OR', true)
    expect(model).toEqual({ filterType: 'number', type: 'equals', filter: 1000 })
  })

  it('returns number filter model for two number values', () => {
    const model = buildFilterModel(['1000', '2000'], 'OR', true)
    expect(model).toEqual({
      filterType: 'number',
      operator: 'OR',
      condition1: { filterType: 'number', type: 'equals', filter: 1000 },
      condition2: { filterType: 'number', type: 'equals', filter: 2000 },
    })
  })

  it('returns conditions array for 3+ number values', () => {
    const model = buildFilterModel(['100', '200', '300'], 'AND', true)
    expect(model).toEqual({
      filterType: 'number',
      operator: 'AND',
      conditions: [
        { filterType: 'number', type: 'equals', filter: 100 },
        { filterType: 'number', type: 'equals', filter: 200 },
        { filterType: 'number', type: 'equals', filter: 300 },
      ],
    })
  })
})

// ---------------------------------------------------------------------------
// Helper to build default props for the floating filter
// ---------------------------------------------------------------------------

function buildProps(overrides: Partial<CustomFloatingFilterProps> = {}): CustomFloatingFilterProps {
  return {
    model: null,
    onModelChange: vi.fn(),
    column: {
      getColDef: () => ({ filter: 'agTextColumnFilter' }),
    } as unknown as CustomFloatingFilterProps['column'],
    api: {} as CustomFloatingFilterProps['api'],
    colDef: {},
    filterParams: {},
    currentParentModel: vi.fn(() => null),
    showParentFilter: vi.fn(),
    onFloatingFilterChanged: vi.fn(),
    suppressFilterButton: false,
    ...overrides,
  } as unknown as CustomFloatingFilterProps
}

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------

describe('MultiValueFloatingFilter - initial render', () => {
  it('renders input in edit mode with placeholder', () => {
    render(<MultiValueFloatingFilter {...buildProps()} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')
    expect(input).toBeInTheDocument()
  })

  it('starts with empty input value', () => {
    render(<MultiValueFloatingFilter {...buildProps()} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')
    expect((input as HTMLInputElement).value).toBe('')
  })
})

describe('MultiValueFloatingFilter - debounce behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call onModelChange before debounce delay for single value', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD' } })
    expect(onModelChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(onModelChange).not.toHaveBeenCalled()
  })

  it('calls onModelChange once after debounce delay', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onModelChange).toHaveBeenCalledTimes(1)
    expect(onModelChange).toHaveBeenCalledWith({
      filterType: 'text',
      type: 'contains',
      filter: 'USD',
    })
  })

  it('resets debounce timer on each keystroke', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'U' } })
    act(() => { vi.advanceTimersByTime(150) })
    fireEvent.change(input, { target: { value: 'US' } })
    act(() => { vi.advanceTimersByTime(150) })
    fireEvent.change(input, { target: { value: 'USD' } })
    act(() => { vi.advanceTimersByTime(300) })

    // Only called once with final value
    expect(onModelChange).toHaveBeenCalledTimes(1)
    expect(onModelChange).toHaveBeenCalledWith({
      filterType: 'text',
      type: 'contains',
      filter: 'USD',
    })
  })
})

describe('MultiValueFloatingFilter - compact display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('switches to compact mode on blur with a single value', async () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD/EUR' } })
    fireEvent.blur(input)

    expect(screen.queryByPlaceholderText('e.g. USD/EUR, AUD/USD')).toBeNull()
    expect(screen.getByText('USD/EUR')).toBeInTheDocument()
  })

  it('shows "+N more" badge when multiple values are present', () => {
    render(<MultiValueFloatingFilter {...buildProps()} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    // Comma triggers auto-compact mode
    fireEvent.change(input, { target: { value: 'USD/EUR, AUD/USD, USD/CHF' } })

    expect(screen.getByText('USD/EUR')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('does not switch to compact mode on blur with empty input', () => {
    render(<MultiValueFloatingFilter {...buildProps()} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    // Should remain in edit mode
    expect(screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')).toBeInTheDocument()
  })
})

describe('MultiValueFloatingFilter - edit/display toggle', () => {
  it('enters edit mode when compact display is clicked', () => {
    render(<MultiValueFloatingFilter {...buildProps()} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD/EUR, AUD/USD' } })

    // Now in compact mode, click to edit
    fireEvent.click(screen.getByText('USD/EUR'))
    expect(screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')).toBeInTheDocument()
  })

  it('pressing Enter commits and enters compact mode', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD/EUR' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('USD/EUR')).toBeInTheDocument()
    expect(onModelChange).toHaveBeenCalledWith({
      filterType: 'text',
      type: 'contains',
      filter: 'USD/EUR',
    })
  })

  it('pressing Escape commits and enters compact mode', () => {
    render(<MultiValueFloatingFilter {...buildProps()} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD/EUR' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByText('USD/EUR')).toBeInTheDocument()
  })
})

describe('MultiValueFloatingFilter - clear button', () => {
  it('clears filter and returns to edit mode when clear button is clicked', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'USD/EUR, AUD/USD' } })

    const clearBtn = screen.getByLabelText('Clear filter')
    fireEvent.click(clearBtn)

    expect(onModelChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')).toBeInTheDocument()
  })
})

describe('MultiValueFloatingFilter - error: mixed operators', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows error icon on mixed OR and AND input', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'abc OR wer AND uru' } })
    act(() => { vi.advanceTimersByTime(300) })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onModelChange).toHaveBeenLastCalledWith(null)
  })

  it('shows error aria-label with message', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'abc OR wer AND uru' } })
    act(() => { vi.advanceTimersByTime(300) })

    expect(screen.getByLabelText('Mixed OR/AND operators are not allowed')).toBeInTheDocument()
  })
})

describe('MultiValueFloatingFilter - error: max conditions exceeded', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows error when values exceed maxNumConditions', () => {
    const onModelChange = vi.fn()
    const props = {
      ...buildProps({ onModelChange }),
      maxNumConditions: 2,
    } as unknown as CustomFloatingFilterProps

    render(<MultiValueFloatingFilter {...props} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'a OR b OR c' } })
    act(() => { vi.advanceTimersByTime(300) })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Maximum 2 conditions allowed')).toBeInTheDocument()
    expect(onModelChange).toHaveBeenLastCalledWith(null)
  })
})

describe('MultiValueFloatingFilter - bidirectional sync', () => {
  it('resets to edit mode when model becomes null externally', () => {
    const { rerender } = render(
      <MultiValueFloatingFilter {...buildProps({ model: { filterType: 'text', type: 'contains', filter: 'USD' } as unknown as null })} />
    )

    // Now clear the model externally
    rerender(<MultiValueFloatingFilter {...buildProps({ model: null })} />)

    expect(screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')).toBeInTheDocument()
  })

  it('switches to compact mode when model is set externally', () => {
    const { rerender } = render(<MultiValueFloatingFilter {...buildProps({ model: null })} />)

    rerender(
      <MultiValueFloatingFilter
        {...buildProps({
          model: {
            filterType: 'text',
            type: 'contains',
            filter: 'USD/EUR',
          } as unknown as null,
        })}
      />
    )

    expect(screen.getByText('USD/EUR')).toBeInTheDocument()
  })

  it('shows multiple values from external conditions model', () => {
    const model = {
      filterType: 'text',
      operator: 'OR',
      conditions: [
        { filterType: 'text', type: 'contains', filter: 'USD' },
        { filterType: 'text', type: 'contains', filter: 'EUR' },
        { filterType: 'text', type: 'contains', filter: 'GBP' },
      ],
    } as unknown as null

    render(<MultiValueFloatingFilter {...buildProps({ model })} />)

    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })
})

describe('MultiValueFloatingFilter - number filter', () => {
  it('builds number filter model via debounce', () => {
    vi.useFakeTimers()

    const onModelChange = vi.fn()
    const props = {
      ...buildProps({ onModelChange }),
      column: {
        getColDef: () => ({ filter: 'agNumberColumnFilter' }),
      },
    } as unknown as CustomFloatingFilterProps

    render(<MultiValueFloatingFilter {...props} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: '1000' } })
    act(() => { vi.advanceTimersByTime(300) })

    expect(onModelChange).toHaveBeenCalledWith({
      filterType: 'number',
      type: 'equals',
      filter: 1000,
    })

    vi.useRealTimers()
  })
})

describe('MultiValueFloatingFilter - AND operator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds AND filter model for AND keyword input', () => {
    const onModelChange = vi.fn()
    render(<MultiValueFloatingFilter {...buildProps({ onModelChange })} />)
    const input = screen.getByPlaceholderText('e.g. USD/EUR, AUD/USD')

    fireEvent.change(input, { target: { value: 'abc AND wer' } })
    act(() => { vi.advanceTimersByTime(300) })

    expect(onModelChange).toHaveBeenCalledWith({
      filterType: 'text',
      operator: 'AND',
      condition1: { filterType: 'text', type: 'contains', filter: 'abc' },
      condition2: { filterType: 'text', type: 'contains', filter: 'wer' },
    })
  })
})
