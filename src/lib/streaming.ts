import { APIError } from 'openai'
import mime from 'mime'

// Server-side only imports and functions
let openai: any = null
let fs: any = null
let path: any = null

// Initialize server-side modules only when in Node.js environment
async function initServerModules() {
  if (typeof window === 'undefined' && !openai) {
    const OpenAI = await import('openai')
    openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    })

    fs = await import('fs/promises')
    path = await import('path')
  }
}

// Function to proactively download and cache files
async function downloadAndCacheFile(
  containerId: string,
  fileId: string,
): Promise<void> {
  console.log(
    `[PROACTIVE CACHE] downloadAndCacheFile called with containerId=${containerId}, fileId=${fileId}`,
  )

  // Only run on server side
  if (typeof window !== 'undefined') {
    console.log('[PROACTIVE CACHE] Skipping download on client side')
    return
  }

  console.log(
    '[PROACTIVE CACHE] Running on server side, proceeding with download',
  )

  try {
    console.log('[PROACTIVE CACHE] Initializing server modules...')
    await initServerModules()

    if (!openai || !fs || !path) {
      console.error(
        '[PROACTIVE CACHE] Server modules not initialized properly:',
        { openai: !!openai, fs: !!fs, path: !!path },
      )
      return
    }

    console.log('[PROACTIVE CACHE] Server modules initialized successfully')
    console.log(
      `[PROACTIVE CACHE] Starting download of file ${fileId} from container ${containerId}`,
    )

    // Temporary cache directory for proactive downloads
    const TEMP_CACHE_DIR = path.join(process.cwd(), 'cache', 'temp-files')

    // Ensure temp cache directory exists
    try {
      await fs.mkdir(TEMP_CACHE_DIR, { recursive: true })
    } catch (error) {
      console.error(
        '[TEMP CACHE] Failed to create temp cache directory:',
        error,
      )
    }

    // Download file content from OpenAI using Container Files API
    console.log(
      `[PROACTIVE CACHE] Using Container Files API for container ${containerId} and file ${fileId}`,
    )

    // Use URL constructor for secure path encoding
    const apiUrl = new URL(
      `/v1/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(fileId)}/content`,
      'https://api.openai.com',
    )

    const fileResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    })

    if (!fileResponse.ok) {
      throw new Error(
        `Container Files API error: ${fileResponse.status} ${fileResponse.statusText}`,
      )
    }

    const arrayBuffer = await fileResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get file info to determine filename (fallback to fileId if not available)
    let filename = fileId
    try {
      const fileInfo = await openai.files.retrieve(fileId)
      filename = fileInfo.filename || fileId
    } catch (error) {
      console.warn(
        `[PROACTIVE CACHE] Could not retrieve file info for ${fileId}, using fileId as filename`,
      )
    }

    // Save to temporary cache
    const filePath = path.join(TEMP_CACHE_DIR, `${containerId}_${fileId}`)
    const metadataPath = path.join(
      TEMP_CACHE_DIR,
      `${containerId}_${fileId}.meta.json`,
    )

    const metadata = {
      filename: filename,
      contentType: mime.getType(filename) || 'application/octet-stream',
      timestamp: Date.now(),
    }

    await Promise.all([
      fs.writeFile(filePath, buffer),
      fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2)),
    ])

    console.log(
      `[PROACTIVE CACHE] Successfully cached file ${fileId} to ${filePath}`,
    )
  } catch (error) {
    console.error(`[PROACTIVE CACHE] Error downloading file ${fileId}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      containerId,
      fileId,
    })
  }
}

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

            case 'response.mcp_call.failed':
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
              // Proactively download and cache files before container is destroyed
              console.log(
                '[STREAMING] Received annotation event:',
                chunk.annotation,
              )
              if (chunk.annotation && chunk.annotation.file_id) {
                // Extract container ID from the annotation or use a default
                const containerId = chunk.annotation.container_id || 'default'
                const fileId = chunk.annotation.file_id

                console.log(
                  `[STREAMING] Triggering proactive download for containerId=${containerId}, fileId=${fileId}`,
                )

                // Download asynchronously without blocking the stream
                downloadAndCacheFile(containerId, fileId).catch((error) => {
                  console.error(
                    '[PROACTIVE CACHE] Failed to cache file:',
                    error,
                  )
                })
              } else {
                console.warn(
                  '[STREAMING] Annotation missing file_id:',
                  chunk.annotation,
                )
              }

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
            default:
              // Log unknown tool messages for debugging
              console.warn(
                '[streamText] Unknown chunk type:',
                chunk.type,
                chunk,
              )
              break
          }
        }

        // Flush any remaining content
        flush()
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
