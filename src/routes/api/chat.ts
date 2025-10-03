import { createServerFileRoute } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import { chatRequestSchema } from '../../lib/schemas'
import { streamText } from '../../lib/streaming'
import {
  getSystemPrompt,
  isCodeInterpreterSupported,
  isWebSearchSupported, // NEW
} from '../../lib/utils/prompting'
import { createLogger } from '../../lib/logger'
import type { Tool } from 'openai/resources/responses/responses.mjs'

const log = createLogger('api-chat')

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
        log.error(
          {
            validationErrors: result.error.errors,
            operation: 'chat-validation',
          },
          'Chat request validation failed',
        )
        return new Response(JSON.stringify({ error: result.error.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { messages, servers, model, userId, codeInterpreter, webSearch } =
        result.data

      // Create contextual logger with userId for tracing
      const contextLog = log.child({ userId, model, operation: 'chat-request' })

      if (messages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (codeInterpreter && !isCodeInterpreterSupported(model)) {
        return new Response(
          JSON.stringify({
            error: `Code interpreter is not supported for model: ${model}. Please use a supported model like GPT-5, GPT-4o, or the o3-series.`,
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
        contextLog.info(
          {
            messageCount: messages.length,
            toolCount: tools.length,
            codeInterpreter,
            webSearch,
          },
          'Creating OpenAI response',
        )
        answer = await client.responses.create({
          instructions: systemPrompt,
          model,
          tools,
          input: conversationHistory,
          stream: true,
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
        contextLog.error(
          {
            err: error,
            operation: 'openai-create-response',
          },
          'Error creating OpenAI response',
        )

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

      return streamText(answer, contextLog)
    } catch (error) {
      log.error(
        {
          err: error,
          operation: 'chat-route',
        },
        'Error in chat route',
      )
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
