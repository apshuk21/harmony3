import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/queryClient'
import { env } from './lib/env'
import './index.css'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/**
 * Enable MSW mocking in development
 * Reference: docs/harmony/07-test-setup-guide.md
 */
async function enableMocking() {
  if (env.MODE === 'development' && env.VITE_USE_MOCKS) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
  return Promise.resolve()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  )
})
