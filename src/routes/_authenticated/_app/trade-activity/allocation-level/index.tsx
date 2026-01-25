import { createFileRoute, redirect } from '@tanstack/react-router'

// When user visits /trade-activity/allocation-level/, redirect to default tab (fx-cash)
export const Route = createFileRoute('/_authenticated/_app/trade-activity/allocation-level/')({
  beforeLoad: () => {
    throw redirect({
      to: '/trade-activity/allocation-level/fx-cash',
    })
  },
})
