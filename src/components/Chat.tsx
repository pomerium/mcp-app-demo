import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
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
import { CodeInterpreterToggle } from './CodeInterpreterToggle'
import { ModelSelect } from './ModelSelect'
import { BotThinking } from './BotThinking'
import { BotError } from './BotError'
import { stopStreamProcessing } from '@/lib/utils/streaming'
import { CodeInterpreterMessage } from './CodeInterpreterMessage'
import type { AnnotatedFile } from '@/lib/utils/code-interpreter'
import { isCodeInterpreterSupported } from '@/lib/utils/prompting'
import { useHasMounted } from '@/hooks/useHasMounted'

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
  | {
      type: 'code_interpreter'
      itemId: string
      code?: string
      delta?: string
      annotation?: {
        type: string
        container_id: string
        file_id: string
        filename: string
        start_index: number
        end_index: number
      }
      eventType:
        | 'code_interpreter_call_in_progress'
        | 'code_interpreter_call_code_delta'
        | 'code_interpreter_call_code_done'
        | 'code_interpreter_call_interpreting'
        | 'code_interpreter_call_completed'
    }
  | {
      type: 'code_interpreter_file_annotation'
      annotation: {
        type: string
        container_id: string
        file_id: string
        filename: string
        start_index: number
        end_index: number
      }
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

const getEventKey = (event: StreamEvent | Message, idx: number): string => {
  if ('type' in event) {
    if (event.type === 'tool') {
      return (
        event.itemId || `tool-${idx}-${event.toolType}-${event.serverLabel}`
      )
    }
    if (event.type === 'code_interpreter') {
      return `code-interpreter-${event.itemId}`
    }
    if (event.type === 'assistant') {
      return `assistant-${event.id}`
    }
    if (event.type === 'user') {
      return `user-${event.id}`
    }
    if (event.type === 'reasoning') {
      return `reasoning-${idx}-${event.effort}`
    }
    if (event.type === 'error') {
      return `error-${idx}`
    }
  }
  return `message-${event.id}`
}

export function Chat() {
  const hasMounted = useHasMounted()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [focusTimestamp, setFocusTimestamp] = useState(Date.now())
  const [servers, setServers] = useState<Servers>({})
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [streamBuffer, setStreamBuffer] = useState<StreamEvent[]>([])
  const [streaming, setStreaming] = useState(false)
  const [useCodeInterpreter, setUseCodeInterpreter] = useState(false)
  const { selectedModel, setSelectedModel } = useModel()
  const { user } = useUser()

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel)

    if (!isCodeInterpreterSupported(newModel)) {
      setUseCodeInterpreter(false)
    }
  }

  const streamUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textBufferRef = useRef<string>('')
  const lastAssistantIdRef = useRef<string | null>(null)
  const pendingStreamEventsRef = useRef<StreamEvent[]>([])

  const flushTextBuffer = useCallback(() => {
    if (textBufferRef.current && lastAssistantIdRef.current) {
      const assistantId = lastAssistantIdRef.current
      const textToAdd = textBufferRef.current

      setStreamBuffer((prev) => {
        const existingIndex = prev.findIndex(
          (event) => event.type === 'assistant' && event.id === assistantId,
        )

        if (existingIndex !== -1) {
          // Update existing assistant message
          const updatedEvent = {
            ...prev[existingIndex],
            content:
              (
                prev[existingIndex] as Extract<
                  StreamEvent,
                  { type: 'assistant' }
                >
              ).content + textToAdd,
          }
          return [
            ...prev.slice(0, existingIndex),
            updatedEvent,
            ...prev.slice(existingIndex + 1),
          ]
        } else {
          // Create new assistant message
          return [
            ...prev,
            {
              type: 'assistant' as const,
              id: assistantId,
              content: textToAdd,
            },
          ]
        }
      })

      textBufferRef.current = ''
    }

    if (pendingStreamEventsRef.current.length > 0) {
      setStreamBuffer((prev) => [...prev, ...pendingStreamEventsRef.current])
      pendingStreamEventsRef.current = []
    }
  }, [])

  const updateAssistantText = useCallback(
    (text: string, assistantId: string) => {
      textBufferRef.current += text
      lastAssistantIdRef.current = assistantId

      if (streamUpdateTimeoutRef.current) {
        clearTimeout(streamUpdateTimeoutRef.current)
      }

      streamUpdateTimeoutRef.current = setTimeout(() => {
        flushTextBuffer()
      }, 16)
    },
    [flushTextBuffer],
  )

  useEffect(() => {
    return () => {
      if (streamUpdateTimeoutRef.current) {
        clearTimeout(streamUpdateTimeoutRef.current)
      }
    }
  }, [])

  const initialMessage = useMemo<Message>(
    () => ({
      id: generateMessageId(),
      content: `Hello ${user?.name?.split(' ')[0] ?? 'there'}! I'm your AI assistant. How can I help you today?`,
      role: 'assistant',
    }),
    [user?.name],
  )

  const chatBody = useMemo(
    () => ({
      servers: Object.fromEntries(
        selectedServers
          .map((serverId) => [serverId, servers[serverId]])
          .filter(([_, server]) => server),
      ),
      model: selectedModel,
      userId: user?.id,
      codeInterpreter: useCodeInterpreter,
    }),
    [selectedServers, servers, selectedModel, user?.id, useCodeInterpreter],
  )

  const handleError = useCallback((error: Error) => {
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
  }, [])

  const handleResponse = useCallback(
    (response: Response) => {
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
            // Process error events immediately instead of buffering
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
            // Handle tool_call_completed events
            if (toolState.type === 'tool_call_completed') {
              return
            }

            // Handle reasoning summary streaming
            if (toolState.type === 'reasoning_summary_delta') {
              setStreamBuffer((prev) => {
                const last = prev[prev.length - 1]
                if (last && last.type === 'reasoning' && !last.done) {
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
              pendingStreamEventsRef.current.push({
                type: 'reasoning',
                effort: toolState.effort || '',
                summary: toolState.summary || null,
                model: toolState.model,
                serviceTier: toolState.serviceTier,
                temperature: toolState.temperature,
                topP: toolState.topP,
              })
              return
            }

            // Handle code interpreter events
            if (toolState.type.startsWith('code_interpreter')) {
              const codeInterpreterEvent: Extract<
                StreamEvent,
                { type: 'code_interpreter' }
              > = {
                type: 'code_interpreter',
                itemId: toolState.itemId,
                eventType: toolState.type as any,
                code: toolState.code,
                delta: toolState.delta,
                annotation: toolState.annotation,
              }

              // Use immediate update for code interpreter events
              setStreamBuffer((prev) => {
                const itemId = toolState.itemId

                // Special handling for file annotations - they have different itemIds
                if (toolState.type === 'code_interpreter_file_annotation') {
                  // Extract the shared suffix from the annotation itemId
                  // msg_6867ef114df4819cab4b74c2c6f7546001ba7a3d8f0c4a9a -> 01ba7a3d8f0c4a9a
                  const annotationItemId = toolState.itemId
                  const sharedSuffix = annotationItemId.slice(-16) // Last 16 characters

                  // Find code interpreter event with matching suffix
                  const matchingIndex = [...prev]
                    .reverse()
                    .findIndex(
                      (event) =>
                        event.type === 'code_interpreter' &&
                        event.itemId.endsWith(sharedSuffix),
                    )

                  if (matchingIndex !== -1) {
                    const actualIndex = prev.length - 1 - matchingIndex
                    const existingEvent = prev[actualIndex] as Extract<
                      StreamEvent,
                      { type: 'code_interpreter' }
                    >

                    const updatedEvent = {
                      ...existingEvent,
                      annotation: codeInterpreterEvent.annotation,
                    }

                    console.log(
                      '[Chat] Updated event with annotation:',
                      updatedEvent,
                    )

                    return [
                      ...prev.slice(0, actualIndex),
                      updatedEvent,
                      ...prev.slice(actualIndex + 1),
                    ]
                  }

                  // If no matching code interpreter found, skip this annotation
                  console.warn(
                    '[Chat] No matching code interpreter found for suffix:',
                    sharedSuffix,
                  )
                  return prev
                }

                // Handle other code interpreter events by itemId
                if (itemId) {
                  const existingIndex = prev.findIndex(
                    (event) =>
                      event.type === 'code_interpreter' &&
                      event.itemId === itemId,
                  )

                  if (existingIndex !== -1) {
                    const existingEvent = prev[existingIndex] as Extract<
                      StreamEvent,
                      { type: 'code_interpreter' }
                    >

                    // Handle code accumulation for delta events
                    let updatedCode = existingEvent.code || ''
                    if (
                      toolState.type === 'code_interpreter_call_code_delta' &&
                      codeInterpreterEvent.delta
                    ) {
                      // Accumulate delta into existing code
                      updatedCode =
                        (existingEvent.code || '') + codeInterpreterEvent.delta
                    } else if (
                      toolState.type === 'code_interpreter_call_code_done' &&
                      codeInterpreterEvent.code
                    ) {
                      // Replace with full code when done
                      updatedCode = codeInterpreterEvent.code
                    }

                    const updatedEvent = {
                      ...existingEvent,
                      eventType: codeInterpreterEvent.eventType,
                      code: updatedCode,
                      delta: codeInterpreterEvent.delta || existingEvent.delta,
                      annotation:
                        codeInterpreterEvent.annotation ||
                        existingEvent.annotation,
                    }
                    return [
                      ...prev.slice(0, existingIndex),
                      updatedEvent,
                      ...prev.slice(existingIndex + 1),
                    ]
                  }
                }
                return [...prev, codeInterpreterEvent]
              })
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

            const toolEvent: Extract<StreamEvent, { type: 'tool' }> = {
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
            }

            // Use immediate update for tool events to maintain responsiveness
            setStreamBuffer((prev) => {
              const itemId = toolState.itemId
              if (itemId) {
                const existingIndex = prev.findIndex(
                  (event) =>
                    event.type === 'tool' &&
                    'itemId' in event &&
                    event.itemId === itemId,
                )

                if (existingIndex !== -1) {
                  const existingEvent = prev[existingIndex] as Extract<
                    StreamEvent,
                    { type: 'tool' }
                  >
                  const updatedEvent = {
                    ...existingEvent,
                    toolType: toolEvent.toolType,
                    serverLabel:
                      toolEvent.serverLabel || existingEvent.serverLabel,
                    tools: toolEvent.tools || existingEvent.tools,
                    delta: toolEvent.delta || existingEvent.delta,
                    arguments: toolEvent.arguments || existingEvent.arguments,
                    toolName: toolEvent.toolName || existingEvent.toolName,
                    error: toolEvent.error || existingEvent.error,
                    status: toolEvent.status,
                  }
                  return [
                    ...prev.slice(0, existingIndex),
                    updatedEvent,
                    ...prev.slice(existingIndex + 1),
                  ]
                }
              }
              return [...prev, toolEvent]
            })
          } catch (e) {
            console.error('Failed to parse tool state:', e)
          }
        }
        // --- NEW: Handle OpenAI response.content_part.done JSON chunks ---
        // These are full JSON objects, not prefixed with 0:, t:, or e:
        try {
          const chunkObj = JSON.parse(line)
          if (chunkObj.type === 'response.content_part.done' && chunkObj.part) {
            // This is an assistant message part with possible annotations
            const { item_id, part } = chunkObj
            // Find or create the assistant message in the buffer
            setStreamBuffer((prev) => {
              const existingIndex = prev.findIndex(
                (event) => event.type === 'assistant' && event.id === item_id,
              )
              if (existingIndex !== -1) {
                // Update existing assistant message with content and annotations
                const updatedEvent = {
                  ...prev[existingIndex],
                  content: part.text,
                  fileAnnotations: part.annotations || [],
                }
                return [
                  ...prev.slice(0, existingIndex),
                  updatedEvent,
                  ...prev.slice(existingIndex + 1),
                ]
              } else {
                // Create new assistant message with content and annotations
                return [
                  ...prev,
                  {
                    type: 'assistant',
                    id: item_id,
                    content: part.text,
                    fileAnnotations: part.annotations || [],
                  },
                ]
              }
            })
            return
          }
        } catch (e) {
          // Not a JSON chunk, fall through to legacy 0: handler
        }

        if (line.startsWith('0:')) {
          try {
            const text = JSON.parse(line.slice(2))
            if (!assistantId) {
              assistantId = generateMessageId()
            }
            updateAssistantText(text, assistantId)
          } catch (e) {
            console.error('Failed to parse text chunk:', e)
          }
        }
      }

      const readChunk = async () => {
        try {
          const { done, value } = await reader.read()
          if (done) {
            // Flush any remaining text buffer
            flushTextBuffer()
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
          setStreaming(false)
        }
      }

      readChunk()
    },
    [updateAssistantText, flushTextBuffer],
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
    body: chatBody,
    onError: handleError,
    onResponse: handleResponse,
  })

  const renderEvents = useMemo<(StreamEvent | Message)[]>(() => {
    if (streaming || streamBuffer.length > 0) {
      return [...streamBuffer]
    }
    // Show initial message only when there are no real messages and no streaming
    if (messages.length === 0 && !hasStartedChat) {
      return [initialMessage]
    }
    return messages
  }, [streaming, streamBuffer, messages, hasStartedChat, initialMessage])

  // Extract file annotations from code interpreter events
  const fileAnnotations = useMemo(() => {
    const annotations: Array<AnnotatedFile> = []

    renderEvents.forEach((event) => {
      if (
        'type' in event &&
        event.type === 'code_interpreter' &&
        event.annotation
      ) {
        annotations.push({
          type: event.annotation.type,
          container_id: event.annotation.container_id,
          file_id: event.annotation.file_id,
          filename: event.annotation.filename,
        })
      }
    })

    return annotations
  }, [renderEvents])

  const handleSendMessage = useCallback(
    (prompt: string) => {
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
    },
    [hasStartedChat, handleSubmit],
  )

  const handleServerToggle = useCallback((serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId],
    )
  }, [])

  const handleNewChat = useCallback(() => {
    if (streamUpdateTimeoutRef.current) {
      clearTimeout(streamUpdateTimeoutRef.current)
    }

    setHasStartedChat(false)
    setStreamBuffer([])
    setStreaming(false)
    setMessages([]) // Clear messages completely - initialMessage will be shown via renderEvents logic
    setInput('')
    setFocusTimestamp(Date.now())
    setUseCodeInterpreter(false)

    textBufferRef.current = ''
    lastAssistantIdRef.current = null
    pendingStreamEventsRef.current = []
  }, [setMessages, setInput])

  const handleScrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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
        <ModelSelect value={selectedModel} onValueChange={handleModelChange} />
      </div>
      <div className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            {renderEvents.map((event, idx) => {
              const key = getEventKey(event, idx)

              if ('type' in event && event.type === 'tool') {
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
                    key={key}
                    effort={event.effort}
                    summary={event.summary}
                    model={event.model}
                    serviceTier={event.serviceTier}
                    temperature={event.temperature}
                    topP={event.topP}
                    isLoading={streaming && idx === renderEvents.length - 1}
                  />
                )
              } else if ('type' in event && event.type === 'code_interpreter') {
                return (
                  <CodeInterpreterMessage
                    key={key}
                    name="Code Interpreter"
                    args={{
                      type: event.eventType,
                      itemId: event.itemId,
                      code: event.code,
                      delta: event.delta,
                      annotation: event.annotation,
                    }}
                  />
                )
              } else if (
                'type' in event &&
                event.type === 'code_interpreter_file_annotation'
              ) {
                // Render the file annotation as its own BotMessage
                return (
                  <BotMessage
                    key={key}
                    message={{
                      id: key,
                      content: '', // No text, just the file
                      sender: 'agent',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                    fileAnnotations={[event.annotation]}
                  />
                )
              } else if ('type' in event && event.type === 'error') {
                return <BotError key={key} message={event.message} />
              } else if ('type' in event && event.type === 'assistant') {
                return (
                  <BotMessage
                    key={key}
                    message={{
                      id: event.id,
                      content: event.content,
                      sender: 'agent',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                    fileAnnotations={event.fileAnnotations || []}
                  />
                )
              } else if ('type' in event && event.type === 'user') {
                return (
                  <UserMessage
                    key={key}
                    message={{
                      id: event.id,
                      content: event.content,
                      sender: 'user',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                  />
                )
              } else {
                // Fallback for Message type (from useChat)
                const message = event as Message
                // Only render if the event has an 'id' property (i.e., is a Message)
                if ('id' in event) {
                  const isAssistant = message.role === 'assistant'
                  if (isAssistant) {
                    return (
                      <BotMessage
                        key={key}
                        message={{
                          id: message.id,
                          content: message.content,
                          sender: 'agent',
                          timestamp: new Date(),
                          status: 'sent',
                        }}
                      />
                    )
                  } else {
                    return (
                      <UserMessage
                        key={key}
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
                // If not a Message (e.g., code_interpreter_file_annotation), skip rendering in fallback
                return null
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
              onClick={handleScrollToBottom}
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
        {hasMounted && (
          <div className="md:border-t border-gray-200 dark:border-gray-800 bg-background p-2 md:p-4">
            <ServerSelector
              servers={servers}
              onServersChange={setServers}
              selectedServers={selectedServers}
              onServerToggle={handleServerToggle}
              disabled={hasStartedChat}
            >
              <CodeInterpreterToggle
                useCodeInterpreter={useCodeInterpreter}
                onToggle={setUseCodeInterpreter}
                selectedModel={selectedModel}
                disabled={hasStartedChat}
              />
            </ServerSelector>
          </div>
        )}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || streaming}
          value={input}
          onChange={handleInputChange}
          focusTimestamp={focusTimestamp}
        />
      </div>
    </div>
  )
}
