/**
 * MSW Browser Setup (Development)
 *
 * This worker is used in the browser during development.
 * It uses a Service Worker to intercept requests.
 *
 * To enable mocking in development:
 * 1. Set VITE_USE_MOCKS=true in .env.development
 * 2. Run: npx msw init public/ --save
 * 3. The worker is started conditionally in src/main.tsx
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Create the browser worker with the same handlers
export const worker = setupWorker(...handlers)
