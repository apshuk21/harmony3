/**
 * Auth API Functions
 *
 * API functions for authentication operations.
 * Uses the centralized api client from @/lib/api.
 *
 * @example
 * ```ts
 * import { authApi } from '@/api/auth'
 *
 * // Login
 * const response = await authApi.login({ email, password })
 *
 * // Get current session
 * const user = await authApi.getSession()
 *
 * // Logout
 * await authApi.logout()
 * ```
 */

import { api, isApiError } from '@/lib/api'
import type { LoginCredentials, LoginResponse, SessionResponse, User } from '@/types/auth'

/**
 * Auth token storage key
 */
const AUTH_TOKEN_KEY = 'authToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

/**
 * Store auth tokens in localStorage
 */
function storeTokens(token: string, refreshToken?: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

/**
 * Clear auth tokens from localStorage
 */
function clearTokens(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Check if user is authenticated (has token)
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

/**
 * Auth API endpoints
 */
export const authApi = {
  /**
   * Login with email and password
   *
   * @param credentials - User credentials (email, password)
   * @returns Login response with user info and tokens
   * @throws {ApiError} When credentials are invalid or account is locked
   *
   * @example
   * ```ts
   * try {
   *   const { user, token } = await authApi.login({
   *     email: 'user@example.com',
   *     password: 'password123'
   *   })
   *   console.log('Logged in as:', user.name)
   * } catch (error) {
   *   if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') {
   *     console.log('Wrong email or password')
   *   }
   * }
   * ```
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials)

    // Store tokens on successful login
    storeTokens(response.token, response.refreshToken)

    return response
  },

  /**
   * Logout current user
   *
   * Clears local tokens and invalidates server session.
   *
   * @example
   * ```ts
   * await authApi.logout()
   * // User is now logged out, redirect to login page
   * ```
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      // Always clear tokens, even if server request fails
      clearTokens()
    }
  },

  /**
   * Get current user session
   *
   * Returns the current user if authenticated, null otherwise.
   * Does not throw on 401 - returns null instead.
   *
   * @example
   * ```ts
   * const user = await authApi.getSession()
   * if (user) {
   *   console.log('Logged in as:', user.name)
   * } else {
   *   console.log('Not logged in')
   * }
   * ```
   */
  getSession: async (): Promise<User | null> => {
    // If no token, don't even make the request
    if (!isAuthenticated()) {
      return null
    }

    try {
      const response = await api.get<SessionResponse>('/api/auth/session')
      return response.user
    } catch (error) {
      // 401 means not authenticated - return null instead of throwing
      if (isApiError(error) && error.isAuthError()) {
        clearTokens() // Clear invalid tokens
        return null
      }
      throw error
    }
  },

  /**
   * Refresh the auth token
   *
   * Uses the refresh token to get a new access token.
   *
   * @example
   * ```ts
   * try {
   *   await authApi.refreshToken()
   *   // Token refreshed, retry the failed request
   * } catch (error) {
   *   // Refresh failed, redirect to login
   * }
   * ```
   */
  refreshToken: async (): Promise<LoginResponse> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post<LoginResponse>('/api/auth/refresh', {
      refreshToken,
    })

    // Store new tokens
    storeTokens(response.token, response.refreshToken)

    return response
  },
}

export default authApi
