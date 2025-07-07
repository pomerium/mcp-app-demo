import { useState, useEffect, useId } from 'react'
import { Button } from './ui/button'
import { RefreshCw, Check, Info, Wrench, Plug } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { useMediaQuery } from '../hooks/useMediaQuery'
import {
  pomeriumRoutesResponseSchema,
  type Server,
  type Servers,
} from '../lib/schemas'
import { useDisconnectServer } from '@/hooks/useDisconnectServer'

// Constants
const POMERIUM_ROUTES_ENDPOINT = '/.pomerium/mcp/routes'
const POMERIUM_CONNECT_PATH = '/.pomerium/mcp/connect'

type ServerSelectorProps = {
  servers: Servers
  onServersChange: (servers: Servers) => void
  selectedServers: string[]
  onServerToggle: (serverId: string) => void
  disabled?: boolean
  children?: React.ReactNode
}

const StatusIndicator = ({ status }: { status: Server['status'] }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-600'
      case 'connecting':
        return 'bg-orange-600'
      case 'error':
        return 'bg-red-600'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting'
      case 'error':
        return 'Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={getStatusText()}
    >
      <div
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
        aria-hidden="true"
      />
    </div>
  )
}

// Extracted header component to reduce complexity
type ServerSelectorHeaderProps = {
  isLoading: boolean
  disabled: boolean
  onRefresh: () => void
  showHelp?: boolean
}

function ServerSelectorHeader({
  isLoading,
  disabled,
  onRefresh,
  showHelp = false,
}: ServerSelectorHeaderProps) {
  return (
    <div className="flex items-center justify-between min-h-[24px]">
      <div className="flex items-center gap-2">
        <span
          id="server-list-label"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Available Servers
        </span>

        {showHelp ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center justify-center group"
                aria-label="Show help for server selection"
              >
                <Info className="h-3 w-3 cursor-help text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 text-sm"
              side="bottom"
              align="start"
              sideOffset={4}
            >
              <p>
                {disabled
                  ? 'Server selection is locked after first message'
                  : 'Click connected servers to toggle selection, disconnected servers to connect'}
              </p>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="h-3 w-3" aria-hidden="true" />
        )}

        {disabled && (
          <span
            className="text-xs text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          >
            (Selection locked after first message)
          </span>
        )}
      </div>

      <Button
        onClick={onRefresh}
        disabled={isLoading || disabled}
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        aria-label={isLoading ? 'Refreshing servers...' : 'Refresh servers'}
      >
        <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}

// Shared component for server selection UI
const ServerSelectionContent = ({
  servers,
  onServersChange,
  selectedServers,
  onServerToggle,
  disabled = false,
  isLoading,
  error,
  onRefresh,
  children,
}: ServerSelectorProps & {
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}) => {
  const connectToServer = async (serverId: string) => {
    const server = servers[serverId]
    if (!server) return

    // Use Pomerium MCP connection flow
    const currentUrl = window.location.href
    const connectUrl = `${server.url}${POMERIUM_CONNECT_PATH}?redirect_url=${encodeURIComponent(currentUrl)}`

    // Redirect to the connection URL - this will handle the OAuth flow
    window.location.href = connectUrl
  }

  // Use the custom hook for disconnecting
  const disconnectMutation = useDisconnectServer(servers, onServersChange)

  const disconnectFromServer = async (serverId: string) => {
    const server = servers[serverId]
    if (!server || !server.needs_oauth) return

    try {
      await disconnectMutation.mutateAsync(serverId)
    } catch (error) {
      console.error('Failed to disconnect from server:', error)
    }
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

  if (error) {
    return (
      <div className="space-y-4">
        <ServerSelectorHeader
          isLoading={isLoading}
          disabled={disabled}
          onRefresh={onRefresh}
        />
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-red-600 dark:text-red-400 text-center py-4"
        >
          Error loading servers: {error}
        </div>
        {children}
      </div>
    )
  }

  if (serverList.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        <ServerSelectorHeader
          isLoading={isLoading}
          disabled={disabled}
          onRefresh={onRefresh}
        />
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
        >
          No MCP servers are currently configured in this Pomerium cluster.
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ServerSelectorHeader
        isLoading={isLoading}
        disabled={disabled}
        onRefresh={onRefresh}
        showHelp={!disabled}
      />

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          Loading servers...
        </div>
      )}

      <ul
        className="flex flex-wrap gap-2 list-none p-0 m-0"
        role="group"
        aria-labelledby="server-list-label"
      >
        {serverList.map((server) => {
          const isSelected = selectedServers.includes(server.id)
          const isConnected = server.status === 'connected'
          const canDisconnect = isConnected && server.needs_oauth

          const buttonAriaLabel = isConnected
            ? `${server.name} - ${server.status}${isSelected ? ', selected' : ', click to ' + (isSelected ? 'deselect' : 'select')}`
            : `${server.name} - ${server.status}, click to connect`

          return (
            <li key={server.id} className="flex items-center">
              <Button
                onClick={() => handleServerClick(server.id)}
                disabled={disabled}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`
                  flex items-center gap-2 text-xs transition-all
                  ${isSelected ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  ${!isConnected ? 'opacity-70' : ''}
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${canDisconnect ? 'rounded-r-none border-r-0' : ''}
                `}
                aria-label={buttonAriaLabel}
                aria-pressed={isConnected ? isSelected : undefined}
              >
                <div className="flex items-center gap-1.5">
                  {server.logo_url && (
                    <img
                      src={server.logo_url}
                      alt=""
                      title={server.name}
                      className="w-3 h-3 rounded"
                    />
                  )}
                  <StatusIndicator status={server.status} />
                  <span>{server.name}</span>
                  {isSelected && (
                    <Check className="w-3 h-3" aria-hidden="true" />
                  )}
                  {!isConnected && !disabled && (
                    <span className="text-xs opacity-70" aria-hidden="true">
                      (Click to connect)
                    </span>
                  )}
                </div>
              </Button>

              {canDisconnect && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    disconnectFromServer(server.id)
                  }}
                  disabled={disabled}
                  variant="outline"
                  size="sm"
                  className="
                    h-8 w-8 p-0 rounded-l-none -ml-px text-xs
                    hover:bg-red-50 hover:text-red-600 hover:border-red-300
                    dark:hover:bg-red-950 dark:hover:text-red-400 dark:hover:border-red-700
                  "
                  aria-label={`Disconnect from ${server.name}`}
                  title="Disconnect"
                >
                  <Plug className="w-3 h-3" aria-hidden="true" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {children}
    </div>
  )
}

export function ServerSelector({
  servers,
  onServersChange,
  selectedServers,
  onServerToggle,
  disabled = false,
  children,
}: ServerSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const descriptionId = useId()

  // Fetch servers from Pomerium MCP endpoint
  const fetchPomeriumServers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(POMERIUM_ROUTES_ENDPOINT)
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.status}`)
      }

      const data = await response.json()
      const result = pomeriumRoutesResponseSchema.safeParse(data)

      if (!result.success) {
        throw new Error('Invalid server data format')
      }

      // Transform server data
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
          needs_oauth: serverInfo.needs_oauth,
        }
        newServers[id] = server
      })

      onServersChange(newServers)
    } catch (error) {
      console.error('Failed to fetch servers:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to fetch servers',
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Connect to server via Pomerium OAuth flow
  const connectToServer = (serverId: string) => {
    const server = servers[serverId]
    if (!server) return

    const currentUrl = window.location.href
    const connectUrl = `${server.url}${POMERIUM_CONNECT_PATH}?redirect_url=${encodeURIComponent(currentUrl)}`

    window.location.href = connectUrl
  }

  // Handle server click - toggle if connected, connect if disconnected
  const handleServerClick = (serverId: string) => {
    const server = servers[serverId]
    if (!server) return

    if (server.connected) {
      onServerToggle(serverId)
    } else {
      connectToServer(serverId)
    }
  }

  // Load servers on component mount
  useEffect(() => {
    fetchPomeriumServers()
  }, [])

  const sharedProps = {
    servers,
    onServersChange,
    selectedServers,
    onServerToggle,
    disabled,
    isLoading,
    error,
    onRefresh: fetchPomeriumServers,
    children,
  }

  // On mobile, show drawer trigger with selected server count
  if (isMobile) {
    const selectedCount = selectedServers.length
    const totalServers = Object.keys(servers).length
    const description = `Opens server selection. ${selectedCount} of ${totalServers} servers selected${disabled ? '. Selection is locked after first message.' : ''}`

    return (
      <div className="space-y-4">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center justify-between"
              disabled={disabled}
              aria-describedby={descriptionId}
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">
                  MCP Servers ({selectedCount}/{totalServers})
                </span>
              </div>
              {disabled && (
                <span
                  className="text-xs text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                >
                  Locked
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <div id={descriptionId} className="sr-only">
            {description}
          </div>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-left">
                MCP Server Selection
              </DrawerTitle>
            </DrawerHeader>
            <div
              className="max-h-[60vh] overflow-y-auto p-4"
              role="region"
              aria-label="Server selection content"
            >
              <ServerSelectionContent {...sharedProps} />
            </div>
            <div className="p-4 border-t">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
        {children}
      </div>
    )
  }

  // On desktop, show inline server selection (current behavior)
  return <ServerSelectionContent {...sharedProps} />
}
