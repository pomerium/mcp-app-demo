import { createAPIFileRoute } from '@tanstack/react-start/api'
import { experimental_createMCPClient, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { chatRequestSchema } from '../../lib/schemas'
import type { Server } from '../../lib/schemas'

export const APIRoute = createAPIFileRoute('/api/chat')({
  POST: async ({ request }) => {
    const bearerToken = request.headers.get('Authorization')?.split(' ')[1]

    try {
      const body = await request.json()
      const result = chatRequestSchema.safeParse(body)

      if (!result.success) {
        console.error('Validation error:', result.error.errors)
        return new Response(JSON.stringify({ error: result.error.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { messages, servers } = result.data

      const mcpClients = await Promise.all(
        Object.values(servers).map(async (server: Server) => {
          if (server.status !== 'connected') return null

          return await experimental_createMCPClient({
            transport: {
              type: 'sse',
              url: server.url,
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            },
          })
        }),
      )

      // Filter out null clients and combine their tools
      const validClients = mcpClients.filter(
        (client): client is NonNullable<typeof client> => client !== null,
      )
      const allTools = validClients.reduce((acc, client) => {
        if (client.tools) {
          return { ...acc, ...client.tools }
        }
        return acc
      }, {})

      const response = await streamText({
        model: openai('gpt-4'),
        messages,
        tools: allTools,
        onError: async (event) => {
          console.error('Streaming error:', event.error)
          await Promise.all(validClients.map((client) => client.close()))
        },
        onFinish: async () => {
          await Promise.all(validClients.map((client) => client.close()))
        },
      })

      return response.toDataStreamResponse()
    } catch (error) {
      console.error('Error in chat route:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
