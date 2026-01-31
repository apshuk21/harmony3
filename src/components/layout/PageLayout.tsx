import type { ReactNode } from 'react'
import { PageTitle } from './PageTitle'

interface PageLayoutProps {
  /** Page title */
  title: string
  /** Breadcrumb items */
  breadcrumbs?: string[]
  /** Optional action buttons */
  actions?: ReactNode
  /** Page content (usually TabLayout or direct content) */
  children: ReactNode
}

/**
 * Reusable page layout wrapper
 * Structure:
 * - PageTitle: 78px fixed height
 * - Tab Section: remaining height (flex: 1)
 *
 * No page-level scroll - content fills available space
 */
export function PageLayout({ title, breadcrumbs, actions, children }: PageLayoutProps) {
  return (
    <div className="page">
      {/* Title Section - 78px fixed */}
      <PageTitle
        title={title}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />

      {/* Tab Section - remaining height */}
      <div className="tab-section">
        {children}
      </div>
    </div>
  )
}
