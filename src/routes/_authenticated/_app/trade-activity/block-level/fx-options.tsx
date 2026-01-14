import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level/fx-options'
)({
  component: FxOptionsTab,
})

// Tab content component
function FxOptionsTab() {
  return (
    <div className="tab-panel">
      <h3>FX Options Report</h3>
      <p>This is the FX Options tab content.</p>

      {/* Example table placeholder */}
      <table className="report-table">
        <thead>
          <tr>
            <th>Option ID</th>
            <th>Type</th>
            <th>Strike Price</th>
            <th>Expiry</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>OPT-001</td>
            <td>Call</td>
            <td>1.0850</td>
            <td>2024-03-15</td>
          </tr>
          <tr>
            <td>OPT-002</td>
            <td>Put</td>
            <td>1.0750</td>
            <td>2024-04-20</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
