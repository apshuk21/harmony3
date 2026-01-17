import { createFileRoute, redirect } from '@tanstack/react-router'

console.log('trade-activity index.tsx')

// When user visits /trade-activity, redirect to default page
export const Route = createFileRoute('/_authenticated/_app/trade-activity/')({
  beforeLoad: () => {
    throw redirect({
      to: '/trade-activity/block-level',
    })
  },
})
