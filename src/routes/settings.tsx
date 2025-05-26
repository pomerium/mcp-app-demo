import { ServerSettings } from '@/components/ServerSettings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ServerSettings />
}
