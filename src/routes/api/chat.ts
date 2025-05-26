import { createAPIFileRoute } from '@tanstack/react-start/api'
import { experimental_createMCPClient, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Server status enum
const ServerStatusEnum = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'error',
])

// Server schema
export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url('Invalid server URL'),
  status: ServerStatusEnum,
})

// Servers record schema
export const serversSchema = z.record(serverSchema)

// Message part schema
export const messagePartSchema = z.object({
  type: z.string(),
  text: z.string(),
})

// Message schema
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  parts: z.array(messagePartSchema).optional(),
})

export type Server = z.infer<typeof serverSchema>
export type Servers = z.infer<typeof serversSchema>

export const APIRoute = createAPIFileRoute('/api/chat')({
  POST: async ({ request }) => {
    // Request body schema
    const chatRequestSchema = z.object({
      id: z.string(),
      messages: z.array(messageSchema),
      servers: serversSchema,
    })

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
        Object.values(servers).map(async (server) => {
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
