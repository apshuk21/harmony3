import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-cash'
)({
  component: FxCashTab,
})

// Tab content component
function FxCashTab() {
  return (
    <div className="tab-panel">
      <h3>FX Cash Report</h3>
      <p>This is the FX Cash tab content.</p>

      {/* Example table placeholder */}
      <table className="report-table">
        <thead>
          <tr>
            <th>Trade ID</th>
            <th>Currency Pair</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>TRD-001</td>
            <td>USD/EUR</td>
            <td>1,000,000</td>
            <td>Completed</td>
          </tr>
          <tr>
            <td>TRD-002</td>
            <td>GBP/USD</td>
            <td>500,000</td>
            <td>Pending</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
