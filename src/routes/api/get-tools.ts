import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { experimental_createMCPClient } from 'ai'
import {
  getToolsRequestSchema,
  getToolsResponseSchema,
} from '../../lib/schemas'

export const APIRoute = createAPIFileRoute('/api/get-tools')({
  POST: async ({ request }) => {
    const bearerToken = request.headers.get('Authorization')?.split(' ')[1]

    try {
      const body = await request.json()
      const result = getToolsRequestSchema.safeParse(body)

      if (!result.success) {
        return json({ error: result.error.errors }, { status: 400 })
      }

      const { url } = result.data

      if (!bearerToken) {
        return json({ error: 'Unauthorized' }, { status: 401 })
      }

      var connectUrl = new URL(url)
      connectUrl.pathname = '/.pomerium/mcp/connect'
      console.debug(
        'Connecting to MCP server at:',
        connectUrl.toString(),
        bearerToken,
      )
      const resp = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
      })

      if (!resp.ok) {
        console.error('Failed to connect to MCP server:', resp)
        return json({ error: 'Failed to connect to MCP server' })
      }
    } catch (error) {
      console.error('Error creating MCP client:', error)
      return json({ error: 'Failed to connect to MCP server' }, { status: 500 })
    }
  },
})
