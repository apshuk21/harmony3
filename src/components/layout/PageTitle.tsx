import type { ReactNode } from 'react'
import styles from './PageTitle.module.css'

interface PageTitleProps {
  /** Breadcrumb items - array of strings */
  breadcrumbs?: string[]
  /** Page title */
  title: string
  /** Optional action buttons on the right */
  actions?: ReactNode
}

/**
 * Page title section with 78px fixed height
 * Contains breadcrumbs at top and title at bottom
 */
export function PageTitle({ breadcrumbs, title, actions }: PageTitleProps) {
  return (
    <div className={styles.pageTitle}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index > 0 && <span className={styles.separator}>/</span>}
              <span className={index === breadcrumbs.length - 1 ? styles.current : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
