import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout'
import { useUserName } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'

export const Route = createFileRoute('/_authenticated/_app')({
  component: AppLayout,
})

// Navigation configuration
const navGroups = [
  {
    title: 'Trade Activity Reports',
    items: [
      { label: 'Block Level', to: '/trade-activity/block-level' },
      { label: 'Allocation Level', to: '/trade-activity/allocation-level' },
      { label: 'Summary', to: '/trade-activity/summary' },
    ],
  },
]

// Main app layout with sidebar and header
function AppLayout() {
  // Using Zustand selector for synchronous access to user name
  // This avoids loading states and only re-renders when name changes
  const userName = useUserName()
  const logoutMutation = useLogout()

  return (
    <div className="app-layout">
      <Sidebar navGroups={navGroups} />

      <div className="app-main">
        <header className="app-header">
          <h1>Harmony App</h1>
          <div className="app-header-user">
            {userName && (
              <>
                <span className="user-greeting">Welcome, {userName}</span>
                <button
                  className="logout-button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </button>
              </>
            )}
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
