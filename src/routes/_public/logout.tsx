import { createFileRoute } from '@tanstack/react-router'
import { LogoutPage } from '@/pages/public'

export const Route = createFileRoute('/_public/logout')({
  component: LogoutPage,
})
