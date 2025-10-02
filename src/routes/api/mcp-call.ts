import { createServerFileRoute } from '@tanstack/react-start/server'
import { z } from 'zod'

/**
 * Proxy endpoint for MCP JSON-RPC calls from frontend
 *
 * This proxies MCP tool calls to avoid CORS issues when the frontend
 * needs to fetch UI resources from MCP servers. The backend has access
 * to the bearer token from Pomerium headers.
 */

// Store MCP session IDs per server URL (in-memory for now)
const mcpSessions = new Map<string, string>()

const mcpCallRequestSchema = z.object({
  serverUrl: z.string().url(),
  toolName: z.string(),
  arguments: z.record(z.any()),
  itemId: z.string(),
})

export const ServerRoute = createServerFileRoute('/api/mcp-call').methods({
  async POST({ request }) {
    try {
      // Parse and validate request body
      const body = await request.json()
      const validatedRequest = mcpCallRequestSchema.parse(body)

      // Debug: Log all headers
      console.log('[MCP Proxy] Request headers:', {
        authorization: request.headers.get('Authorization'),
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        'x-pomerium-assertion': request.headers.get('x-pomerium-assertion')
          ? 'present'
          : 'missing',
      })

      // Get bearer token from Authorization header (same as chat API)
      // Pomerium injects this header at the proxy level
      const bearerToken = request.headers.get('Authorization')?.split(' ')[1]

      if (!bearerToken) {
        console.log('[MCP Proxy] No bearer token found in Authorization header')
        console.log(
          '[MCP Proxy] All headers:',
          Array.from(request.headers.entries()),
        )
        return new Response(
          JSON.stringify({ error: 'Missing MCP authentication token' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      console.log('[MCP Proxy] Making request to:', validatedRequest.serverUrl)
      console.log(
        '[MCP Proxy] Bearer token:',
        bearerToken.substring(0, 20) + '...',
      )

      // Forward headers transparently
      const cookies = request.headers.get('cookie')

      // Check if we have a session for this server
      let mcpSessionId = mcpSessions.get(validatedRequest.serverUrl)

      if (!mcpSessionId) {
        console.log('[MCP Proxy] No session found, initializing new session')

        // Initialize session with MCP server
        // Server uses HTTP+SSE transport - must accept both content types
        const initResponse = await fetch(validatedRequest.serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            Authorization: `Bearer ${bearerToken}`,
            ...(cookies && { Cookie: cookies }),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: `init-${Date.now()}`,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'mcp-app-demo',
                version: '1.0.0',
              },
            },
          }),
        })

        console.log('[MCP Proxy] Initialize response status:', initResponse.status)
        console.log('[MCP Proxy] Initialize response headers:', Object.fromEntries(initResponse.headers.entries()))

        if (!initResponse.ok) {
          const errorText = await initResponse.text()
          console.error('[MCP Proxy] Initialize failed:', errorText)
          throw new Error(`Failed to initialize MCP session: ${initResponse.status} - ${errorText}`)
        }

        // Parse SSE response
        const initText = await initResponse.text()
        console.log('[MCP Proxy] Initialize response body:', initText.substring(0, 200))

        // Get session ID from response header
        mcpSessionId = initResponse.headers.get('mcp-session-id') || undefined

        if (mcpSessionId) {
          console.log('[MCP Proxy] Initialized session:', mcpSessionId)
          mcpSessions.set(validatedRequest.serverUrl, mcpSessionId)
        } else {
          console.warn('[MCP Proxy] No session ID returned from initialize')
        }
      } else {
        console.log('[MCP Proxy] Using existing session:', mcpSessionId)
      }

      console.log('[MCP Proxy] Forwarding cookies:', cookies ? 'yes' : 'no')
      console.log(
        '[MCP Proxy] Using mcp-session-id:',
        mcpSessionId || 'none',
      )

      // Make MCP JSON-RPC call, forwarding authentication headers
      const mcpResponse = await fetch(validatedRequest.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          Authorization: `Bearer ${bearerToken}`,
          ...(cookies && { Cookie: cookies }),
          ...(mcpSessionId && { 'mcp-session-id': mcpSessionId }),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: validatedRequest.itemId,
          method: 'tools/call',
          params: {
            name: validatedRequest.toolName,
            arguments: validatedRequest.arguments,
          },
        }),
      })

      if (!mcpResponse.ok) {
        const errorText = await mcpResponse.text()

        // If 404, session might be invalid - clear it and let caller retry
        if (mcpResponse.status === 404 && mcpSessionId) {
          console.log('[MCP Proxy] Session invalid (404), clearing stored session')
          mcpSessions.delete(validatedRequest.serverUrl)
        }

        throw new Error(
          `MCP server returned ${mcpResponse.status}: ${errorText}`,
        )
      }

      // Check if response is SSE or JSON
      const contentType = mcpResponse.headers.get('content-type') || ''
      let mcpData: any

      if (contentType.includes('text/event-stream')) {
        // Parse SSE format
        const sseText = await mcpResponse.text()
        console.log('[MCP Proxy] Got SSE response:', sseText.substring(0, 200))

        // Extract JSON from SSE data field
        const dataMatch = sseText.match(/data: (.+)/m)
        if (dataMatch) {
          mcpData = JSON.parse(dataMatch[1])
        } else {
          throw new Error('Could not parse SSE response')
        }
      } else {
        // Regular JSON response
        mcpData = await mcpResponse.json()
      }

      // Debug: Log what we got back from MCP server
      console.log('[MCP Proxy] MCP server response:', JSON.stringify(mcpData, null, 2))

      // Check if response has UI resources
      if (mcpData.result?.content && Array.isArray(mcpData.result.content)) {
        const hasUI = mcpData.result.content.some(
          (item: any) => item.type === 'resource' && item.resource?.uri?.startsWith('ui://')
        )
        console.log('[MCP Proxy] Response has UI resources:', hasUI)
      }

      // Update stored session ID if server returns a new one
      const newSessionId = mcpResponse.headers.get('mcp-session-id') || undefined
      if (newSessionId && newSessionId !== mcpSessionId) {
        console.log('[MCP Proxy] Updating session ID:', newSessionId)
        mcpSessions.set(validatedRequest.serverUrl, newSessionId)
      }

      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      return new Response(JSON.stringify(mcpData), {
        status: 200,
        headers: responseHeaders,
      })
    } catch (error) {
      console.error('[MCP Proxy] Error:', error)
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  },
})
