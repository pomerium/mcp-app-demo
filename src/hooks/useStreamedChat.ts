import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { generateMessageId } from '../mcp/client'
import type { ToolItem } from '../lib/schemas'

// Streamed event types
export type StreamEvent =
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

// Reducer actions
type StreamAction =
  | { type: 'ADD_EVENT'; event: StreamEvent }
  | { type: 'UPDATE_ASSISTANT_TEXT'; id: string; text: string }
  | { type: 'UPDATE_TOOL_EVENT'; itemId: string; event: Partial<StreamEvent> }
  | { type: 'UPDATE_REASONING_DELTA'; delta: string; metadata: any }
  | { type: 'COMPLETE_REASONING'; metadata: any }
  | { type: 'RESET' }
  | { type: 'ADD_USER_MESSAGE'; content: string }

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

// Stream event reducer
function streamReducer(
  state: StreamEvent[],
  action: StreamAction,
): StreamEvent[] {
  switch (action.type) {
    case 'ADD_EVENT':
      return [...state, action.event]

    case 'UPDATE_ASSISTANT_TEXT': {
      const existingIndex = state.findIndex(
        (event) => event.type === 'assistant' && event.id === action.id,
      )

      if (existingIndex !== -1) {
        const existingEvent = state[existingIndex] as Extract<
          StreamEvent,
          { type: 'assistant' }
        >
        const updatedEvent = {
          ...existingEvent,
          content: existingEvent.content + action.text,
        }
        return [
          ...state.slice(0, existingIndex),
          updatedEvent,
          ...state.slice(existingIndex + 1),
        ]
      }

      return [
        ...state,
        {
          type: 'assistant',
          id: action.id,
          content: action.text,
        },
      ]
    }

    case 'UPDATE_TOOL_EVENT': {
      const existingIndex = state.findIndex(
        (event) =>
          event.type === 'tool' &&
          'itemId' in event &&
          event.itemId === action.itemId,
      )

      if (existingIndex !== -1) {
        const existingEvent = state[existingIndex] as Extract<
          StreamEvent,
          { type: 'tool' }
        >
        const eventUpdate = action.event as Extract<
          StreamEvent,
          { type: 'tool' }
        >
        const updatedEvent: Extract<StreamEvent, { type: 'tool' }> = {
          ...existingEvent,
          ...eventUpdate,
          // Preserve existing values if new ones are undefined
          serverLabel: eventUpdate.serverLabel || existingEvent.serverLabel,
          tools: eventUpdate.tools || existingEvent.tools,
          delta: eventUpdate.delta || existingEvent.delta,
          arguments: eventUpdate.arguments || existingEvent.arguments,
          toolName: eventUpdate.toolName || existingEvent.toolName,
          error: eventUpdate.error || existingEvent.error,
        }
        return [
          ...state.slice(0, existingIndex),
          updatedEvent,
          ...state.slice(existingIndex + 1),
        ]
      }

      return [...state, action.event as StreamEvent]
    }

    case 'UPDATE_REASONING_DELTA': {
      const lastIndex = state.length - 1
      const lastEvent = state[lastIndex]

      if (lastEvent && lastEvent.type === 'reasoning' && !lastEvent.done) {
        const updatedEvent = {
          ...lastEvent,
          summary: (lastEvent.summary || '') + action.delta,
          ...action.metadata,
        }
        return [...state.slice(0, lastIndex), updatedEvent]
      }

      return [
        ...state,
        {
          type: 'reasoning',
          summary: action.delta,
          effort: action.metadata.effort || '',
          model: action.metadata.model,
          serviceTier: action.metadata.serviceTier,
          temperature: action.metadata.temperature,
          topP: action.metadata.topP,
          done: false,
        },
      ]
    }

    case 'COMPLETE_REASONING': {
      const lastIndex = state.length - 1
      const lastEvent = state[lastIndex]

      if (lastEvent && lastEvent.type === 'reasoning' && !lastEvent.done) {
        const updatedEvent = {
          ...lastEvent,
          ...action.metadata,
          done: true,
        }
        return [...state.slice(0, lastIndex), updatedEvent]
      }

      return state
    }

    case 'ADD_USER_MESSAGE':
      return [
        ...state,
        {
          type: 'user',
          id: generateMessageId(),
          content: action.content,
        },
      ]

    case 'RESET':
      return []

    default:
      return state
  }
}

export interface ChatBody {
  id: string
  messages: Array<{ role: string; content: string }>
  servers: Record<string, any>
  model: string
  userId: string
}

export function useStreamedChat(
  bodyTemplate: Omit<ChatBody, 'messages' | 'id'>,
  onError: (error: Error) => void,
) {
  const [events, dispatch] = useReducer(streamReducer, [])
  const [streaming, setStreaming] = useState(false)

  // Refs for streaming management
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textBufferRef = useRef<string>('')
  const lastAssistantIdRef = useRef<string | null>(null)
  const pendingEventsRef = useRef<StreamEvent[]>([])

  // Convert events to messages for API
  const getMessages = useCallback((): ChatBody['messages'] => {
    return events
      .filter((event) => event.type === 'user' || event.type === 'assistant')
      .map((event) => ({
        role: event.type === 'user' ? 'user' : 'assistant',
        content: event.content,
      }))
  }, [events])

  // Debounced text buffer flushing
  const flushTextBuffer = useCallback(() => {
    if (textBufferRef.current && lastAssistantIdRef.current) {
      dispatch({
        type: 'UPDATE_ASSISTANT_TEXT',
        id: lastAssistantIdRef.current,
        text: textBufferRef.current,
      })
      textBufferRef.current = ''
    }

    // Flush any pending events
    if (pendingEventsRef.current.length > 0) {
      pendingEventsRef.current.forEach((event) => {
        dispatch({ type: 'ADD_EVENT', event })
      })
      pendingEventsRef.current = []
    }
  }, [])

  // Debounced assistant text update
  const updateAssistantText = useCallback(
    (text: string, assistantId: string) => {
      textBufferRef.current += text
      lastAssistantIdRef.current = assistantId

      if (streamUpdateTimeoutRef.current) {
        clearTimeout(streamUpdateTimeoutRef.current)
      }

      streamUpdateTimeoutRef.current = setTimeout(() => {
        flushTextBuffer()
      }, 16) // ~60fps
    },
    [flushTextBuffer],
  )

  // Stream processing logic
  const processChunk = useCallback(
    (line: string) => {
      if (line.startsWith('e:')) {
        // Handle error messages
        try {
          const errorData = JSON.parse(line.slice(2))
          pendingEventsRef.current.push({
            type: 'error',
            message: errorData.message || 'An error occurred during streaming',
            details: errorData.details,
          })
        } catch (e) {
          console.error('Failed to parse error data:', e)
          pendingEventsRef.current.push({
            type: 'error',
            message: 'An unknown error occurred during streaming',
          })
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
            dispatch({
              type: 'UPDATE_REASONING_DELTA',
              delta: toolState.delta,
              metadata: {
                effort: toolState.effort,
                model: toolState.model,
                serviceTier: toolState.serviceTier,
                temperature: toolState.temperature,
                topP: toolState.topP,
              },
            })
            return
          }

          if (toolState.type === 'reasoning_summary_done') {
            dispatch({
              type: 'COMPLETE_REASONING',
              metadata: {
                effort: toolState.effort,
                model: toolState.model,
                serviceTier: toolState.serviceTier,
                temperature: toolState.temperature,
                topP: toolState.topP,
              },
            })
            return
          }

          if (toolState.type === 'reasoning') {
            pendingEventsRef.current.push({
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

          // Parse delta and arguments
          if ('delta' in toolState) {
            try {
              toolState.delta =
                toolState.delta !== '' ? JSON.parse(toolState.delta) : {}
            } catch (e) {
              console.error('Failed to parse delta:', toolState.delta)
              toolState.delta = {}
            }
          }

          try {
            toolState.arguments =
              toolState.arguments !== '' ? JSON.parse(toolState.arguments) : {}
          } catch (e) {
            console.error('Failed to parse arguments:', toolState.arguments)
            toolState.arguments = {}
          }

          // Handle tool events
          const toolEvent = {
            type: 'tool' as const,
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

          if (toolState.itemId) {
            dispatch({
              type: 'UPDATE_TOOL_EVENT',
              itemId: toolState.itemId,
              event: toolEvent,
            })
          } else {
            dispatch({ type: 'ADD_EVENT', event: toolEvent })
          }
        } catch (e) {
          console.error('Failed to parse tool state:', e)
        }
      } else if (line.startsWith('0:')) {
        try {
          const text = JSON.parse(line.slice(2))
          const assistantId = lastAssistantIdRef.current || generateMessageId()
          updateAssistantText(text, assistantId)
        } catch (e) {
          console.error('Failed to parse text chunk:', e)
        }
      }
    },
    [updateAssistantText],
  )

  // Start streaming
  const start = useCallback(async () => {
    try {
      // Create new abort controller
      abortControllerRef.current = new AbortController()

      setStreaming(true)

      // Get current conversation history
      const messages = getMessages()

      // Build complete request body
      const body: ChatBody = {
        id: generateMessageId(),
        messages,
        ...bodyTemplate,
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      const readChunk = async () => {
        try {
          const { done, value } = await reader.read()
          if (done) {
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
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Stream aborted')
          } else {
            console.error('Error reading stream chunk:', error)
            onError(
              error instanceof Error
                ? error
                : new Error('Failed to read response stream'),
            )
          }
          setStreaming(false)
        }
      }

      readChunk()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Error starting stream:', error)
        onError(
          error instanceof Error
            ? error
            : new Error('Failed to start streaming'),
        )
      }
      setStreaming(false)
    }
  }, [bodyTemplate, getMessages, onError, processChunk, flushTextBuffer])

  // Abort streaming
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStreaming(false)
  }, [])

  // Add user message
  const addUserMessage = useCallback((content: string) => {
    dispatch({ type: 'ADD_USER_MESSAGE', content })
  }, [])

  // Reset chat
  const reset = useCallback(() => {
    // Clear timeouts
    if (streamUpdateTimeoutRef.current) {
      clearTimeout(streamUpdateTimeoutRef.current)
    }

    // Clear buffers
    textBufferRef.current = ''
    lastAssistantIdRef.current = null
    pendingEventsRef.current = []

    // Reset state
    dispatch({ type: 'RESET' })
    setStreaming(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamUpdateTimeoutRef.current) {
        clearTimeout(streamUpdateTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    events,
    streaming,
    start,
    abort,
    addUserMessage,
    reset,
  }
}
