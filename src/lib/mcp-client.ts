/**
 * Server-side MCP client for direct communication with MCP servers
 * This bypasses OpenAI's MCP integration to get full content arrays including UI resources
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export interface MCPCallResult {
  content: Array<{
    type: string
    text?: string
    data?: string
    mimeType?: string
    resource?: {
      uri: string
      mimeType?: string
      text?: string
      blob?: string
      metadata?: Record<string, unknown>
      uiMetadata?: Record<string, unknown>
    }
    [key: string]: unknown
  }>
  isError?: boolean
}

export class MCPClient {
  private clients: Map<string, Client> = new Map()

  /**
   * Get or create an MCP client for a server URL
   */
  private async getClient(serverUrl: string, authToken?: string): Promise<Client> {
    const cacheKey = `${serverUrl}:${authToken || 'no-auth'}`

    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!
    }

    // Create SSE transport for HTTP-based MCP server
    const transport = new SSEClientTransport(new URL(serverUrl), {
      // Include credentials (cookies) for Pomerium authentication
      eventSourceInit: {
        withCredentials: true,
      },
      requestInit: {
        credentials: 'include',
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`
        } : undefined
      }
    })

    const client = new Client({
      name: 'mcp-app-demo',
      version: '1.0.0',
    }, {
      capabilities: {}
    })

    await client.connect(transport)
    this.clients.set(cacheKey, client)

    return client
  }

  /**
   * List available tools from an MCP server
   */
  async listTools(serverUrl: string, authToken?: string) {
    const client = await this.getClient(serverUrl, authToken)
    const response = await client.listTools()
    return response.tools
  }

  /**
   * Call a tool on an MCP server and get the full response including UI resources
   */
  async callTool(
    serverUrl: string,
    toolName: string,
    args: Record<string, unknown>,
    authToken?: string
  ): Promise<MCPCallResult> {
    try {
      const client = await this.getClient(serverUrl, authToken)

      const response = await client.callTool({
        name: toolName,
        arguments: args
      })

      // Return the full content array - this includes UI resources!
      return {
        content: response.content || [],
        isError: response.isError
      }
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error)
      return {
        content: [{
          type: 'text',
          text: `Error calling tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      }
    }
  }

  /**
   * Close a specific client connection
   */
  async closeClient(serverUrl: string, authToken?: string) {
    const cacheKey = `${serverUrl}:${authToken || 'no-auth'}`
    const client = this.clients.get(cacheKey)

    if (client) {
      await client.close()
      this.clients.delete(cacheKey)
    }
  }

  /**
   * Close all client connections
   */
  async closeAll() {
    await Promise.all(
      Array.from(this.clients.values()).map(client => client.close())
    )
    this.clients.clear()
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient()
  }
  return mcpClientInstance
}
