import { createServerFileRoute } from '@tanstack/react-start/server'
import { chatRequestSchema } from '../../lib/schemas'
import OpenAI from 'openai'
import type { Tool } from 'openai/resources/responses/responses.mjs'
import { streamText } from '../../lib/streaming'

export const ServerRoute = createServerFileRoute('/api/chat').methods({
  async POST({ request }) {
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

      const { messages, servers, model, userId } = result.data

      if (messages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Function to sanitize server labels for OpenAI API requirements
      const sanitizeServerLabel = (name: string): string => {
        return name
          .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace invalid chars with underscore
          .replace(/^[^a-zA-Z]/, 'server_') // Ensure it starts with a letter
          .replace(/_{2,}/g, '_') // Replace multiple underscores with single one
      }

      const tools = Object.entries(servers)
        .filter(([_, server]) => server.status === 'connected')
        .map(([_id, server]) => ({
          type: 'mcp',
          server_label: sanitizeServerLabel(server.name),
          server_url: server.url,
          require_approval: 'never',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
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
        user: userId,
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
