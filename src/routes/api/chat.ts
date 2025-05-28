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

      // Ensure messages have the correct structure before validation
      const formattedBody = {
        ...body,
        messages: body.messages.map((msg: any) => ({
          ...msg,
          parts: [
            {
              type: 'text',
              text: msg.content,
            },
          ],
        })),
      }

      const result = chatRequestSchema.safeParse(formattedBody)

      if (!result.success) {
        console.error('Validation error:', result.error.errors)
        return new Response(JSON.stringify({ error: result.error.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { messages, servers, model } = result.data

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
          headers: {
             Authorization: `Bearer ${bearerToken}`,
          }
        })) satisfies Tool[]

      // Format the conversation history into a single input string with proper message parts
      const input = messages
        .map((msg) => ({
          role: msg.role,
          parts: [
            {
              type: 'text',
              text: msg.content,
            },
          ],
        }))
        .map(
          (msg) =>
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts[0].text}`,
        )
        .join('\n\n')

      const client = new OpenAI()
      const answer = await client.responses.create({
        model,
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
