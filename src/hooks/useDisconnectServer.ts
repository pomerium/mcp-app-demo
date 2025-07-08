import { useMutation } from '@tanstack/react-query'
import {
  disconnectRequestSchema,
  disconnectResponseSchema,
  type Server,
  type Servers,
} from '@/lib/schemas'

const POMERIUM_DISCONNECT_ENDPOINT = '/.pomerium/mcp/routes/disconnect'

/**
 * Custom hook for disconnecting a server via Pomerium MCP.
 * @param servers Current servers object
 * @param onServersChange Callback to update servers after disconnect
 */
export function useDisconnectServer(
  servers: Servers,
  onServersChange: (servers: Servers) => void,
) {
  return useMutation({
    mutationFn: async (serverId: string) => {
      const server = servers[serverId]
      if (!server || !server.needs_oauth) throw new Error('Invalid server')
      const requestPayload = disconnectRequestSchema.parse({
        routes: [server.url],
      })
      const response = await fetch(POMERIUM_DISCONNECT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })
      if (!response.ok) {
        throw new Error(`Failed to disconnect: ${response.status}`)
      }
      const responseData = await response.json()
      return disconnectResponseSchema.parse(responseData)
    },
    onSuccess: (result) => {
      const updatedServers: Servers = {}
      result.servers.forEach((serverInfo) => {
        const id = serverInfo.url
        const fallbackName =
          new URL(serverInfo.url).hostname.split('.')[0] || 'Unknown Server'
        const updatedServer: Server = {
          id,
          name: serverInfo.name || fallbackName,
          description: serverInfo.description,
          logo_url: serverInfo.logo_url,
          url: serverInfo.url,
          status: serverInfo.connected ? 'connected' : 'disconnected',
          connected: serverInfo.connected,
          needs_oauth: serverInfo.needs_oauth,
        }
        updatedServers[id] = updatedServer
      })
      onServersChange(updatedServers)
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to disconnect from server:', error)
    },
  })
}
