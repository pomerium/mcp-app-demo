import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { RefreshCw, Check } from 'lucide-react'
import {
  pomeriumRoutesResponseSchema,
  type Server,
  type Servers,
} from '../lib/schemas'

type ServerSelectorProps = {
  servers: Servers
  onServersChange: (servers: Servers) => void
  selectedServers: string[]
  onServerToggle: (serverId: string) => void
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

export function ServerSelector({
  servers,
  onServersChange,
  selectedServers,
  onServerToggle,
  disabled = false,
}: ServerSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Fetch servers from Pomerium MCP endpoint
  const fetchPomeriumServers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/.pomerium/mcp/routes')
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.status}`)
      }

      const data = await response.json()
      const result = pomeriumRoutesResponseSchema.safeParse(data)

      if (!result.success) {
        throw new Error('Invalid server data format')
      }

      // Convert Pomerium server info to our local server format
      const newServers: Servers = {}
      result.data.servers.forEach((serverInfo) => {
        const id = serverInfo.url // Use URL as unique identifier
        // Extract hostname from URL as fallback name if name is not provided
        const fallbackName =
          new URL(serverInfo.url).hostname.split('.')[0] || 'Unknown Server'
        const server: Server = {
          id,
          name: serverInfo.name || fallbackName,
          description: serverInfo.description,
          logo_url: serverInfo.logo_url,
          url: serverInfo.url,
          status: serverInfo.connected ? 'connected' : 'disconnected',
          connected: serverInfo.connected,
        }
        newServers[id] = server
      })

      onServersChange(newServers)
    } catch (error) {
      console.error('Failed to fetch servers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load servers on component mount
  useEffect(() => {
    fetchPomeriumServers()
  }, [])

  const connectToServer = async (serverId: string) => {
    const server = servers[serverId]
    if (!server) return

    // Use Pomerium MCP connection flow
    const currentUrl = window.location.href
    const connectUrl = `${server.url}/.pomerium/mcp/connect?redirect_url=${encodeURIComponent(currentUrl)}`

    // Redirect to the connection URL - this will handle the OAuth flow
    window.location.href = connectUrl
  }

  const handleServerClick = (serverId: string) => {
    const server = servers[serverId]
    if (!server) return

    if (server.status === 'connected') {
      onServerToggle(serverId)
    } else {
      connectToServer(serverId)
    }
  }

  const serverList = Object.values(servers).sort((a, b) =>
    a.url.localeCompare(b.url),
  )

  if (serverList.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-background p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Available Servers
          </span>
          {disabled && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              (Selection locked after first message)
            </span>
          )}
        </div>
        <Button
          onClick={fetchPomeriumServers}
          disabled={isLoading || disabled}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {isLoading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading servers...
          </div>
        )}

        {serverList.map((server) => {
          const isSelected = selectedServers.includes(server.id)
          const isConnected = server.status === 'connected'

          return (
            <Button
              key={server.id}
              onClick={() => handleServerClick(server.id)}
              disabled={disabled}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={`
                flex items-center gap-2 text-xs transition-all
                ${isSelected ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                ${!isConnected ? 'opacity-70' : ''}
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-1.5">
                {server.logo_url && (
                  <img
                    src={server.logo_url}
                    alt={`${server.name} logo`}
                    className="w-3 h-3 rounded"
                  />
                )}
                <StatusIndicator status={server.status} />
                <span>{server.name}</span>
                {isSelected && <Check className="w-3 h-3" />}
                {!isConnected && !disabled && (
                  <span className="text-xs opacity-70">(Click to connect)</span>
                )}
              </div>
            </Button>
          )
        })}
      </div>

      {serverList.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {disabled
            ? 'Server selection is locked for this conversation'
            : 'Click connected servers to toggle selection, disconnected servers to connect'}
        </p>
      )}
    </div>
  )
}
