import { APIError } from 'openai'

// Event chunk for stream completion
const STREAM_DONE_CHUNK = new TextEncoder().encode(
  `t:${JSON.stringify({ type: 'stream_done' })}\n`,
)

export function streamText(
  answer: AsyncIterable<any>,
  onMessageId?: (messageId: string) => void,
): Response {
  const encoder = new TextEncoder()
  const messageId = `msg-${Math.random().toString(36).slice(2)}`

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            // Only emit output text for delta events, ignore content_part events for output_text
            case 'response.output_text.delta':
              if (typeof chunk.delta === 'string') {
                buffer += chunk.delta
                // Flush on sentence boundaries or when buffer gets large
                if (buffer.length > 40 || /[.!?\n]$/.test(chunk.delta)) {
                  flush()
                }
              }
              break
            // Only emit reasoning for delta events, ignore created/in_progress and content_part for reasoning
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

            case 'response.mcp_list_tools.failed':
              console.error('[MCP LIST TOOLS FAILED]', chunk)

              if (!('error' in chunk)) {
                // return a tool call but with a status of failed.
                controller.enqueue(
                  encoder.encode(
                    `t:${JSON.stringify({
                      type: 'mcp_list_tools_failed',
                      itemId: chunk.item_id,
                    })}\n`,
                  ),
                )
              }
              break

            case 'response.mcp_call.failed': {
              console.error('[TOOL CALL FAILED]', chunk)

              // Create a generic error message without HTTP status details
              const callErrorMessage =
                chunk.error?.message || 'Tool call failed'
              const genericCallMessage = callErrorMessage
                .replace(/\.\s*Http status code:.*$/i, '') // Remove HTTP status code details
                .replace(/\.\s*Status:.*$/i, '') // Remove status details
                .replace(/\.\s*\(\d+.*?\)$/i, '') // Remove parenthetical status codes
                .trim()

              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'mcp_call_failed',
                    itemId: chunk.item_id,
                    error: genericCallMessage,
                  })}\n`,
                ),
              )
              break
            }

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
                controller.enqueue(
                  encoder.encode(
                    `t:${JSON.stringify({
                      type: 'reasoning_summary_delta',
                      delta: chunk.delta,
                      effort: chunk.effort,
                      model: chunk.model,
                      serviceTier: chunk.service_tier,
                      temperature: chunk.temperature,
                      topP: chunk.top_p,
                    })}\n`,
                  ),
                )
              }
              break

            case 'response.reasoning_summary_text.done':
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'reasoning_summary_done',
                    effort: chunk.effort,
                    model: chunk.model,
                    serviceTier: chunk.service_tier,
                    temperature: chunk.temperature,
                    topP: chunk.top_p,
                  })}\n`,
                ),
              )
              break

            // Code interpreter events
            case 'response.code_interpreter_call.in_progress':
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'code_interpreter_call_in_progress',
                    itemId: chunk.item_id,
                  })}\n`,
                ),
              )
              break

            case 'response.code_interpreter_call_code.delta':
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'code_interpreter_call_code_delta',
                    itemId: chunk.item_id,
                    delta: chunk.delta,
                  })}\n`,
                ),
              )
              break

            case 'response.code_interpreter_call_code.done':
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'code_interpreter_call_code_done',
                    itemId: chunk.item_id,
                    code: chunk.code,
                  })}\n`,
                ),
              )
              break

            case 'response.code_interpreter_call.interpreting':
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'code_interpreter_call_interpreting',
                    itemId: chunk.item_id,
                  })}\n`,
                ),
              )
              break

            case 'response.code_interpreter_call.completed':
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'code_interpreter_call_completed',
                    itemId: chunk.item_id,
                  })}\n`,
                ),
              )
              break

            case 'response.output_text.annotation.added':
              // Send file annotation to client for display
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'code_interpreter_file_annotation',
                    itemId: chunk.item_id,
                    annotation: chunk.annotation,
                  })}\n`,
                ),
              )
              break

            case 'response.output_text.done':
              // Skip - text output is already handled by delta events
              break

            case 'response.content_part.done':
              // Send complete message content for conversation history
              controller.enqueue(
                encoder.encode(
                  `0:${JSON.stringify({
                    type: 'response.content_part.done',
                    item_id: chunk.item_id,
                    part: chunk.part,
                  })}\n`,
                ),
              )
              break

            case 'response.completed':
              // Optionally emit a tool call completed event
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'tool_call_completed',
                    response: chunk.response,
                  })}\n`,
                ),
              )
              break
            // Web search tool events
            default:
              if (
                chunk.type &&
                chunk.type.startsWith('response.web_search_call.')
              ) {
                controller.enqueue(
                  encoder.encode(
                    `t:${JSON.stringify({
                      ...chunk,
                    })}\n`,
                  ),
                )
                break
              }
              // Skip unknown chunk types, but log them for debugging
              console.warn(
                '[streamText] Skipping unknown chunk type:',
                chunk.type,
                chunk,
              )
              break
          }
        }

        // Flush any remaining content
        flush()
        // Emit a final done event to signal successful completion
        controller.enqueue(STREAM_DONE_CHUNK)
        controller.close()
      } catch (error: unknown) {
        console.error('Error during streamed response:', error)
        let genericListToolsMessage = 'An unexpected error occurred.'

        if (error instanceof APIError) {
          const match = error.message.match(
            /Error retrieving tool list from MCP server: '([^']+)'/,
          )

          if (match) {
            genericListToolsMessage = match[0]
          }
        }

        controller.enqueue(
          encoder.encode(
            `e:${JSON.stringify({
              type: 'error',
              message: genericListToolsMessage,
            })}\n`,
          ),
        )

        // Always emit stream_done after error
        controller.enqueue(STREAM_DONE_CHUNK)

        // Close the stream
        try {
          controller.close()
        } catch (closeError) {
          console.error('Failed to close stream controller:', closeError)
        }
      }
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
