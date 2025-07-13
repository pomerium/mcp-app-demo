import { useRef, useState, useCallback, useEffect } from 'react'
import { generateMessageId } from '../mcp/client'
import { stopStreamProcessing } from '@/lib/utils/streaming'
import { getTimestamp } from '@/lib/utils/date'

export type StreamEvent =
  | {
      type: 'assistant'
      id: string
      content: string
      fileAnnotations?: Array<{
        type: string
        container_id: string
        file_id: string
        filename: string
        start_index?: number
        end_index?: number
      }>
    }
  | {
      type: 'tool'
      toolType: string
      serverLabel: string
      tools?: any[]
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
  | { type: 'user'; id: string; content: string; timestamp: string }
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
  | {
      type: 'web_search'
      id: string
      status: 'in_progress' | 'searching' | 'completed' | 'failed' | 'result'
      query?: string
      results?: Array<{ title: string; url: string; snippet?: string }>
      error?: string
      raw?: unknown
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

interface UseStreamingChatReturn {
  streamBuffer: StreamEvent[]
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
  const [streamBuffer, setStreamBuffer] = useState<StreamEvent[]>([])
  const [streaming, setStreaming] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)

  const streamUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textBufferRef = useRef<string>('')
  const lastAssistantIdRef = useRef<string | null>(null)
  const pendingStreamEventsRef = useRef<StreamEvent[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamCancelledRef = useRef<boolean>(false)

  const flushTextBuffer = useCallback(() => {
    if (textBufferRef.current && lastAssistantIdRef.current) {
      const assistantId = lastAssistantIdRef.current
      const textToAdd = textBufferRef.current

      setStreamBuffer((prev: StreamEvent[]) => {
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
      setStreamBuffer((prev: StreamEvent[]) => [
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
      }
    }
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('Chat error:', error)
    setStreamBuffer((prev: StreamEvent[]) => [
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
        setStreamBuffer((prev: StreamEvent[]) => [
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
        setStreamBuffer((prev: StreamEvent[]) => [
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
            setStreamBuffer((prev: StreamEvent[]) => [
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
            setStreamBuffer((prev: StreamEvent[]) => [
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
            if (toolState.type === 'tool_call_completed') {
              return
            }
            if (toolState.type === 'stream_done') {
              receivedCompletion = true
              return
            }

            if (toolState.type === 'reasoning_summary_delta') {
              setStreamBuffer((prev: StreamEvent[]) => {
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
              setStreamBuffer((prev: StreamEvent[]) => {
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

              if (toolState.type === 'code_interpreter_file_annotation') {
                const annotationItemId = toolState.itemId
                const annotation = codeInterpreterEvent.annotation
                if (annotation) {
                  setStreamBuffer((prev: StreamEvent[]) => {
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
                setStreamBuffer((prev: StreamEvent[]) => {
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
              setStreamBuffer((prev: StreamEvent[]) => [
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
              setStreamBuffer((prev: StreamEvent[]) => {
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

            setStreamBuffer((prev: StreamEvent[]) => {
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
            setStreamBuffer((prev: StreamEvent[]) => [
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
          setStreamBuffer((prev: StreamEvent[]) => [
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
    setStreamBuffer((prev: StreamEvent[]) => [
      ...prev,
      {
        type: 'user',
        id: generateMessageId(),
        content,
        timestamp: getTimestamp(),
      },
    ])
  }, [])

  const cancelStream = useCallback(() => {
    if (streamUpdateTimeoutRef.current) {
      clearTimeout(streamUpdateTimeoutRef.current)
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
