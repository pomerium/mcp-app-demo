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
        // Handle tool-related chunks
        switch (chunk.type) {
          case 'response.output_item.added':
            if (chunk.item.type === 'mcp_list_tools') {
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'tool_added',
                    serverLabel: chunk.item.server_label,
                    tools: chunk.item.tools,
                  })}\n`,
                ),
              )
            }
            break
          case 'response.mcp_list_tools.in_progress':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'tool_in_progress',
                  itemId: chunk.item_id,
                })}\n`,
              ),
            )
            break
          case 'response.mcp_list_tools.completed':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'tool_completed',
                  itemId: chunk.item_id,
                })}\n`,
              ),
            )
            break
          case 'response.output_item.done':
            if (chunk.item.type === 'mcp_list_tools') {
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'tool_done',
                    serverLabel: chunk.item.server_label,
                    tools: chunk.item.tools,
                  })}\n`,
                ),
              )
            }
            break
          case 'response.output_text.delta':
            if (typeof chunk.delta === 'string') {
              buffer += chunk.delta

              // Flush on sentence boundaries or when buffer gets large
              if (buffer.length > 40 || /[.!?\n]$/.test(chunk.delta)) {
                flush()
              }
            }
            break
          case 'response.mcp_call.failed':
            console.error('[TOOL CALL FAILED]', chunk)

            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'mcp_call_failed',
                  itemId: chunk.item_id,
                })}\n`,
              ),
            )
            break
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
