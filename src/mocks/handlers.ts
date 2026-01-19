/**
 * Combined Handlers
 *
 * This file combines all handler modules into a single array.
 * Used by both server.ts (tests) and browser.ts (development).
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import { tradeHandlers } from './handlers/trades'
import { fxCashHandlers } from './handlers/fx-cash'
import { fxOptionsHandlers } from './handlers/fx-options'

// Import other handlers as they are created:
// import { userHandlers } from './handlers/users'
// import { authHandlers } from './handlers/auth'

export const handlers = [
  ...tradeHandlers,
  ...fxCashHandlers,
  ...fxOptionsHandlers,
  // ...userHandlers,
  // ...authHandlers,
]
