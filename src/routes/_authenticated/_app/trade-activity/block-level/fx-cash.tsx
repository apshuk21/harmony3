import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FxCashTab } from '@/pages/app/trade-activity/block-level'

/**
 * Search params schema for FX Cash tab
 * Validates and provides defaults for URL query parameters
 *
 * Example URLs:
 * - /trade-activity/block-level/fx-cash
 * - /trade-activity/block-level/fx-cash?status=confirmed
 * - /trade-activity/block-level/fx-cash?status=pending&search=USD&page=2
 *
 * Reference: docs/harmony/15-zod-validation-guide.md
 */
const fxCashSearchSchema = z.object({
  // Pagination
  page: z.number().int().positive().catch(1),

  // Filter by status
  status: z.enum(['all', 'pending', 'confirmed', 'cancelled']).catch('all'),

  // Search query
  search: z.string().optional(),

  // Sort column and direction
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Export the type for use in components
export type FxCashSearchParams = z.infer<typeof fxCashSearchSchema>

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-cash'
)({
  // Validate search params with Zod schema
  validateSearch: fxCashSearchSchema,
  component: FxCashTab,
})
