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
      let reasoningSummaryBuffer = ''

      const flush = () => {
        if (buffer) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(buffer)}\n`))
          buffer = ''
        }
      }

      for await (const chunk of answer) {
        // Handle tool-related chunks
        switch (chunk.type) {
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

          case 'response.content_part.added':
          case 'response.content_part.done':
            if (chunk.part?.type === 'output_text' && chunk.part.text) {
              buffer += chunk.part.text
              flush()
            }
            break

          case 'response.reasoning.delta':
            if (typeof chunk.delta === 'string') {
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'reasoning',
                    effort: chunk.effort,
                    summary: chunk.delta,
                    model: chunk.model,
                    serviceTier: chunk.service_tier,
                    temperature: chunk.temperature,
                    topP: chunk.top_p,
                  })}\n`,
                ),
              )
            }
            break

          case 'response.created':
          case 'response.in_progress':
            if (chunk.response?.reasoning) {
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'reasoning',
                    effort: chunk.response.reasoning.effort,
                    summary: chunk.response.reasoning.summary,
                  })}\n`,
                ),
              )
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

          case 'response.mcp_call.created':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'mcp_call_created',
                  itemId: chunk.item_id,
                  toolName: chunk.tool.name,
                  arguments: chunk.tool.input,
                })}\n`,
              ),
            )
            break

          case 'response.mcp_call.in_progress':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'mcp_call_in_progress',
                  itemId: chunk.item_id,
                })}\n`,
              ),
            )
            break

          case 'response.mcp_call_arguments.delta':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'mcp_call_arguments_delta',
                  itemId: chunk.item_id,
                  delta: chunk.delta,
                })}\n`,
              ),
            )
            break

          case 'response.mcp_call_arguments.done':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'mcp_call_arguments_done',
                  itemId: chunk.item_id,
                  arguments: chunk.arguments,
                })}\n`,
              ),
            )
            break

          case 'response.mcp_call.completed':
            controller.enqueue(
              encoder.encode(
                `t:${JSON.stringify({
                  type: 'mcp_call_completed',
                  itemId: chunk.item_id,
                })}\n`,
              ),
            )
            break

          case 'response.output_item.added':
            if (chunk.item.type === 'mcp_call') {
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'mcp_call',
                    itemId: chunk.item.id,
                    toolName: chunk.item.name,
                    serverLabel: chunk.item.server_label,
                    arguments: chunk.item.arguments,
                  })}\n`,
                ),
              )
            }
            break

          case 'response.reasoning_summary_text.delta':
            if (typeof chunk.delta === 'string') {
              reasoningSummaryBuffer += chunk.delta
            }
            break

          case 'response.reasoning_summary_text.done':
            if (reasoningSummaryBuffer) {
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'reasoning',
                    effort: chunk.effort,
                    summary: reasoningSummaryBuffer,
                    model: chunk.model,
                    serviceTier: chunk.service_tier,
                    temperature: chunk.temperature,
                    topP: chunk.top_p,
                  })}\n`,
                ),
              )
              reasoningSummaryBuffer = ''
            }
            break

          default:
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
