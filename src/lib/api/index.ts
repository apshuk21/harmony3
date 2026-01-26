/**
 * API Module
 *
 * Centralized API client with error handling and interceptors.
 *
 * @example
 * ```ts
 * import { apiFetch, api, ApiError, isApiError } from '@/lib/api'
 *
 * // Using apiFetch directly
 * const users = await apiFetch<User[]>('/api/users')
 *
 * // Using convenience methods
 * const user = await api.get<User>('/api/users/1')
 * const newUser = await api.post<User>('/api/users', { name: 'John' })
 *
 * // Error handling
 * try {
 *   await api.delete('/api/users/1')
 * } catch (error) {
 *   if (isApiError(error) && error.status === 404) {
 *     console.log('User not found')
 *   }
 * }
 * ```
 */

// Error classes and utilities
export {
  ApiError,
  NetworkError,
  TimeoutError,
  ValidationError,
  isApiError,
  isNetworkError,
  isTimeoutError,
  getErrorMessage,
} from './errors'

// API client
export {
  apiFetch,
  api,
  addRequestInterceptor,
  addResponseInterceptor,
  type ApiFetchOptions,
} from './client'

// Default export
export { default } from './client'
