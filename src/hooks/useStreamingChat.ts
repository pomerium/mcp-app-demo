import { useCallback, useEffect, useRef, useState } from 'react'
import { generateMessageId } from '../mcp/client'
import type { AnnotatedFile } from '@/lib/utils/code-interpreter'
import { stopStreamProcessing } from '@/lib/utils/streaming'
import { getTimestamp } from '@/lib/utils/date'

export type AssistantStreamEvent = {
  type: 'assistant'
  id: string
  content: string
  fileAnnotations?: Array<AnnotatedFile>
  // optional mcp-ui content items (text, resource, image)
  mcpContent?: Array<unknown>
}

export type ToolStreamEvent = {
  type: 'tool'
  toolType: string
  serverLabel: string
  tools?: Array<any>
  itemId?: string
  toolName?: string
  arguments?: unknown
  delta?: unknown
  error?: string
  content?: Array<any> // MCP tool response content (can include UI resources)
  status?:
    | 'in_progress'
    | 'completed'
    | 'done'
    | 'arguments_delta'
    | 'arguments_done'
    | 'failed'
}

export type CodeInterpreterStreamEvent = {
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

export type CodeInterpreterFileAnnotationStreamEvent = {
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

export type UserStreamEvent = {
  type: 'user'
  id: string
  content: string
  timestamp: string
}

export type ReasoningStreamEvent = {
  type: 'reasoning'
  effort: string
  summary: string | null
  model?: string
  serviceTier?: string
  temperature?: number
  topP?: number
  done?: boolean
}

export type ErrorStreamEvent = {
  type: 'error'
  message: string
  details?: unknown
}

export type WebSearchStreamEvent = {
  type: 'web_search'
  id: string
  status: 'in_progress' | 'searching' | 'completed' | 'failed' | 'result'
  query?: string
  results?: Array<{ title: string; url: string; snippet?: string }>
  error?: string
  raw?: unknown
}

export type StreamEvent =
  | AssistantStreamEvent
  | ToolStreamEvent
  | CodeInterpreterStreamEvent
  | CodeInterpreterFileAnnotationStreamEvent
  | UserStreamEvent
  | ReasoningStreamEvent
  | ErrorStreamEvent
  | WebSearchStreamEvent

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
  switch (true) {
    case toolType.includes('failed'):
      return 'failed'
    case toolType.includes('in_progress'):
      return 'in_progress'
    case toolType.includes('completed'):
      return 'completed'
    case toolType.includes('arguments_done'):
      return 'arguments_done'
    case toolType.includes('done'):
      return 'done'
    case toolType.includes('arguments_delta'):
      return 'arguments_delta'
  }
  return undefined
}

interface UseStreamingChatReturn {
  streamBuffer: Array<StreamEvent>
  streaming: boolean
  timedOut: boolean
  requestId: string | null
  handleResponse: (response: Response) => void
  handleError: (error: Error) => void
  addUserMessage: (content: string) => void
  cancelStream: () => void
  clearBuffer: () => void
}

export function useStreamingChat(): UseStreamingChatReturn {
  const [streamBuffer, setStreamBuffer] = useState<Array<StreamEvent>>([])
  const [streaming, setStreaming] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)

  const streamUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textBufferRef = useRef<string>('')
  const lastAssistantIdRef = useRef<string | null>(null)
  const pendingStreamEventsRef = useRef<Array<StreamEvent>>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamCancelledRef = useRef<boolean>(false)

  const flushTextBuffer = useCallback(() => {
    if (textBufferRef.current && lastAssistantIdRef.current) {
      const assistantId = lastAssistantIdRef.current
      const textToAdd = textBufferRef.current

      setStreamBuffer((prev: Array<StreamEvent>) => {
        const existingIndex = prev.findIndex(
          (event: StreamEvent) =>
            event.type === 'assistant' && event.id === assistantId,
        )

        if (existingIndex !== -1) {
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
      setStreamBuffer((prev: Array<StreamEvent>) => [
        ...prev,
        ...pendingStreamEventsRef.current,
      ])
      pendingStreamEventsRef.current = []
    }
  }, [])

  const updateAssistantText = useCallback(
    (text: string, assistantId: string) => {
      if (
        lastAssistantIdRef.current &&
        lastAssistantIdRef.current !== assistantId
      ) {
        flushTextBuffer()
      }
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
        streamUpdateTimeoutRef.current = null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      streamCancelledRef.current = true
    }
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('Chat error:', error)
    setStreamBuffer((prev: Array<StreamEvent>) => [
      ...prev,
      {
        type: 'error',
        message:
          error.message || 'An error occurred while sending your message',
      },
    ])
    setStreaming(false)
    setTimedOut(false)
  }, [])

  const handleResponse = useCallback(
    (response: Response) => {
      const xRequestId = response.headers.get('x-request-id')
      setRequestId(xRequestId)

      if (!response.ok) {
        console.error(
          'Chat response error:',
          response.status,
          response.statusText,
        )
        setStreamBuffer((prev: Array<StreamEvent>) => [
          ...prev,
          {
            type: 'error',
            message: `Request failed with status ${response.status}: ${response.statusText}`,
          },
        ])
        setStreaming(false)
        setTimedOut(false)
        return
      }

      setStreaming(true)
      setTimedOut(false)

      abortControllerRef.current = new AbortController()
      streamCancelledRef.current = false

      const reader = response.clone().body?.getReader()
      stopStreamProcessing(response)

      if (!reader) {
        setStreamBuffer((prev: Array<StreamEvent>) => [
          ...prev,
          {
            type: 'error',
            message: 'Failed to get response stream reader',
          },
        ])
        setStreaming(false)
        setTimedOut(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let assistantId: string | null = null
      let receivedCompletion = false

      const processChunk = (line: string) => {
        if (
          abortControllerRef.current?.signal.aborted ||
          streamCancelledRef.current
        ) {
          return
        }

        if (line.startsWith('e:')) {
          try {
            const errorData = JSON.parse(line.slice(2))
            setStreamBuffer((prev: Array<StreamEvent>) => [
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
            setStreamBuffer((prev: Array<StreamEvent>) => [
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
            if (!toolStateStr || !toolStateStr.trim()) {
              console.warn('Empty tool state string')
              return
            }

            const toolState = JSON.parse(toolStateStr)
            if (!toolState || typeof toolState !== 'object') {
              console.warn('Invalid tool state object')
              return
            }
            if (toolState.type === 'tool_call_completed') {
              return
            }
            if (toolState.type === 'stream_done') {
              receivedCompletion = true
              return
            }

            if (toolState.type === 'reasoning_summary_delta') {
              setStreamBuffer((prev: Array<StreamEvent>) => {
                const last = prev[prev.length - 1]
                // Tests fail if we don't check for undefined
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
              setStreamBuffer((prev: Array<StreamEvent>) => {
                const last = prev[prev.length - 1]
                if (last.type === 'reasoning' && !last.done) {
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

            if (toolState.type.startsWith('code_interpreter')) {
              const codeInterpreterEvent: Extract<
                StreamEvent,
                { type: 'code_interpreter' }
              > = {
                type: 'code_interpreter',
                itemId: toolState.itemId,
                eventType: toolState.type,
                code: toolState.code,
                delta: toolState.delta,
                annotation: toolState.annotation,
              }

              if (toolState.type === 'code_interpreter_file_annotation') {
                const annotationItemId = toolState.itemId
                const annotation = codeInterpreterEvent.annotation
                if (annotation) {
                  setStreamBuffer((prev: Array<StreamEvent>) => {
                    const lastAssistantIdx = [...prev]
                      .reverse()
                      .findIndex(
                        (event: StreamEvent) => event.type === 'assistant',
                      )
                    if (lastAssistantIdx !== -1) {
                      const actualIdx = prev.length - 1 - lastAssistantIdx
                      const existingEvent = prev[actualIdx]
                      const updatedEvent = {
                        ...existingEvent,
                        fileAnnotations: [
                          ...((existingEvent.type === 'assistant' &&
                            existingEvent.fileAnnotations) ||
                            []),
                          annotation,
                        ],
                      }
                      return [
                        ...prev.slice(0, actualIdx),
                        updatedEvent,
                        ...prev.slice(actualIdx + 1),
                      ]
                    }
                    return [
                      ...prev,
                      {
                        type: 'assistant',
                        id: `file-annotation-${annotationItemId}`,
                        content: '',
                        fileAnnotations: [annotation],
                      },
                    ]
                  })
                  return
                }
                return
              }

              if (codeInterpreterEvent.itemId) {
                setStreamBuffer((prev: Array<StreamEvent>) => {
                  const existingIndex = prev.findIndex(
                    (event: StreamEvent) =>
                      event.type === 'code_interpreter' &&
                      event.itemId === codeInterpreterEvent.itemId,
                  )

                  if (existingIndex !== -1) {
                    const existingEvent = prev[existingIndex] as Extract<
                      StreamEvent,
                      { type: 'code_interpreter' }
                    >

                    let updatedCode = existingEvent.code || ''
                    if (
                      toolState.type === 'code_interpreter_call_code_delta' &&
                      codeInterpreterEvent.delta
                    ) {
                      updatedCode =
                        (existingEvent.code || '') + codeInterpreterEvent.delta
                    } else if (
                      toolState.type === 'code_interpreter_call_code_done' &&
                      codeInterpreterEvent.code
                    ) {
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
                  return [...prev, codeInterpreterEvent]
                })
                return
              }
              setStreamBuffer((prev: Array<StreamEvent>) => [
                ...prev,
                codeInterpreterEvent,
              ])
              return
            }

            if (
              toolState.type &&
              toolState.type.startsWith('response.web_search_call.')
            ) {
              let status:
                | 'in_progress'
                | 'searching'
                | 'completed'
                | 'failed'
                | 'result' = 'in_progress'
              if (toolState.type.endsWith('in_progress')) status = 'in_progress'
              else if (toolState.type.endsWith('searching'))
                status = 'searching'
              else if (toolState.type.endsWith('completed'))
                status = 'completed'
              else if (toolState.type.endsWith('failed')) status = 'failed'
              else if (toolState.type.endsWith('result')) status = 'result'
              setStreamBuffer((prev: Array<StreamEvent>) => {
                const existingIdx = prev.findIndex(
                  (e) => e.type === 'web_search' && e.id === toolState.item_id,
                )
                const newEvent: Extract<StreamEvent, { type: 'web_search' }> = {
                  type: 'web_search',
                  id: toolState.item_id,
                  status,
                  query: toolState.query,
                  error: toolState.error,
                  raw: toolState,
                }
                if (existingIdx !== -1) {
                  return [
                    ...prev.slice(0, existingIdx),
                    newEvent,
                    ...prev.slice(existingIdx + 1),
                  ]
                } else {
                  return [...prev, newEvent]
                }
              })
              return
            }

            // Handle MCP call completed with UI resources
            if (toolState.type === 'mcp_call_completed' && toolState.content) {
              // Check if content includes UI resources
              const hasUIResources =
                Array.isArray(toolState.content) &&
                toolState.content.some(
                  (item: any) =>
                    item.type === 'resource' &&
                    item.resource?.uri?.startsWith('ui://'),
                )

              if (hasUIResources) {
                const assistantId = generateMessageId()
                setStreamBuffer((prev: Array<StreamEvent>) => [
                  ...prev,
                  {
                    type: 'assistant' as const,
                    id: assistantId,
                    content: '', // No text content for UI-only messages
                    mcpContent: toolState.content, // Pass through the full content array
                  },
                ])
              }
            }

            if ('delta' in toolState) {
              try {
                toolState.delta =
                  'delta' in toolState && toolState.delta !== ''
                    ? JSON.parse(toolState.delta)
                    : {}
              } catch (e) {
                console.error('Failed to parse delta:', {
                  delta: toolState.delta,
                  e,
                })
                toolState.delta = {}
              }
            }

            try {
              toolState.arguments =
                'arguments' in toolState && toolState.arguments !== ''
                  ? JSON.parse(toolState.arguments)
                  : {}
            } catch (e) {
              console.error('Failed to parse arguments:', {
                arguments: toolState.arguments,
                e,
              })
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
              content: toolState.content, // Pass through content from tool response
              status: getToolStatus(toolState.type),
            }

            setStreamBuffer((prev: Array<StreamEvent>) => {
              const itemId = toolState.itemId
              if (itemId) {
                const existingIndex = prev.findIndex(
                  (event: StreamEvent) =>
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
                    content: toolEvent.content || existingEvent.content,
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

        try {
          const chunkObj = JSON.parse(line)
          if (chunkObj.type === 'response.content_part.done' && chunkObj.part) {
            flushTextBuffer()
            const { item_id, part } = chunkObj
            setStreamBuffer((prev: Array<StreamEvent>) => [
              ...prev.filter(
                (event: StreamEvent) =>
                  !(event.type === 'assistant' && event.id === item_id),
              ),
              {
                type: 'assistant',
                id: item_id,
                content: part.text,
                fileAnnotations: part.annotations || [],
              },
            ])
            return
          }
        } catch {
          // Not a JSON chunk, fall through to legacy 0: handler
        }

        if (line.startsWith('0:')) {
          try {
            const textChunk = line.slice(2)
            if (!textChunk || !textChunk.trim()) {
              console.warn('Empty text chunk')
              return
            }

            const text = JSON.parse(textChunk)
            if (typeof text !== 'string') {
              console.warn('Text chunk is not a string:', text)
              return
            }

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
          if (
            abortControllerRef.current?.signal.aborted ||
            streamCancelledRef.current
          ) {
            return
          }

          const { done, value } = await reader.read()
          if (done) {
            flushTextBuffer()
            setStreaming(false)
            if (!receivedCompletion) {
              setTimedOut(true)
            }
            return
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) processChunk(line)
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!streamCancelledRef.current) {
            readChunk()
          }
        } catch (error) {
          if (
            abortControllerRef.current?.signal.aborted ||
            streamCancelledRef.current
          ) {
            return
          }

          console.error('Error reading stream chunk:', error)
          setStreamBuffer((prev: Array<StreamEvent>) => [
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

  const addUserMessage = useCallback((content: string) => {
    if (!content || typeof content !== 'string') {
      console.warn('addUserMessage: Invalid content provided', content)
      return
    }

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      console.warn('addUserMessage: Empty content after trimming')
      return
    }

    setStreamBuffer((prev: Array<StreamEvent>) => [
      ...prev,
      {
        type: 'user',
        id: generateMessageId(),
        content: trimmedContent,
        timestamp: getTimestamp(),
      },
    ])
  }, [])

  const cancelStream = useCallback(() => {
    if (streamUpdateTimeoutRef.current) {
      clearTimeout(streamUpdateTimeoutRef.current)
      streamUpdateTimeoutRef.current = null
    }

    streamCancelledRef.current = true

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setStreaming(false)
    setTimedOut(false)

    textBufferRef.current = ''
    lastAssistantIdRef.current = null
    pendingStreamEventsRef.current = []
  }, [])

  const clearBuffer = useCallback(() => {
    setStreamBuffer([])
    setTimedOut(false)
    setRequestId(null)
  }, [])

  return {
    streamBuffer,
    streaming,
    timedOut,
    requestId,
    handleResponse,
    handleError,
    addUserMessage,
    cancelStream,
    clearBuffer,
  }
}
