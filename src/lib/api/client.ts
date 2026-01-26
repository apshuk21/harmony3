/**
 * API Client
 *
 * HTTP client with request/response interception, error handling,
 * and support for common API patterns.
 *
 * Features:
 * - Request interception (headers, auth tokens, request IDs)
 * - Response interception (error parsing, logging)
 * - Configurable timeouts
 * - Automatic JSON parsing
 * - TypeScript generics for type-safe responses
 *
 * @example
 * ```ts
 * import { apiFetch } from '@/lib/api'
 *
 * // GET request
 * const users = await apiFetch<User[]>('/api/users')
 *
 * // POST request
 * const newUser = await apiFetch<User>('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'John' }),
 * })
 *
 * // With custom options
 * const data = await apiFetch<Data>('/api/data', {
 *   timeout: 30000,
 *   headers: { 'X-Custom-Header': 'value' },
 * })
 * ```
 */

import { ApiError, NetworkError, TimeoutError } from './errors'

/**
 * Extended fetch options with additional configuration
 */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Request body - will be stringified if object */
  body?: RequestInit['body'] | object

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number

  /** Skip automatic JSON Content-Type header */
  skipContentType?: boolean

  /** Custom base URL (overrides default) */
  baseUrl?: string
}

/**
 * Default configuration for API client
 */
const DEFAULT_CONFIG = {
  timeout: 30000,
  baseUrl: '',
} as const

/**
 * Request interceptor type
 */
type RequestInterceptor = (
  url: string,
  options: RequestInit
) => Promise<{ url: string; options: RequestInit }> | { url: string; options: RequestInit }

/**
 * Response interceptor type
 */
type ResponseInterceptor = (response: Response) => Promise<Response> | Response

/**
 * Registered interceptors
 */
const interceptors = {
  request: [] as RequestInterceptor[],
  response: [] as ResponseInterceptor[],
}

/**
 * Add a request interceptor
 *
 * @example
 * ```ts
 * addRequestInterceptor(async (url, options) => {
 *   const token = await getAuthToken()
 *   options.headers = new Headers(options.headers)
 *   options.headers.set('Authorization', `Bearer ${token}`)
 *   return { url, options }
 * })
 * ```
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  interceptors.request.push(interceptor)
  return () => {
    const index = interceptors.request.indexOf(interceptor)
    if (index > -1) {
      interceptors.request.splice(index, 1)
    }
  }
}

/**
 * Add a response interceptor
 *
 * @example
 * ```ts
 * addResponseInterceptor(async (response) => {
 *   // Log all responses
 *   console.log('Response:', response.status, response.url)
 *   return response
 * })
 * ```
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  interceptors.response.push(interceptor)
  return () => {
    const index = interceptors.response.indexOf(interceptor)
    if (index > -1) {
      interceptors.response.splice(index, 1)
    }
  }
}

/**
 * Create a fetch request with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(url, timeout)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Parse error response body
 */
async function parseErrorBody(
  response: Response
): Promise<{ message: string; code?: string; details?: unknown }> {
  const defaultMessage = `HTTP ${response.status}: ${response.statusText}`

  try {
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      const body = await response.json()
      return {
        message: body.message ?? body.error ?? defaultMessage,
        code: body.code,
        details: body.details ?? body.errors ?? body,
      }
    }

    // Try to get text body for non-JSON responses
    const text = await response.text()
    return {
      message: text || defaultMessage,
    }
  } catch {
    return { message: defaultMessage }
  }
}

/**
 * Main API fetch function with interception and error handling
 *
 * @param url - The URL to fetch
 * @param options - Fetch options with additional configuration
 * @returns Promise resolving to the parsed response
 * @throws {ApiError} When server returns non-2xx response
 * @throws {NetworkError} When network request fails
 * @throws {TimeoutError} When request exceeds timeout
 */
export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    timeout = DEFAULT_CONFIG.timeout,
    skipContentType = false,
    baseUrl = DEFAULT_CONFIG.baseUrl,
    body,
    ...fetchOptions
  } = options

  // Build full URL
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url

  // Prepare headers
  const headers = new Headers(fetchOptions.headers)

  // Add default Content-Type for JSON
  if (!skipContentType && !headers.has('Content-Type') && body) {
    headers.set('Content-Type', 'application/json')
  }

  // Add request ID for tracing
  const requestId = crypto.randomUUID()
  headers.set('X-Request-ID', requestId)

  // Add auth token if available
  const token = localStorage.getItem('authToken')
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Prepare body
  let processedBody: RequestInit['body'] = undefined
  if (body) {
    if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
      processedBody = JSON.stringify(body)
    } else {
      processedBody = body as RequestInit['body']
    }
  }

  // Build request options
  let requestOptions: RequestInit = {
    ...fetchOptions,
    headers,
    body: processedBody,
  }

  // ===== REQUEST INTERCEPTORS =====
  const requestStart = performance.now()
  let processedUrl = fullUrl

  for (const interceptor of interceptors.request) {
    const result = await interceptor(processedUrl, requestOptions)
    processedUrl = result.url
    requestOptions = result.options
  }

  // Log request (in development)
  if (import.meta.env.DEV) {
    console.debug('[API Request]', {
      url: processedUrl,
      method: requestOptions.method ?? 'GET',
      requestId,
    })
  }

  // ===== EXECUTE REQUEST =====
  let response: Response

  try {
    response = await fetchWithTimeout(processedUrl, requestOptions, timeout)
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw error
    }

    // Network error (no internet, DNS failure, CORS, etc.)
    throw new NetworkError(
      'Unable to connect to the server. Please check your internet connection.',
      error instanceof Error ? error : undefined
    )
  }

  // ===== RESPONSE INTERCEPTORS =====
  for (const interceptor of interceptors.response) {
    response = await interceptor(response)
  }

  const duration = performance.now() - requestStart

  // Log response (in development)
  if (import.meta.env.DEV) {
    console.debug('[API Response]', {
      url: processedUrl,
      status: response.status,
      duration: `${duration.toFixed(0)}ms`,
      requestId,
    })
  }

  // ===== ERROR HANDLING =====
  if (!response.ok) {
    const { message, code, details } = await parseErrorBody(response)
    throw new ApiError(message, response.status, code, details, requestId)
  }

  // ===== SUCCESS HANDLING =====

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T
  }

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return (await response.text()) as T
  }

  return response.json()
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  /**
   * GET request
   */
  get<T>(url: string, options?: Omit<ApiFetchOptions, 'method' | 'body'>): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'GET' })
  },

  /**
   * POST request
   */
  post<T>(url: string, body?: ApiFetchOptions['body'], options?: Omit<ApiFetchOptions, 'method' | 'body'>): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'POST', body })
  },

  /**
   * PUT request
   */
  put<T>(url: string, body?: ApiFetchOptions['body'], options?: Omit<ApiFetchOptions, 'method' | 'body'>): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'PUT', body })
  },

  /**
   * PATCH request
   */
  patch<T>(url: string, body?: ApiFetchOptions['body'], options?: Omit<ApiFetchOptions, 'method' | 'body'>): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'PATCH', body })
  },

  /**
   * DELETE request
   */
  delete<T>(url: string, options?: Omit<ApiFetchOptions, 'method'>): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'DELETE' })
  },
}

export default apiFetch
