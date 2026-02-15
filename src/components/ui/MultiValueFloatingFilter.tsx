/**
 * Custom floating filter supporting comma/OR/AND-separated multi-value input.
 *
 * Features:
 * - OR and AND operator support
 * - Compact display mode showing first value + "+N more" badge
 * - 300ms debounce to avoid excessive API calls
 * - Error handling for mixed operators and max conditions exceeded
 * - Tooltip error display on hover/focus
 * - Bidirectional sync with column filter model
 * - Number filter support (agNumberColumnFilter columns)
 * - Clear button
 *
 * Ref: docs/filters/ag-grid-ssrm-filters.md
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { CustomFloatingFilterProps } from 'ag-grid-react'
import {
  parseValues,
  buildFilterModel,
  extractValuesFromModel,
} from './multiValueFilterUtils'
import styles from './MultiValueFloatingFilter.module.css'


interface MultiValueFloatingFilterParams {
  defaultOperator?: 'OR' | 'AND'
  debounceMs?: number
  maxNumConditions?: number
}

// ---------------------------------------------------------------------------
// Filter display state (managed by useReducer for batched updates from effects)
// ---------------------------------------------------------------------------

interface FilterState {
  values: string[]
  inputValue: string
  isEditMode: boolean
  errorMsg: string | null
}

type FilterAction =
  | { type: 'RESET' }
  | { type: 'SET_FROM_MODEL'; values: string[] }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'COMMIT'; values: string[]; inputValue: string }
  | { type: 'ENTER_EDIT'; inputValue: string }
  | { type: 'CLEAR' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'RESET':
      return { values: [], inputValue: '', isEditMode: true, errorMsg: null }
    case 'SET_FROM_MODEL':
      return { ...state, values: action.values, isEditMode: false, errorMsg: null }
    case 'SET_INPUT':
      return { ...state, inputValue: action.value }
    case 'COMMIT':
      return {
        ...state,
        values: action.values,
        inputValue: action.inputValue,
        isEditMode: false,
        errorMsg: null,
      }
    case 'ENTER_EDIT':
      return { ...state, isEditMode: true, inputValue: action.inputValue }
    case 'CLEAR':
      return { values: [], inputValue: '', isEditMode: true, errorMsg: null }
    case 'SET_ERROR':
      return { ...state, errorMsg: action.message }
    case 'CLEAR_ERROR':
      return { ...state, errorMsg: null }
  }
}

const initialFilterState: FilterState = {
  values: [],
  inputValue: '',
  isEditMode: true,
  errorMsg: null,
}

export function MultiValueFloatingFilter(props: CustomFloatingFilterProps) {
  const { onModelChange, model } = props
  const componentParams = props as unknown as MultiValueFloatingFilterParams

  const colDef = (
    props as CustomFloatingFilterProps & { column?: { getColDef?: () => { filter?: string; field?: string } } }
  ).column?.getColDef?.()

  const isNumber = colDef?.filter === 'agNumberColumnFilter'
  const fieldName = colDef?.field ?? 'filter'

  const defaultOperator = componentParams.defaultOperator ?? 'OR'
  const debounceMs = componentParams.debounceMs ?? 300
  const maxNumConditions = componentParams.maxNumConditions ?? 10

  const [state, dispatch] = useReducer(filterReducer, initialFilterState)
  const [showTooltip, setShowTooltip] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastOperatorRef = useRef<'OR' | 'AND'>(defaultOperator)

  // Bidirectional sync: when model changes externally, update display.
  // A single dispatch call satisfies the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (model === null || model === undefined) {
      dispatch({ type: 'RESET' })
    } else if (typeof model === 'object') {
      const extracted = extractValuesFromModel(model as Record<string, unknown>)
      if (extracted.length > 0) {
        dispatch({ type: 'SET_FROM_MODEL', values: extracted })
      }
    }
  }, [model])

  const applyParsedValues = useCallback(
    (raw: string) => {
      const parsed = parseValues(raw)

      if (!parsed.ok) {
        dispatch({ type: 'SET_ERROR', message: 'Mixed OR/AND operators are not allowed' })
        onModelChange(null)
        return
      }

      const { values: parsedValues, operator } = parsed
      const effectiveOperator = operator ?? lastOperatorRef.current

      if (parsedValues.length > maxNumConditions) {
        dispatch({ type: 'SET_ERROR', message: `Maximum ${maxNumConditions} conditions allowed` })
        onModelChange(null)
        return
      }

      dispatch({ type: 'CLEAR_ERROR' })
      lastOperatorRef.current = effectiveOperator
      onModelChange(buildFilterModel(parsedValues, effectiveOperator, isNumber))
    },
    [onModelChange, maxNumConditions, isNumber]
  )

  const commitAndEnterCompactMode = useCallback(
    (currentInput: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      const parsed = parseValues(currentInput)
      if (!parsed.ok || parsed.values.length === 0) {
        if (!parsed.ok) {
          dispatch({ type: 'SET_ERROR', message: 'Mixed OR/AND operators are not allowed' })
          onModelChange(null)
        }
        return
      }

      const { values: parsedValues, operator } = parsed
      const effectiveOperator = operator ?? lastOperatorRef.current
      lastOperatorRef.current = effectiveOperator

      dispatch({ type: 'COMMIT', values: parsedValues, inputValue: '' })
      onModelChange(buildFilterModel(parsedValues, effectiveOperator, isNumber))
    },
    [onModelChange, isNumber]
  )

  const enterEditMode = useCallback(() => {
    const sep = lastOperatorRef.current === 'AND' ? ' AND ' : ', '
    dispatch({ type: 'ENTER_EDIT', inputValue: state.values.join(sep) })
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [state.values])

  const handleClear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    dispatch({ type: 'CLEAR' })
    onModelChange(null)
  }, [onModelChange])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      dispatch({ type: 'SET_INPUT', value: raw })

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Auto-commit on comma: switch to compact mode immediately
      if (raw.includes(',')) {
        const parsed = parseValues(raw)
        if (parsed.ok && parsed.values.length >= 1) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
          }
          const { values: parsedValues, operator } = parsed
          const effectiveOperator = operator ?? lastOperatorRef.current
          lastOperatorRef.current = effectiveOperator
          dispatch({ type: 'COMMIT', values: parsedValues, inputValue: '' })
          onModelChange(buildFilterModel(parsedValues, effectiveOperator, isNumber))
          return
        }
      }

      debounceTimerRef.current = setTimeout(() => {
        applyParsedValues(raw)
      }, debounceMs)
    },
    [applyParsedValues, debounceMs, onModelChange, isNumber]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        commitAndEnterCompactMode(state.inputValue)
      }
    },
    [commitAndEnterCompactMode, state.inputValue]
  )

  const handleBlur = useCallback(() => {
    commitAndEnterCompactMode(state.inputValue)
  }, [commitAndEnterCompactMode, state.inputValue])

  return (
    <div className={styles.wrapper}>
      {state.isEditMode ? (
        <input
          ref={inputRef}
          id={`floating-filter-${fieldName}`}
          name={`floating-filter-${fieldName}`}
          type="text"
          className={`${styles.input}${state.errorMsg ? ` ${styles.hasError}` : ''}`}
          value={state.inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g. USD/EUR, AUD/USD"
        />
      ) : (
        <div className={styles.compactDisplay} onClick={enterEditMode}>
          <span className={styles.valueBadge}>
            +{state.values.length}
          </span>
          <button
            className={styles.clearButton}
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            aria-label="Clear filter"
          >
            &times;
          </button>
        </div>
      )}
      {state.errorMsg && (
        <span
          className={styles.errorIcon}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          tabIndex={0}
          aria-label={state.errorMsg}
          role="alert"
        >
          !
          {showTooltip && <span className={styles.tooltip}>{state.errorMsg}</span>}
        </span>
      )}
    </div>
  )
}
