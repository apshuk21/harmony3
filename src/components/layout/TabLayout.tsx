import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import styles from './TabLayout.module.css'

interface Tab {
  label: string
  to: string
  /** Optional count badge - will be fetched from API later */
  count?: number
}

interface TabLayoutProps {
  tabs: Tab[]
  children: ReactNode // The <Outlet />
}

/**
 * Reusable tab navigation layout
 * Tabs sit on top of white card, connected visually
 * Supports optional count badge for each tab
 */
export function TabLayout({ tabs, children }: TabLayoutProps) {
  return (
    <div className={styles.tabLayoutWrapper}>
      {/* Tabs on gray background */}
      <nav className={styles.tabNav}>
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={styles.tabLink}
            activeProps={{ className: `${styles.tabLink} ${styles.tabLinkActive}` }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={styles.tabCount}>{tab.count}</span>
            )}
          </Link>
        ))}
      </nav>
      {/* White card with content */}
      <div className={styles.tabCard}>
        <div className="tab-content">{children}</div>
      </div>
    </div>
  )
}
