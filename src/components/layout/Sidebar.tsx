import { Link } from '@tanstack/react-router'

interface NavItem {
  label: string
  to: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

interface SidebarProps {
  title?: string
  navGroups: NavGroup[]
}

export function Sidebar({ title = 'Harmony', navGroups }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>{title}</h2>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.title} className="nav-group">
            <h3 className="nav-group-title">{group.title}</h3>
            <ul className="nav-group-items">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="nav-link"
                    activeProps={{ className: 'nav-link active' }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/logout" className="nav-link">
          Logout
        </Link>
      </div>
    </aside>
  )
}
