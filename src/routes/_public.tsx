import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

// Simple layout for public pages (login, logout)
// No sidebar, just centered content
function PublicLayout() {
  return (
    <div className="public-layout">
      <div className="public-container">
        <Outlet />
      </div>
    </div>
  )
}
