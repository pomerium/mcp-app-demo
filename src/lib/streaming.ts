export function streamText(
  answer: AsyncIterable<any>,
  onMessageId?: (messageId: string) => void,
): Response {
  const encoder = new TextEncoder()
  const messageId = `msg-${Math.random().toString(36).slice(2)}`

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial message ID
      controller.enqueue(
        encoder.encode(
          `f:${JSON.stringify({
            messageId,
          })}\n`,
        ),
      )

      if (onMessageId) {
        onMessageId(messageId)
      }

      let buffer = ''

      const flush = () => {
        if (buffer) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(buffer)}\n`))
          buffer = ''
        }
      }

      for await (const chunk of answer) {
        if (
          chunk.type === 'response.output_text.delta' &&
          typeof chunk.delta === 'string'
        ) {
          buffer += chunk.delta

          // Flush on sentence boundaries or when buffer gets large
          if (buffer.length > 40 || /[.!?\n]$/.test(chunk.delta)) {
            flush()
          }
        }
      }

      // Flush any remaining content
      flush()
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
