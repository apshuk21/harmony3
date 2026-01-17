import { createFileRoute } from '@tanstack/react-router'
import { BlockLevelPage } from '@/pages/app/trade-activity/block-level'

export const Route = createFileRoute('/_authenticated/_app/trade-activity/block-level')({
  component: BlockLevelPage,
})
