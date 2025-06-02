import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { getToolsRequestSchema } from '../../lib/schemas'
import OpenAI from 'openai'

export const APIRoute = createAPIFileRoute('/api/get-tools')({
  POST: async ({ request }) => {
    const bearerToken = request.headers.get('Authorization')?.split(' ')[1]

    try {
      const body = await request.json()
      const result = getToolsRequestSchema.safeParse(body)

      if (!result.success) {
        return json({ error: result.error.errors }, { status: 400 })
      }

      const { url, name } = result.data

      if (!bearerToken) {
        return json({ error: 'Unauthorized' }, { status: 401 })
      }

      const mcpServer = [
        {
          type: 'mcp' as const,
          server_label: name,
          server_url: url,
          require_approval: 'never' as const,
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      ]

      const client = new OpenAI()
      await client.responses.create({
        model: 'gpt-4o',
        tools: mcpServer,
        input: 'List available tools',
      })

      return json({ connected: true })
    } catch (error) {
      console.error('Error creating MCP client:', error)
      return json({ error: 'Failed to connect to MCP server' }, { status: 500 })
    }
  },
})
