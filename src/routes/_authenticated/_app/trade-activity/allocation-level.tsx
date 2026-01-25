import { createFileRoute } from '@tanstack/react-router'
import { AllocationLevelPage } from '@/pages/app/trade-activity/allocation-level'

export const Route = createFileRoute('/_authenticated/_app/trade-activity/allocation-level')({
  component: AllocationLevelPage,
})
