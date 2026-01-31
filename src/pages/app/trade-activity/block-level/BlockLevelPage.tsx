import { Outlet } from '@tanstack/react-router'
import { PageLayout, TabLayout } from '@/components/layout'

/**
 * Tab configuration for Block Level page
 * TODO: Counts will be fetched from API in the future
 */
const tabs = [
  { label: 'FX Cash', to: '/trade-activity/block-level/fx-cash', count: 100 },
  { label: 'FX Options', to: '/trade-activity/block-level/fx-options', count: 45 },
]

/**
 * Block Level page layout with tabs
 * Uses composition with PageLayout and TabLayout
 */
export function BlockLevelPage() {
  return (
    <PageLayout
      title="Block Level Report"
      description="View block level trade activity reports"
    >
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </PageLayout>
  )
}
