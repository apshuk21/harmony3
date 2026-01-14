import { createFileRoute } from '@tanstack/react-router'
import { LogoutPage } from '../../pages/LogoutPage'

export const Route = createFileRoute('/_public/logout')({
  component: LogoutPage,
})
