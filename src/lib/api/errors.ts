/**
 * API Error Classes
 *
 * Structured error types for API responses.
 * These classes provide type-safe error handling across the application.
 *
 * @example
 * ```ts
 * import { ApiError, NetworkError, TimeoutError } from '@/lib/api'
 *
 * try {
 *   await apiFetch('/api/users')
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.status) // 401, 404, 500, etc.
 *   }
 *   if (error instanceof NetworkError) {
 *     console.log('No internet connection')
 *   }
 * }
 * ```
 */

/**
 * Base API Error
 * Thrown when the server returns a non-2xx response
 */
export class ApiError extends Error {
  /** HTTP status code (e.g., 401, 404, 500) */
  status: number

  /** Application-specific error code from API (e.g., 'INVALID_CREDENTIALS') */
  code?: string

  /** Additional error details from API response */
  details?: unknown

  /** Request ID for tracing (if available) */
  requestId?: string

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    requestId?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }

  /**
   * Check if this is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  /**
   * Check if this is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.status === 401
  }

  /**
   * Check if this is a forbidden error
   */
  isForbidden(): boolean {
    return this.status === 403
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.status === 404
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'Please log in to continue.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 408:
        return 'Request timed out. Please try again.'
      case 429:
        return 'Too many requests. Please wait and try again.'
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.'
      default:
        return this.message || 'An unexpected error occurred.'
    }
  }
}

/**
 * Network Error
 * Thrown when the request fails due to network issues (no internet, DNS failure, etc.)
 */
export class NetworkError extends Error {
  /** The original error that caused this */
  cause?: Error

  constructor(message = 'Network error. Please check your internet connection.', cause?: Error) {
    super(message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

/**
 * Timeout Error
 * Thrown when the request exceeds the configured timeout
 */
export class TimeoutError extends Error {
  /** Timeout duration in milliseconds */
  timeout: number

  /** The URL that timed out */
  url: string

  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`)
    this.name = 'TimeoutError'
    this.timeout = timeout
    this.url = url
  }
}

/**
 * Validation Error
 * Thrown when request validation fails before sending
 */
export class ValidationError extends Error {
  /** Field-level validation errors */
  fieldErrors: Record<string, string[]>

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * Type guard to check if an error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

/**
 * Get a user-friendly message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.toUserMessage()
  }

  if (error instanceof NetworkError) {
    return error.message
  }

  if (error instanceof TimeoutError) {
    return 'Request timed out. Please try again.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred.'
}
