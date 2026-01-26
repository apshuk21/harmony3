/**
 * Auth Mock Handlers
 *
 * MSW handlers for authentication endpoints.
 * Simulates a realistic auth flow with various error scenarios.
 *
 * Reference: docs/harmony/16-tanstack-query-interceptors.md
 */

import { http, HttpResponse, delay } from 'msw'
import type { LoginCredentials, LoginResponse, SessionResponse, User } from '@/types/auth'

/**
 * Demo users for testing different scenarios
 */
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'demo@harmony.com': {
    password: 'demo123',
    user: {
      id: 'user-1',
      email: 'demo@harmony.com',
      name: 'Demo User',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    },
  },
  'admin@harmony.com': {
    password: 'admin123',
    user: {
      id: 'user-2',
      email: 'admin@harmony.com',
      name: 'Admin User',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  },
  'locked@harmony.com': {
    password: 'locked123',
    user: {
      id: 'user-3',
      email: 'locked@harmony.com',
      name: 'Locked User',
      role: 'user',
    },
  },
}

/**
 * Track failed login attempts (for account lockout simulation)
 */
const failedAttempts: Record<string, { count: number; lastAttempt: number }> = {}

/**
 * Store active sessions (in-memory for mock)
 */
const activeSessions: Map<string, { user: User; expiresAt: Date }> = new Map()

/**
 * Generate a mock JWT token
 */
function generateToken(userId: string): string {
  const payload = {
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }
  return `mock-jwt-${btoa(JSON.stringify(payload))}`
}

/**
 * Check if account is locked
 */
function isAccountLocked(email: string): { locked: boolean; lockoutEndsAt?: string } {
  // Special case: locked@harmony.com is always locked
  if (email === 'locked@harmony.com') {
    const lockoutEnds = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    return { locked: true, lockoutEndsAt: lockoutEnds.toISOString() }
  }

  const attempts = failedAttempts[email]
  if (!attempts) return { locked: false }

  // Lock after 5 failed attempts within 15 minutes
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
  if (attempts.count >= 5 && attempts.lastAttempt > fifteenMinutesAgo) {
    const lockoutEnds = new Date(attempts.lastAttempt + 15 * 60 * 1000)
    return { locked: true, lockoutEndsAt: lockoutEnds.toISOString() }
  }

  // Reset counter if last attempt was more than 15 minutes ago
  if (attempts.lastAttempt < fifteenMinutesAgo) {
    delete failedAttempts[email]
  }

  return { locked: false }
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(email: string): number {
  if (!failedAttempts[email]) {
    failedAttempts[email] = { count: 0, lastAttempt: 0 }
  }
  failedAttempts[email].count++
  failedAttempts[email].lastAttempt = Date.now()
  return 5 - failedAttempts[email].count // Attempts remaining
}

/**
 * Clear failed attempts on successful login
 */
function clearFailedAttempts(email: string): void {
  delete failedAttempts[email]
}

/**
 * Auth handlers
 */
export const authHandlers = [
  /**
   * POST /api/auth/login
   *
   * Authenticates user with email and password.
   * Returns user info and tokens on success.
   */
  http.post('/api/auth/login', async ({ request }) => {
    // Simulate network delay
    await delay(500)

    const body = (await request.json()) as LoginCredentials
    const { email, password } = body

    // Check if account is locked
    const lockStatus = isAccountLocked(email)
    if (lockStatus.locked) {
      return HttpResponse.json(
        {
          code: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked due to too many failed attempts',
          details: { lockoutEndsAt: lockStatus.lockoutEndsAt },
        },
        { status: 403 }
      )
    }

    // Check credentials
    const demoUser = DEMO_USERS[email]
    if (!demoUser || demoUser.password !== password) {
      const attemptsRemaining = recordFailedAttempt(email)

      return HttpResponse.json(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          details: { attemptsRemaining },
        },
        { status: 401 }
      )
    }

    // Clear failed attempts on success
    clearFailedAttempts(email)

    // Generate tokens
    const token = generateToken(demoUser.user.id)
    const refreshToken = `refresh-${generateToken(demoUser.user.id)}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store session
    activeSessions.set(token, { user: demoUser.user, expiresAt })

    const response: LoginResponse = {
      user: {
        ...demoUser.user,
        lastLoginAt: new Date().toISOString(),
      },
      token,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    }

    return HttpResponse.json(response)
  }),

  /**
   * POST /api/auth/logout
   *
   * Logs out the current user.
   * Invalidates the session token.
   */
  http.post('/api/auth/logout', async ({ request }) => {
    await delay(200)

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      activeSessions.delete(token)
    }

    return new HttpResponse(null, { status: 204 })
  }),

  /**
   * GET /api/auth/session
   *
   * Returns the current user session if authenticated.
   * Returns 401 if not authenticated.
   */
  http.get('/api/auth/session', async ({ request }) => {
    await delay(100)

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          code: 'TOKEN_INVALID',
          message: 'No authorization token provided',
        },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const session = activeSessions.get(token)

    if (!session) {
      return HttpResponse.json(
        {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired or is invalid',
        },
        { status: 401 }
      )
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      activeSessions.delete(token)
      return HttpResponse.json(
        {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired',
        },
        { status: 401 }
      )
    }

    const response: SessionResponse = {
      user: session.user,
      expiresAt: session.expiresAt.toISOString(),
    }

    return HttpResponse.json(response)
  }),

  /**
   * POST /api/auth/refresh
   *
   * Refreshes the authentication token.
   */
  http.post('/api/auth/refresh', async ({ request }) => {
    await delay(200)

    const body = (await request.json()) as { refreshToken: string }

    // In a real app, you'd validate the refresh token
    // For demo, we just check if it looks valid
    if (!body.refreshToken?.startsWith('refresh-')) {
      return HttpResponse.json(
        {
          code: 'TOKEN_INVALID',
          message: 'Invalid refresh token',
        },
        { status: 401 }
      )
    }

    // For demo, use the first demo user
    const demoUser = DEMO_USERS['demo@harmony.com']
    const token = generateToken(demoUser.user.id)
    const refreshToken = `refresh-${generateToken(demoUser.user.id)}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    activeSessions.set(token, { user: demoUser.user, expiresAt })

    const response: LoginResponse = {
      user: demoUser.user,
      token,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    }

    return HttpResponse.json(response)
  }),
]

export default authHandlers
