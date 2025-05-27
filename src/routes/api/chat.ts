import { createAPIFileRoute } from '@tanstack/react-start/api'
import { chatRequestSchema } from '../../lib/schemas'
import OpenAI from 'openai'
import type { Tool } from 'openai/resources/responses/responses.mjs'
import { streamText } from '../../lib/streaming'

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

      if (messages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const tools = Object.entries(servers)
        .filter(([_, server]) => server.status === 'connected')
        .map(([_id, server]) => ({
          type: 'mcp',
          server_label: server.name,
          server_url: server.url,
          require_approval: 'never',
          // headers: {
          //   Authorization: `Bearer ${bearerToken}`,
          // }
        })) satisfies Tool[]

      // Format the conversation history into a single input string
      const input = messages
        .map(
          (msg) =>
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`,
        )
        .join('\n\n')

      const client = new OpenAI()
      const answer = await client.responses.create({
        model: 'gpt-4.1',
        tools,
        input,
        stream: true,
      })

      return streamText(answer)
    } catch (error) {
      console.error('Error in chat route:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
