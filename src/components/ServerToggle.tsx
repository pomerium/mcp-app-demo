import { Toggle } from './ui/toggle'
import type { Server } from '@/lib/schemas'

interface ServerToggleProps {
  server: Server
  isSelected: boolean
  onToggle: (serverId: string) => void
  disabled?: boolean
}

const StatusIndicator = ({ status }: { status: Server['status'] }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-orange-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  return <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
}

export function ServerToggle({
  server,
  isSelected,
  onToggle,
  disabled = false,
}: ServerToggleProps) {
  const isConnected = server.status === 'connected'

  return (
    <Toggle
      isSelected={isSelected}
      onToggle={() => onToggle(server.id)}
      disabled={disabled}
      className={!isConnected ? 'opacity-70' : ''}
      title={`${server.name} - ${isConnected ? 'Connected' : 'Click to connect'}`}
    >
      <div className="flex items-center gap-1.5">
        {server.logo_url && (
          <img src={server.logo_url} alt="" className="w-3 h-3 rounded" />
        )}
        <StatusIndicator status={server.status} />
        <span>{server.name}</span>
        {!isConnected && !disabled && (
          <span className="text-xs opacity-70">(Click to connect)</span>
        )}
      </div>
    </Toggle>
  )
}
