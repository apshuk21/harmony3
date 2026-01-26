/**
 * Authentication Types
 *
 * Type definitions for authentication-related data structures.
 */

/**
 * User information returned from auth endpoints
 */
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  avatar?: string
  lastLoginAt?: string
}

/**
 * Credentials for login request
 */
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Response from successful login
 */
export interface LoginResponse {
  user: User
  token: string
  refreshToken?: string
  expiresAt: string
}

/**
 * Response from session check
 */
export interface SessionResponse {
  user: User
  expiresAt: string
}

/**
 * Error codes returned by auth API
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'

/**
 * Auth error details from API
 */
export interface AuthErrorDetails {
  code: AuthErrorCode
  attemptsRemaining?: number
  lockoutEndsAt?: string
  message: string
}
