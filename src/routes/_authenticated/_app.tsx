import { createFileRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_app')({
  component: AppLayout,
})

// Main app layout with sidebar and header
function AppLayout() {
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Harmony</h2>
        </div>

        <nav className="sidebar-nav">
          {/* Trade Activity Group */}
          <div className="nav-group">
            <h3 className="nav-group-title">Trade Activity Reports</h3>
            <ul className="nav-group-items">
              <li>
                <Link
                  to="/trade-activity/block-level"
                  className="nav-link"
                  activeProps={{ className: 'nav-link active' }}
                >
                  Block Level
                </Link>
              </li>
              <li>
                <Link
                  to="/trade-activity/summary"
                  className="nav-link"
                  activeProps={{ className: 'nav-link active' }}
                >
                  Summary
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Logout at bottom */}
        <div className="sidebar-footer">
          <Link to="/logout" className="nav-link">
            Logout
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="app-main">
        <header className="app-header">
          <h1>Harmony App</h1>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
