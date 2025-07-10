import { Toggle } from './ui/toggle'
import type { Server } from '@/lib/schemas'
import { Plug } from 'lucide-react'
import { Button } from './ui/button'

interface ServerToggleProps {
  server: Server
  isSelected: boolean
  onToggle: (serverId: string) => void
  disabled?: boolean
  onDisconnect?: (serverId: string) => void
}

const StatusIndicator = ({ status }: { status: Server['status'] }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-orange-600'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const animate = status === 'connecting' ? 'animate-pulse' : ''
  return (
    <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${animate}`} />
  )
}

export function ServerToggle({
  server,
  isSelected,
  onToggle,
  disabled = false,
  onDisconnect,
}: ServerToggleProps) {
  const isConnected = server.status === 'connected'
  const isConnecting = server.status === 'connecting'
  const serverLabel = `${server.name} - ${isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Click to connect'}`
  const disconnectLabel = `Disconnect from ${server.name}`
  const showDisconnect =
    server.status === 'connected' && server.needs_oauth && onDisconnect

  return (
    <div
      className={`flex items-center ${showDisconnect ? 'gap-0' : 'gap-0.5'}`}
    >
      <Toggle
        isSelected={isSelected}
        onToggle={() => onToggle(server.id)}
        disabled={disabled || isConnecting}
        className={[
          !isConnected || isConnecting
            ? 'border border-gray-300 bg-gray-50 text-gray-500'
            : '',
          showDisconnect ? 'rounded-r-none border-r-0' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={serverLabel}
        aria-pressed={isSelected}
        aria-label={serverLabel}
      >
        <div className="flex items-center gap-1.5">
          <StatusIndicator status={server.status} />
          {server.logo_url && (
            <img src={server.logo_url} alt="" className="w-3 h-3 rounded" />
          )}
          <span className="text-sm" aria-hidden="true">
            {server.name}
          </span>
        </div>
      </Toggle>
      {showDisconnect && (
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onDisconnect(server.id)
          }}
          disabled={disabled || isConnecting}
          variant="outline"
          size="sm"
          className="
                    h-8 w-8 p-0 rounded-l-none -ml-px text-xs
                    hover:bg-red-50 hover:text-red-600 hover:border-red-300
                    dark:hover:bg-red-950 dark:hover:text-red-400 dark:hover:border-red-700
                  "
          aria-label={disconnectLabel}
          title={disconnectLabel}
        >
          <Plug className="w-3 h-3" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
