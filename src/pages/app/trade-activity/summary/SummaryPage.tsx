import { PageLayout } from '@/components/layout'

/**
 * Summary page - no tabs, just a simple page
 * Uses PageLayout for consistent styling
 */
export function SummaryPage() {
  return (
    <PageLayout title="Summary Report">
      <div className="page-content">
        <p>This is the Summary page. It has no tabs.</p>
        <p>This demonstrates a simple page without tab navigation.</p>
      </div>
    </PageLayout>
  )
}
