import { createFileRoute } from '@tanstack/react-router'
import { FxOptionsTab } from '@/pages/app/trade-activity/allocation-level'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/allocation-level/fx-options'
)({
  component: FxOptionsTab,
})
