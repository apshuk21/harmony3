import type { ReactNode } from 'react'

interface PageLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

/**
 * Reusable page layout wrapper
 * Provides consistent page header styling
 */
export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="page">
      <header className="page-header">
        <h2>{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </header>
      {children}
    </div>
  )
}
