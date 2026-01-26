/**
 * Login Page
 *
 * Handles user authentication using TanStack Query mutations.
 * Demonstrates the complete auth flow with the api interceptors.
 *
 * Flow:
 * 1. User enters credentials
 * 2. useLogin mutation calls authApi.login()
 * 3. authApi.login() uses api.post() (from @/lib/api)
 * 4. Request interceptor adds headers (Content-Type, X-Request-ID)
 * 5. Server validates credentials
 * 6. Response interceptor handles success/error
 * 7. On success: tokens stored, session cache updated, redirect to app
 * 8. On error: MutationCache.onError logs globally, component shows error
 *
 * Reference: docs/harmony/16-tanstack-query-interceptors.md
 */

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLogin, getLoginErrorMessage } from '@/hooks/useAuth'
import { isApiError } from '@/lib/api'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const loginMutation = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Don't submit if already loading
    if (loginMutation.isPending) return

    loginMutation.mutate({
      email,
      password,
      rememberMe,
    })
  }

  // Check if it's a specific auth error that needs special handling
  const isAccountLocked =
    loginMutation.error && isApiError(loginMutation.error) && loginMutation.error.code === 'ACCOUNT_LOCKED'

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to Harmony Trading Platform</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Error Display */}
          {loginMutation.isError && (
            <div className={`${styles.alert} ${isAccountLocked ? styles.alertWarning : styles.alertError}`}>
              <span className={styles.alertIcon}>{isAccountLocked ? '🔒' : '⚠️'}</span>
              <span>{getLoginErrorMessage(loginMutation.error)}</span>
            </div>
          )}

          {/* Email Field */}
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loginMutation.isPending}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          {/* Password Field */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
              autoComplete="current-password"
              required
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className={styles.formOptions}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loginMutation.isPending}
              />
              <span>Remember me</span>
            </label>
            <Link to="/login" className={styles.link}>
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button type="submit" className={styles.submitButton} disabled={loginMutation.isPending}>
            {loginMutation.isPending ? (
              <>
                <span className={styles.spinner} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className={styles.demoCredentials}>
          <p className={styles.demoTitle}>Demo Credentials</p>
          <p className={styles.demoText}>
            Email: <code>demo@harmony.com</code>
          </p>
          <p className={styles.demoText}>
            Password: <code>demo123</code>
          </p>
        </div>
      </div>
    </div>
  )
}
