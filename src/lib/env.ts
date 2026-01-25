import { z } from 'zod'

/**
 * Environment Variable Validation with Zod
 *
 * This module validates environment variables at application startup.
 * If any required variable is missing or invalid, the app fails fast
 * with a clear error message instead of failing later with cryptic errors.
 *
 * Reference: docs/harmony/15-zod-validation-guide.md
 */

// Schema for environment variables
const envSchema = z.object({
  // Mode: 'development' | 'production' | 'test'
  MODE: z.enum(['development', 'production', 'test']),

  // Base URL for the app
  BASE_URL: z.string(),

  // Whether to use MSW mocks (development only)
  // .default() must come BEFORE .transform() since default is the raw string value
  VITE_USE_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),

  // API base URL (optional - defaults to relative path)
  VITE_API_URL: z.string().url().optional(),

  // Feature flags (optional)
  VITE_ENABLE_DEVTOOLS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
})

// Infer the type from the schema
type Env = z.infer<typeof envSchema>

/**
 * Validate and parse environment variables
 * Throws a descriptive error if validation fails
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.format())
    throw new Error('Invalid environment variables. Check console for details.')
  }

  return result.data
}

/**
 * Validated environment variables
 * Use this instead of import.meta.env directly
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env'
 *
 * if (env.VITE_USE_MOCKS) {
 *   // Enable mocking
 * }
 *
 * fetch(`${env.VITE_API_URL}/users`)
 * ```
 */
export const env = validateEnv()

