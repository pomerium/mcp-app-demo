import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Settings2 } from 'lucide-react'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from './ui/toast'
import {
  pomeriumRoutesResponseSchema,
  type Server,
  type Servers,
} from '../lib/schemas'

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
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {getStatusText()}
      </span>
    </div>
  )
}

export function ServerSettings() {
  const [servers, setServers] = useState<Servers>({})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState({
    title: '',
    description: '',
  })
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

      setServers(newServers)
      showNotification('Servers Updated', 'Server list refreshed successfully.')
    } catch (error) {
      showNotification(
        'Error',
        `Failed to fetch servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
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

  const showNotification = (title: string, description: string) => {
    setToastMessage({ title, description })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 5000)
  }

  return (
    <ToastProvider>
      <div className="p-6 sm:px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold">Server Settings</h2>
          </div>

          <Button
            onClick={fetchPomeriumServers}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="space-y-4">
          {Object.values(servers)
            .sort((a, b) => a.url.localeCompare(b.url))
            .map((server) => (
              <div
                key={server.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {server.logo_url && (
                      <img
                        src={server.logo_url}
                        alt={`${server.name} logo`}
                        className="w-8 h-8 rounded flex-shrink-0"
                      />
                    )}
                    <div className="space-y-1 flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {server.name}
                      </h3>
                      {server.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {server.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {server.url}
                      </p>
                      <StatusIndicator status={server.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {server.status !== 'connected' && (
                      <Button
                        onClick={() => connectToServer(server.id)}
                        disabled={server.status === 'connecting'}
                        variant="default"
                        size="sm"
                        className="min-w-[100px] h-9"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {Object.keys(servers).length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No servers available.</p>
              <p className="text-sm">
                Servers are managed by your Pomerium configuration.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Loading servers...</p>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <Toast className="bg-white dark:bg-gray-800">
          <div>
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
          <ToastClose onClick={() => setShowToast(false)} />
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  )
}
