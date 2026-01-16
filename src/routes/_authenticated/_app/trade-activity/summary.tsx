import { createFileRoute } from '@tanstack/react-router'
import { SummaryPage } from '@/pages/app/trade-activity/summary'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/summary'
)({
  component: SummaryPage,
})
