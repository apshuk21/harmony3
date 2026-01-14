import { createFileRoute, redirect } from '@tanstack/react-router'

// When user visits /trade-activity/block-level, redirect to default tab
export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/trade-activity/block-level/fx-cash',
    })
  },
})
