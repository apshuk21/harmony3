import { createFileRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/_app/trade-activity/block-level'
)({
  component: BlockLevelLayout,
})

// This is a LAYOUT route - it renders tabs and an Outlet for tab content
function BlockLevelLayout() {
  return (
    <div className="page">
      {/* Page header - common across all tabs */}
      <header className="page-header">
        <h2>Block Level Report</h2>
        <p className="page-description">
          View block level trade activity reports
        </p>
      </header>

      {/* Tab navigation */}
      <nav className="tab-nav">
        <Link
          to="/trade-activity/block-level/fx-cash"
          className="tab-link"
          activeProps={{ className: 'tab-link active' }}
        >
          FX Cash
        </Link>
        <Link
          to="/trade-activity/block-level/fx-options"
          className="tab-link"
          activeProps={{ className: 'tab-link active' }}
        >
          FX Options
        </Link>
      </nav>

      {/* Tab content - child routes render here */}
      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  )
}
