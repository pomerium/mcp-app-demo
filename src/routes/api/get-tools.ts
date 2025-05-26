import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { experimental_createMCPClient } from 'ai'
import { getToolsSchema } from '../../lib/schemas'

export const APIRoute = createAPIFileRoute('/api/get-tools')({
  POST: async ({ request }) => {
    const bearerToken = request.headers.get('Authorization')?.split(' ')[1]

    try {
      const body = await request.json()
      const result = getToolsSchema.safeParse(body)

      if (!result.success) {
        return json({ error: result.error.errors }, { status: 400 })
      }

      const { url } = result.data

      if (!bearerToken) {
        return json({ error: 'Unauthorized' }, { status: 401 })
      }

      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url,
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      })

      const tools = client.tools ?? {}
      await client.close()

      return json({ tools })
    } catch (error) {
      console.error('Error creating MCP client:', error)

      return json({ error: 'Failed to connect to MCP server' }, { status: 500 })
    }
  },
})
