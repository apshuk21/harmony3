import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/summary'
)({
  component: SummaryPage,
})

// Summary page - no tabs, just a simple page
function SummaryPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h2>Summary Report</h2>
      </header>

      <div className="page-content">
        <p>This is the Summary page. It has no tabs.</p>
        <p>This demonstrates a simple page without tab navigation.</p>
      </div>
    </div>
  )
}
