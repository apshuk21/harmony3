/**
 * MSW Server Setup (Node.js - Tests)
 *
 * This server is used in the test environment.
 * It intercepts requests made during tests and returns mock responses.
 *
 * Usage in tests:
 * - The server is automatically started/stopped via src/test/setup.ts
 * - Use server.use() to override handlers for specific tests
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Create the server instance with handlers
export const server = setupServer(...handlers)
