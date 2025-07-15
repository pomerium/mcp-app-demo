import { useEffect, useId, useState } from 'react'
import { Info, RefreshCw, Server as ServerIcon, Wrench } from 'lucide-react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { pomeriumRoutesResponseSchema } from '../lib/schemas'
import { Button } from './ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { ServerToggle } from './ServerToggle'
import type { Server, Servers } from '../lib/schemas'
import { useDisconnectServer } from '@/hooks/useDisconnectServer'

const POMERIUM_ROUTES_ENDPOINT = '/.pomerium/mcp/routes'
const POMERIUM_CONNECT_PATH = '/.pomerium/mcp/connect'

export interface ToolConfig {
  key: string
  isActive: boolean
  component: React.ReactNode
}

type ServerSelectorProps = {
  servers: Servers
  onServersChange: (servers: Servers) => void
  selectedServers: Array<string>
  onServerToggle: (serverId: string) => void
  disabled?: boolean
  toolToggles?: Array<ToolConfig>
}

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
          Available Servers & Tools
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
  showHeader = true,
  toolToggles = [],
}: ServerSelectorProps & {
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  showHeader?: boolean
  toolToggles?: Array<ToolConfig>
}) => {
  const serverList = Object.values(servers).sort((a, b) =>
    a.url.localeCompare(b.url),
  )
  const connectToServer = (serverId: string) => {
    const server = servers[serverId]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!server) return
    const currentUrl = window.location.href
    const connectUrl = `${server.url}${POMERIUM_CONNECT_PATH}?redirect_url=${encodeURIComponent(currentUrl)}`
    window.location.href = connectUrl
  }

  const disconnectMutation = useDisconnectServer(servers, onServersChange)
  const disconnectFromServer = async (serverId: string) => {
    const server = servers[serverId]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!server || !server.needs_oauth) return
    try {
      await disconnectMutation.mutateAsync(serverId)
    } catch (err) {
      console.error('Failed to disconnect from server:', err)
    }
  }
  const handleServerClick = (serverId: string) => {
    const server = servers[serverId]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!server) return

    if (server.status === 'connected') {
      onServerToggle(serverId)
    } else {
      connectToServer(serverId)
    }
  }

  // Always render the same shell: header and <ul>
  return (
    <div className="space-y-4">
      {showHeader && (
        <ServerSelectorHeader
          isLoading={isLoading}
          disabled={disabled}
          onRefresh={onRefresh}
          showHelp={!disabled}
        />
      )}
      <ul
        className="flex flex-wrap gap-2 list-none p-0 m-0 min-h-[48px]"
        role="group"
        aria-labelledby="server-list-label"
      >
        {isLoading ? (
          <li className="flex items-center w-full">
            <span
              role="status"
              aria-live="polite"
              className="text-sm text-gray-500 dark:text-gray-400 text-center w-full"
            >
              Loading servers and tools...
            </span>
          </li>
        ) : error ? (
          <li className="flex items-center w-full">
            <div
              role="status"
              aria-live="polite"
              className="text-sm text-red-600 dark:text-red-400 text-center w-full"
            >
              Error loading servers: {error}
            </div>
          </li>
        ) : toolToggles.length === 0 && serverList.length === 0 ? (
          <li className="flex items-center w-full">
            <span
              role="status"
              aria-live="polite"
              className="text-sm text-gray-500 dark:text-gray-400 text-center w-full"
            >
              No MCP servers or tools available.
            </span>
          </li>
        ) : (
          <>
            {toolToggles.map((tool) => (
              <li key={tool.key} className="flex items-center">
                {tool.component}
              </li>
            ))}
            {serverList.map((server) => {
              const isSelected = selectedServers.includes(server.id)
              return (
                <li key={server.id} className="flex items-center">
                  <ServerToggle
                    server={server}
                    isSelected={isSelected}
                    onToggle={() => handleServerClick(server.id)}
                    disabled={disabled}
                    onDisconnect={disconnectFromServer}
                  />
                </li>
              )
            })}
          </>
        )}
      </ul>
    </div>
  )
}

export function ServerSelector({
  servers,
  onServersChange,
  selectedServers,
  onServerToggle,
  disabled = false,
  toolToggles = [],
}: ServerSelectorProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
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
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to fetch servers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch servers')
      setIsLoading(false)
    }
  }

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
  }

  // On mobile, show drawer trigger with selected server count
  if (isMobile) {
    const activeToolCount = toolToggles.filter((t) => t.isActive).length
    const selectedCount = selectedServers.length + activeToolCount
    const totalServers = Object.keys(servers).length + toolToggles.length
    const description = `Opens server selection. ${selectedCount} of ${totalServers} servers selected${disabled ? '. Selection is locked after first message.' : ''}`

    // Only render the button and drawer outside; ServerSelectionContent only inside DrawerContent
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
                <span className="relative flex items-center justify-center">
                  <ServerIcon className="w-4 h-4" aria-hidden="true" />
                  <Wrench
                    className="absolute -top-1.5 -right-2 bg-gray-100 dark:bg-gray-600 rounded-full p-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm">
                  Servers & Tools ({selectedCount}/{totalServers})
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
            {/* Only render header/loading/error inside the drawer */}
            <DrawerHeader>
              <DrawerTitle className="text-left">
                <ServerSelectorHeader
                  isLoading={isLoading}
                  disabled={disabled}
                  onRefresh={fetchPomeriumServers}
                  showHelp={!disabled}
                />
              </DrawerTitle>
            </DrawerHeader>
            <div
              className="max-h-[60vh] overflow-y-auto p-4"
              role="region"
              aria-label="Server selection content"
            >
              <ServerSelectionContent
                {...sharedProps}
                showHeader={false}
                toolToggles={toolToggles}
              />
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
      </div>
    )
  }

  return <ServerSelectionContent {...sharedProps} toolToggles={toolToggles} />
}
