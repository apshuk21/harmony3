import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface Tab {
  label: string
  to: string
}

interface TabLayoutProps {
  tabs: Tab[]
  children: ReactNode // The <Outlet />
}

/**
 * Reusable tab navigation layout
 * Renders tab links and content area
 */
export function TabLayout({ tabs, children }: TabLayoutProps) {
  return (
    <>
      <nav className="tab-nav">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="tab-link"
            activeProps={{ className: 'tab-link active' }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="tab-content">{children}</div>
    </>
  )
}
