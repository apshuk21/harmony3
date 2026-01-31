import { Outlet } from '@tanstack/react-router'
import { PageLayout, TabLayout } from '@/components/layout'

const tabs = [
  { label: 'FX Cash', to: '/trade-activity/allocation-level/fx-cash' },
  { label: 'FX Options', to: '/trade-activity/allocation-level/fx-options' },
]

/**
 * Allocation Level page layout with tabs
 *
 * Layout structure:
 * - PageTitle: 78px fixed (breadcrumbs + title)
 * - TabSection: remaining height
 */
export function AllocationLevelPage() {
  return (
    <PageLayout
      title="Allocation Level"
      breadcrumbs={['Overview', 'Trade Activity', 'Allocation Level']}
    >
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </PageLayout>
  )
}
