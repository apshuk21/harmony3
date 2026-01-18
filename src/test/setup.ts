/**
 * Test Setup File
 *
 * This file runs before each test and configures:
 * - Jest DOM matchers for Vitest
 * - MSW server for API mocking
 * - Cleanup after each test
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from '../mocks/server'

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  })
})

// Reset handlers after each test (important for test isolation)
afterEach(() => {
  server.resetHandlers()
  cleanup() // Clean up React Testing Library
})

// Clean up after all tests
afterAll(() => {
  server.close()
})
