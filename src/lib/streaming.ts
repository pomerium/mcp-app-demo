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
              } else if (chunk.item.type === 'mcp_call' && chunk.item.output) {
                // Handle MCP call completion with output (including UI resources)
                console.log('[MCP-UI] MCP call done with output:', {
                  itemId: chunk.item.id,
                  serverLabel: chunk.item.server_label,
                  toolName: chunk.item.name,
                  output: chunk.item.output,
                })

                controller.enqueue(
                  encoder.encode(
                    `t:${JSON.stringify({
                      type: 'mcp_call_completed',
                      itemId: chunk.item.id,
                      serverLabel: chunk.item.server_label,
                      toolName: chunk.item.name,
                      content: chunk.item.output,
                      isError: chunk.item.status === 'failed',
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
              console.error('[MCP LIST TOOLS FAILED]', JSON.stringify(chunk, null, 2))

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

            case 'response.mcp_call.completed': {
              // Log the full chunk to see all available fields
              console.log('[MCP-UI] MCP call completed - FULL CHUNK:', JSON.stringify(chunk, null, 2))

              // Extract MCP call details from the chunk
              // OpenAI API sends output in different structures depending on the response
              const mcpOutput = chunk.output || chunk.content || []

              console.log('[MCP-UI] MCP call completed:', {
                itemId: chunk.item_id,
                serverLabel: chunk.server_label,
                toolName: chunk.name,
                hasOutput: !!mcpOutput,
                outputLength: Array.isArray(mcpOutput) ? mcpOutput.length : 0,
                output: mcpOutput,
                hasContent: !!chunk.content,
                contentType: typeof chunk.content,
              })

              // Send the full content array which may include UI resources
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'mcp_call_completed',
                    itemId: chunk.item_id,
                    serverLabel: chunk.server_label,
                    toolName: chunk.name,
                    content: mcpOutput, // Full content array with UI resources
                    isError: chunk.isError,
                  })}\n`,
                ),
              )
              break
            }

            case 'response.mcp_call.fetch_ui': {
              // Tell client to fetch UI resources (has Pomerium session)
              controller.enqueue(
                encoder.encode(
                  `t:${JSON.stringify({
                    type: 'mcp_call_fetch_ui',
                    itemId: chunk.item_id,
                    serverLabel: chunk.server_label,
                    serverUrl: chunk.server_url,
                    toolName: chunk.tool_name,
                    arguments: chunk.arguments,
                  })}\n`,
                ),
              )
              break
            }

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

            case 'response.completed':
              // Log the full response to debug MCP content structure
              console.log('[MCP-UI] Response completed, checking for MCP calls:', {
                hasOutput: !!chunk.response?.output,
                outputLength: chunk.response?.output?.length,
                outputTypes: chunk.response?.output?.map((item: any) => item.type),
              })

              // Extract MCP call results with UI content from the completed response
              if (chunk.response?.output) {
                for (const outputItem of chunk.response.output) {
                  console.log('[MCP-UI] Checking output item:', {
                    type: outputItem.type,
                    id: outputItem.id,
                    hasOutput: !!outputItem.output,
                  })

                  if (outputItem.type === 'mcp_call' && outputItem.output) {
                    // Log the full outputItem to see all available fields
                    console.log('[MCP-UI] Found MCP call in completed response - FULL ITEM:', JSON.stringify(outputItem, null, 2))

                    console.log('[MCP-UI] Found MCP call in completed response:', {
                      itemId: outputItem.id,
                      serverLabel: outputItem.server_label,
                      toolName: outputItem.name,
                      output: outputItem.output,
                      hasContent: !!outputItem.content,
                      contentType: typeof outputItem.content,
                      isOutputArray: Array.isArray(outputItem.output),
                    })

                    // Send MCP content as separate event for rendering in BotMessage
                    controller.enqueue(
                      encoder.encode(
                        `t:${JSON.stringify({
                          type: 'mcp_call_completed',
                          itemId: outputItem.id,
                          serverLabel: outputItem.server_label,
                          toolName: outputItem.name,
                          content: outputItem.output,
                          isError: outputItem.status === 'failed',
                        })}\n`,
                      ),
                    )
                  }
                }
              }

              // Emit tool call completed event with full response
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
