import { useRef, useMemo, useState } from 'react'
import { UserMessage } from './UserMessage'
import { BotMessage } from './BotMessage'
import { ChatInput } from './ChatInput'
import { ServerSelector } from './ServerSelector'
import { useChat } from 'ai/react'
import { generateMessageId } from '../mcp/client'
import type { Message } from 'ai'
import { type Servers, type ToolItem } from '../lib/schemas'
import { ToolCallMessage } from './ToolCallMessage'
import { Toolbox } from './Toolbox'
import { ReasoningMessage } from './ReasoningMessage'
import { useModel } from '../contexts/ModelContext'
import { useUser } from '../contexts/UserContext'
import { Button } from './ui/button'
import { MessageSquarePlus } from 'lucide-react'
import { ModelSelect } from './ModelSelect'
import { BotThinking } from './BotThinking'
import { BotError } from './BotError'
import { stopStreamProcessing } from '@/lib/streaming'

// Streamed event type
type StreamEvent =
  | { type: 'assistant'; id: string; content: string }
  | {
      type: 'tool'
      toolType: string
      serverLabel: string
      tools?: ToolItem[]
      itemId?: string
      toolName?: string
      arguments?: unknown
      delta?: unknown
      error?: string
      status?:
        | 'in_progress'
        | 'completed'
        | 'done'
        | 'arguments_delta'
        | 'arguments_done'
        | 'failed'
    }
  | { type: 'user'; id: string; content: string }
  | {
      type: 'reasoning'
      effort: string
      summary: string | null
      model?: string
      serviceTier?: string
      temperature?: number
      topP?: number
      done?: boolean
    }
  | {
      type: 'error'
      message: string
      details?: unknown
    }

// Helper function to map tool types to status
const getToolStatus = (
  toolType: string,
):
  | 'in_progress'
  | 'completed'
  | 'done'
  | 'arguments_delta'
  | 'arguments_done'
  | 'failed'
  | undefined => {
  if (toolType.includes('failed')) return 'failed'
  if (toolType.includes('in_progress')) return 'in_progress'
  if (toolType.includes('completed')) return 'completed'
  if (toolType.includes('arguments_done')) return 'arguments_done'
  if (toolType.includes('done')) return 'done'
  if (toolType.includes('arguments_delta')) return 'arguments_delta'
  return undefined
}

export function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [focusTimestamp, setFocusTimestamp] = useState(Date.now())
  const [servers, setServers] = useState<Servers>({})
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [streamBuffer, setStreamBuffer] = useState<StreamEvent[]>([])
  const [streaming, setStreaming] = useState(false)
  const { selectedModel, setSelectedModel } = useModel()
  const { user } = useUser()

  const initialMessage = useMemo<Message>(
    () => ({
      id: generateMessageId(),
      content: `Hello ${user?.name?.split(' ')[0] ?? 'there'}! I'm your AI assistant. How can I help you today?`,
      role: 'assistant',
    }),
    [user?.name],
  )

  // Create a memoized body object that updates when selectedServers or model change
  const chatBody = useMemo(
    () => ({
      servers: Object.fromEntries(
        selectedServers
          .map((serverId) => [serverId, servers[serverId]])
          .filter(([_, server]) => server),
      ),
      model: selectedModel,
      userId: user?.id,
    }),
    [selectedServers, servers, selectedModel, user?.id],
  )

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    setInput,
  } = useChat({
    initialMessages: hasStartedChat ? [] : [initialMessage],
    body: chatBody,
    onError: (error) => {
      console.error('Chat error:', error)
      setStreamBuffer((prev) => [
        ...prev,
        {
          type: 'error',
          message:
            error.message || 'An error occurred while sending your message',
        },
      ])
      setStreaming(false)
    },
    onResponse: (response) => {
      if (!response.ok) {
        console.error(
          'Chat response error:',
          response.status,
          response.statusText,
        )
        setStreamBuffer((prev) => [
          ...prev,
          {
            type: 'error',
            message: `Request failed with status ${response.status}: ${response.statusText}`,
          },
        ])
        setStreaming(false)
        return
      }

      setStreaming(true)

      // Clone the response to handle our custom streaming while letting useChat handle its own
      const reader = response.clone().body?.getReader()

      // Stop processing the original response stream
      // This is necessary to prevent useChat from trying to read the stream again. We want to handle it ourselves.
      stopStreamProcessing(response)

      if (!reader) {
        setStreamBuffer((prev) => [
          ...prev,
          {
            type: 'error',
            message: 'Failed to get response stream reader',
          },
        ])
        setStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let assistantId: string | null = null

      const processChunk = (line: string) => {
        if (line.startsWith('e:')) {
          // Handle error messages
          try {
            const errorData = JSON.parse(line.slice(2))

            setStreamBuffer((prev) => [
              ...prev,
              {
                type: 'error',
                message:
                  errorData.message || 'An error occurred during streaming',
                details: errorData.details,
              },
            ])
          } catch (e) {
            console.error('Failed to parse error data:', e)
            setStreamBuffer((prev) => [
              ...prev,
              {
                type: 'error',
                message: 'An unknown error occurred during streaming',
              },
            ])
          }
          return
        }

        if (line.startsWith('t:')) {
          try {
            const toolStateStr = line.slice(2)
            if (!toolStateStr.trim()) {
              console.warn('Empty tool state string')
              return
            }

            const toolState = JSON.parse(toolStateStr)

            // Handle reasoning summary streaming
            if (toolState.type === 'reasoning_summary_delta') {
              setStreamBuffer((prev) => {
                // Find the last reasoning message
                const last = prev[prev.length - 1]
                if (last && last.type === 'reasoning' && !last.done) {
                  // Append delta to summary
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...last,
                      summary: (last.summary || '') + toolState.delta,
                      effort: toolState.effort || last.effort,
                      model: toolState.model || last.model,
                      serviceTier: toolState.serviceTier || last.serviceTier,
                      temperature: toolState.temperature ?? last.temperature,
                      topP: toolState.topP ?? last.topP,
                    },
                  ]
                } else {
                  // Start a new reasoning message
                  return [
                    ...prev,
                    {
                      type: 'reasoning',
                      summary: toolState.delta,
                      effort: toolState.effort || '',
                      model: toolState.model,
                      serviceTier: toolState.serviceTier,
                      temperature: toolState.temperature,
                      topP: toolState.topP,
                      done: false,
                    },
                  ]
                }
              })
              return
            }

            if (toolState.type === 'reasoning_summary_done') {
              setStreamBuffer((prev) => {
                // Mark the last reasoning message as done
                const last = prev[prev.length - 1]
                if (last && last.type === 'reasoning' && !last.done) {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...last,
                      done: true,
                      effort: toolState.effort || last.effort,
                      model: toolState.model || last.model,
                      serviceTier: toolState.serviceTier || last.serviceTier,
                      temperature: toolState.temperature ?? last.temperature,
                      topP: toolState.topP ?? last.topP,
                    },
                  ]
                }
                return prev
              })
              return
            }

            if (toolState.type === 'reasoning') {
              setStreamBuffer((prev) => [
                ...prev,
                {
                  type: 'reasoning',
                  effort: toolState.effort || '',
                  summary: toolState.summary || null,
                  model: toolState.model,
                  serviceTier: toolState.serviceTier,
                  temperature: toolState.temperature,
                  topP: toolState.topP,
                },
              ])
              return
            }

            if ('delta' in toolState) {
              try {
                toolState.delta =
                  'delta' in toolState && toolState.delta !== ''
                    ? JSON.parse(toolState.delta)
                    : {}
              } catch (e) {
                console.error('Failed to parse delta:', toolState.delta)
                toolState.delta = {}
              }
            }

            try {
              toolState.arguments =
                'arguments' in toolState && toolState.arguments !== ''
                  ? JSON.parse(toolState.arguments)
                  : {}
            } catch (e) {
              console.error('Failed to parse arguments:', toolState.arguments)
              toolState.arguments = {}
            }

            setStreamBuffer((prev) => {
              const itemId = toolState.itemId
              if (itemId) {
                // Find existing tool event with same itemId
                const existingIndex = prev.findIndex(
                  (event) =>
                    event.type === 'tool' &&
                    'itemId' in event &&
                    event.itemId === itemId,
                )

                if (existingIndex !== -1) {
                  // Update existing tool event
                  const existingEvent = prev[existingIndex] as Extract<
                    StreamEvent,
                    { type: 'tool' }
                  >
                  const updatedEvent = {
                    ...existingEvent,
                    toolType: toolState.type,
                    serverLabel:
                      toolState.serverLabel || existingEvent.serverLabel,
                    tools: toolState.tools || existingEvent.tools,
                    delta: toolState.delta || existingEvent.delta,
                    arguments: toolState.arguments || existingEvent.arguments,
                    toolName: toolState.toolName || existingEvent.toolName,
                    error: toolState.error || existingEvent.error,
                    status: getToolStatus(toolState.type),
                  }

                  return [
                    ...prev.slice(0, existingIndex),
                    updatedEvent,
                    ...prev.slice(existingIndex + 1),
                  ]
                }
              }

              // Create new tool event
              return [
                ...prev,
                {
                  type: 'tool',
                  toolType: toolState.type,
                  serverLabel: toolState.serverLabel,
                  tools: toolState.tools,
                  itemId: toolState.itemId,
                  delta: toolState.delta,
                  arguments: toolState.arguments,
                  toolName: toolState.toolName,
                  error: toolState.error,
                  status: getToolStatus(toolState.type),
                },
              ]
            })
          } catch (e) {
            console.error('Failed to parse tool state:', e)
          }
        } else if (line.startsWith('0:')) {
          try {
            const text = JSON.parse(line.slice(2))
            setStreamBuffer((prev) => {
              const last = prev[prev.length - 1]
              if (
                last &&
                last.type === 'assistant' &&
                last.id === assistantId
              ) {
                // Append to last assistant message
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + text },
                ]
              } else {
                // Create new assistant message
                assistantId = generateMessageId()
                return [
                  ...prev,
                  { type: 'assistant', id: assistantId, content: text },
                ]
              }
            })
          } catch (e) {
            console.error('Failed to parse text chunk:', e)
          }
        }
      }

      const readChunk = async () => {
        try {
          const { done, value } = await reader.read()
          if (done) {
            setStreaming(false)
            return
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) processChunk(line)
          }

          readChunk()
        } catch (error) {
          console.error('Error reading stream chunk:', error)
          setStreamBuffer((prev) => [
            ...prev,
            {
              type: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to read response stream',
            },
          ])
        }
      }

      readChunk()
    },
  })

  // What to render: if streaming or streamBuffer has content, use streamBuffer; else, use messages
  const renderEvents: (StreamEvent | Message)[] =
    streaming || streamBuffer.length > 0 ? [...streamBuffer] : messages

  // Removed auto-scroll effect; replaced with manual scroll button

  const onSendMessage = (prompt: string) => {
    if (!hasStartedChat) {
      setHasStartedChat(true)
    }
    setStreamBuffer((prev) => [
      ...prev,
      {
        type: 'user',
        id: generateMessageId(),
        content: prompt,
      },
    ])

    handleSubmit(new Event('submit'))
  }

  const handleServerToggle = (serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId],
    )
  }

  const handleNewChat = () => {
    setHasStartedChat(false)
    setStreamBuffer([])
    setStreaming(false)
    setMessages([initialMessage])
    setInput('')
    setFocusTimestamp(Date.now())
  }

  return (
    <div className="flex flex-col min-h-full relative">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleNewChat}
          className="flex items-center gap-2"
        >
          <MessageSquarePlus className="size-4" />
          <span className="sr-only sm:not-sr-only">New Chat</span>
        </Button>
        <ModelSelect value={selectedModel} onValueChange={setSelectedModel} />
      </div>
      <div className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            {renderEvents.map((event, idx) => {
              if ('type' in event && event.type === 'tool') {
                const key = `tool-${event.toolType}-${event.serverLabel || ''}-${event.itemId || generateMessageId()}`
                // Check if this is a tool list (contains tools array) or a tool call
                if (event.tools) {
                  return (
                    <Toolbox
                      key={key}
                      name={event.serverLabel || ''}
                      args={event}
                    />
                  )
                } else {
                  return (
                    <ToolCallMessage
                      key={key}
                      name={event.serverLabel || ''}
                      args={event}
                    />
                  )
                }
              } else if ('type' in event && event.type === 'reasoning') {
                return (
                  <ReasoningMessage
                    key={`reasoning-${idx}-${event.effort}-${event.summary || ''}`}
                    effort={event.effort}
                    summary={event.summary}
                    model={event.model}
                    serviceTier={event.serviceTier}
                    temperature={event.temperature}
                    topP={event.topP}
                    isLoading={streaming && idx === renderEvents.length - 1}
                  />
                )
              } else if ('type' in event && event.type === 'error') {
                const errorEvent = event as Extract<
                  StreamEvent,
                  { type: 'error' }
                >
                return (
                  <BotError key={`error-${idx}`} message={errorEvent.message} />
                )
              } else if ('type' in event && event.type === 'assistant') {
                const assistantEvent = event as Extract<
                  StreamEvent,
                  { type: 'assistant' }
                >
                return (
                  <BotMessage
                    key={assistantEvent.id}
                    message={{
                      id: assistantEvent.id,
                      content: assistantEvent.content,
                      sender: 'agent',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                    isLoading={streaming && idx === renderEvents.length - 1}
                  />
                )
              } else if ('type' in event && event.type === 'user') {
                const userEvent = event as Extract<
                  StreamEvent,
                  { type: 'user' }
                >
                return (
                  <UserMessage
                    key={userEvent.id}
                    message={{
                      id: userEvent.id,
                      content: userEvent.content,
                      sender: 'user',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                  />
                )
              } else {
                // Fallback for Message type (from useChat)
                const message = event as Message
                const isAssistant = message.role === 'assistant'
                if (isAssistant) {
                  return (
                    <BotMessage
                      key={message.id}
                      message={{
                        id: message.id,
                        content: message.content,
                        sender: 'agent',
                        timestamp: new Date(),
                        status: 'sent',
                      }}
                      isLoading={
                        (isLoading || streaming) && message === messages.at(-1)
                      }
                    />
                  )
                } else {
                  return (
                    <UserMessage
                      key={message.id}
                      message={{
                        id: message.id,
                        content: message.content,
                        sender: 'user',
                        timestamp: new Date(),
                        status: 'sent',
                      }}
                    />
                  )
                }
              }
            })}
            {streaming && <BotThinking />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 left-0 right-0">
        {(hasStartedChat || streaming) && (
          <div className="sticky bottom-16 left-0 right-0 flex justify-center px-4 pb-2 z-20">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Scroll to bottom"
              className="rounded-full shadow"
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-chevron-down"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <span className="sr-only">Scroll to bottom</span>
            </Button>
          </div>
        )}
        <ServerSelector
          servers={servers}
          onServersChange={setServers}
          selectedServers={selectedServers}
          onServerToggle={handleServerToggle}
          disabled={hasStartedChat}
        />
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading || streaming}
          value={input}
          onChange={handleInputChange}
          focusTimestamp={focusTimestamp}
        />
      </div>
    </div>
  )
}
