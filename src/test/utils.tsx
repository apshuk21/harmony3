/* eslint-disable react-refresh/only-export-components */
/**
 * Test Utilities
 *
 * Custom render function that wraps components with all necessary providers.
 * Use this instead of importing directly from @testing-library/react.
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

/**
 * Create a fresh QueryClient for each test
 * This ensures test isolation - no shared cache between tests
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        gcTime: 0, // Disable garbage collection
      },
    },
  })
}

interface WrapperProps {
  children: ReactNode
}

/**
 * Provider wrapper that includes all app providers
 * Add more providers here as needed (Router, Theme, etc.)
 */
function AllTheProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

/**
 * Custom render function that wraps components with providers
 *
 * Usage:
 * ```tsx
 * import { render, screen } from '@/test/utils'
 *
 * test('renders component', () => {
 *   render(<MyComponent />)
 *   expect(screen.getByText('Hello')).toBeInTheDocument()
 * })
 * ```
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export everything from testing-library except render (we override it)
export {
  screen,
  waitFor,
  within,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Export custom render as render
export { customRender as render }
