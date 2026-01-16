import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/pages/public'

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})
