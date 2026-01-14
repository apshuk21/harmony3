import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  // This runs before the route loads
  // In a real app, you'd check if user is authenticated
  beforeLoad: async () => {
    const isAuthenticated = checkAuth()

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AuthenticatedLayout,
})

// Simple auth check - replace with real auth logic later
function checkAuth(): boolean {
  // For demo purposes, always return true
  // In real app: check token, session, etc.
  return true
}

function AuthenticatedLayout() {
  // This layout just passes through to children
  // The actual app layout (sidebar, header) is in _app.tsx
  return <Outlet />
}
