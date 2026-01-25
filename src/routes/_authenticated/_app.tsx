import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout'

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
  return (
    <div className="app-layout">
      <Sidebar navGroups={navGroups} />

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
