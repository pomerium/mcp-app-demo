import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { experimental_createMCPClient } from 'ai'

export const APIRoute = createAPIFileRoute('/api/get-tools')({
  GET: async ({ request }) => {
    const bearerToken = request.headers.get('Authorization')?.split(' ')[1]
    const { url } = await request.json()

    if (!url) {
      return json({ error: 'URL is required' }, { status: 400 })
    }

    if (!bearerToken) {
      return json({ error: 'Authorization token is required' }, { status: 401 })
    }

    try {
      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url,
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      })

      const tools = client.tools || {}
      await client.close()

      return json({ tools })
    } catch (error) {
      console.error('Error creating MCP client:', error)
      return json({ error: 'Failed to connect to MCP server' }, { status: 500 })
    }
  },
})
