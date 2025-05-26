import { createAPIFileRoute } from '@tanstack/react-start/api'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const APIRoute = createAPIFileRoute('/api/chat')({
  POST: async ({ request }) => {
    const { messages } = await request.json()

    // const mcpClient = await experimental_createMCPClient({
    //   transport: {
    //     type: 'sse',
    //     url: 'https://your-secure-server.com/api/mcp',
    //     headers: {
    //       // Authorization: `Bearer ${yourJwtFromPomerium}`,
    //     },
    //   },
    // })

    const response = await streamText({
      model: openai('gpt-4'),
      messages,
      // tools: mcpClient.tools,
      onError: async (event) => {
        console.error('Streaming error:', event.error)
        // if (mcpClient) await mcpClient.close()
      },
      onFinish: async () => {
        // if (mcpClient) await mcpClient.close()
      },
    })

    return response.toDataStreamResponse()
  },
})
