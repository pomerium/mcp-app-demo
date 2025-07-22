import { createServerFileRoute } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import { chatRequestSchema, backgroundJobSchema } from '../../lib/schemas'
import { streamText } from '../../lib/streaming'
import {
  getSystemPrompt,
  isCodeInterpreterSupported,
  isWebSearchSupported, // NEW
} from '../../lib/utils/prompting'
import type { Tool } from 'openai/resources/responses/responses.mjs'

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

      const { messages, servers, model, userId, codeInterpreter, webSearch, background, store } =
        result.data

      if (messages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (codeInterpreter && !isCodeInterpreterSupported(model)) {
        return new Response(
          JSON.stringify({
            error: `Code interpreter is not supported for model: ${model}. Please use a supported model like GPT-4o or o3-series.`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (webSearch && !isWebSearchSupported(model)) {
        return new Response(
          JSON.stringify({
            error: `Web search is not supported for model: ${model}.`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // Function to sanitize server labels for OpenAI API requirements
      const sanitizeServerLabel = (name: string): string => {
        return name
          .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace invalid chars with underscore
          .replace(/^[^a-zA-Z]/, 'server_') // Ensure it starts with a letter
          .replace(/_{2,}/g, '_') // Replace multiple underscores with single one
      }

      const tools: Array<Tool> = [
        ...Object.entries(servers)
          .filter(([_, server]) => server.status === 'connected')
          .map(
            ([_id, server]) =>
              ({
                type: 'mcp',
                server_label: sanitizeServerLabel(server.name),
                server_url: server.url,
                require_approval: 'never',
                headers: {
                  Authorization: `Bearer ${bearerToken}`,
                },
              }) as Tool,
          ),
      ]

      // Add code interpreter tool if enabled and supported by model
      if (codeInterpreter && isCodeInterpreterSupported(model)) {
        tools.push({
          type: 'code_interpreter',
          container: { type: 'auto' },
        })
      }

      // Add web search tool if enabled and supported by model
      if (webSearch && isWebSearchSupported(model)) {
        tools.push({
          type: 'web_search_preview',
        })
      }

      // System prompt for proper markdown formatting (conditionally includes code interpreter instructions and chart enhancements)
      const latestUserMessage = messages[messages.length - 1]
      const systemPrompt = getSystemPrompt(
        codeInterpreter,
        latestUserMessage.role === 'user'
          ? latestUserMessage.content
          : undefined,
      )

      // Format the conversation history into a single input string with proper message parts
      const conversationHistory = messages
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

      let answer
      try {
        answer = await client.responses.create({
          instructions: systemPrompt,
          model,
          tools,
          input: conversationHistory,
          stream: true,
          background: background, // Use OpenAI's background mode
          store: background || store, // Store if background or explicitly requested
          user: userId,
          ...(model.startsWith('o3') || model.startsWith('o4')
            ? {
                reasoning: {
                  summary: 'detailed',
                },
              }
            : {}),
        })
      } catch (error) {
        console.error('Error creating OpenAI response:', error)

        // Handle specific OpenAI API errors
        if (error instanceof OpenAI.APIError) {
          const statusCode = error.status || 500
          let clientMessage = 'An error occurred while processing your request'

          // Map status codes to client messages
          switch (statusCode) {
            case 401:
              clientMessage =
                'Authentication failed. Please check your credentials and try again.'
              break
            case 403:
              clientMessage =
                'Access denied. You may not have permission to use this resource.'
              break
            case 429:
              clientMessage = 'Rate limit exceeded. Please try again later.'
              break
            case 400:
              clientMessage =
                'Invalid request. Please check your input and try again.'
              break
          }

          return new Response(
            JSON.stringify({
              error: clientMessage,
              details:
                process.env.NODE_ENV === 'development'
                  ? error.message
                  : undefined,
            }),
            {
              status: statusCode,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // For background jobs, we need to inject job creation events into the stream
      if (background && answer) {
        console.log('OpenAI answer object:', answer) // Debug: see what's in the answer object
        console.log('Answer keys:', Object.keys(answer)) // Debug: see available properties
        
        const responseId = answer.id || answer.response_id || crypto.randomUUID() // Fallback to generated ID if OpenAI ID not available
        const jobId = crypto.randomUUID() // Generate a local job ID
        
        // Extract the user's latest message as the job title
        const latestUserMessage = messages[messages.length - 1]
        const title = latestUserMessage?.content?.slice(0, 100) || 'Background Job'
        
        // Create background job object
        const backgroundJob = {
          id: jobId,
          requestId: responseId,
          status: 'running' as const,
          createdAt: new Date().toISOString(),
          title: title,
        }
        
        // Validate the background job
        const jobResult = backgroundJobSchema.safeParse(backgroundJob)
        if (!jobResult.success) {
          console.error('Background job validation failed:', jobResult.error)
          return new Response(
            JSON.stringify({ error: 'Failed to create background job' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        
        // Create a custom stream that injects the background job events
        const originalStream = streamText(answer)
        
        return new Response(
          new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder()
              const reader = originalStream.body?.getReader()
              
              if (reader) {
                try {
                  // First, read and send the initial message ID frame from OpenAI
                  const firstChunk = await reader.read()
                  if (!firstChunk.done && firstChunk.value) {
                    controller.enqueue(firstChunk.value)
                  }
                  
                  // Now send our background job creation event (raw JSON for main parser)
                  const backgroundJobEvent = {
                    type: 'background_job_created',
                    jobId: jobId,
                    requestId: responseId,
                    backgroundJob: jobResult.data
                  }
                  controller.enqueue(encoder.encode(`${JSON.stringify(backgroundJobEvent)}\n`))
                  
                  // Then send an assistant message about the job being started (raw JSON for main parser)
                  const assistantMessage = {
                    type: 'assistant',
                    id: crypto.randomUUID(),
                    content: `Background job started: "${title}". Check the Jobs panel to see progress.`
                  }
                  controller.enqueue(encoder.encode(`${JSON.stringify(assistantMessage)}\n`))
                  
                  // Continue piping through the rest of the OpenAI stream
                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    controller.enqueue(value)
                  }
                } catch (error) {
                  console.error('Error reading from OpenAI stream:', error)
                } finally {
                  reader.releaseLock()
                }
              }
              
              controller.close()
            }
          }),
          {
            status: originalStream.status,
            headers: originalStream.headers,
          }
        )
      }

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
