import { Outlet } from '@tanstack/react-router'
import { PageLayout, TabLayout } from '@/components/layout'

const tabs = [
  { label: 'FX Cash', to: '/trade-activity/allocation-level/fx-cash' },
  { label: 'FX Options', to: '/trade-activity/allocation-level/fx-options' },
]

/**
 * Block Level page layout with tabs
 * Uses composition with PageLayout and TabLayout
 */
export function AllocationLevelPage() {
  return (
    <PageLayout
      title="Allocation Level Report"
      description="View allocation level trade activity reports"
    >
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </PageLayout>
  )
}
