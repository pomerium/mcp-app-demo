import { useRef, useEffect, useMemo, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useChat } from 'ai/react'
import { generateMessageId } from '../mcp/client'
import type { Message } from 'ai'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { type Servers } from '../lib/schemas'
import { ToolCallMessage } from './ToolCallMessage'
import { useModel } from '../contexts/ModelContext'

// Streamed event type
type StreamEvent =
  | { type: 'assistant'; id: string; content: string }
  | {
      type: 'tool'
      toolType: string
      serverLabel: string
      tools?: any[]
      itemId?: string
    }
  | { type: 'user'; id: string; content: string }
export function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [servers] = useLocalStorage<Servers>('mcp-servers', {})
  const [streamBuffer, setStreamBuffer] = useState<StreamEvent[]>([])
  const [streaming, setStreaming] = useState(false)
  const { selectedModel } = useModel()

  const initialMessage = useMemo<Message>(
    () => ({
      id: generateMessageId(),
      content: "👋 Hello! I'm your AI assistant. How can I help you today?",
      role: 'assistant',
    }),
    [],
  )

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      initialMessages: hasStartedChat ? [] : [initialMessage],
      body: {
        servers,
        model: selectedModel,
      },
      onResponse: (response) => {
        const reader = response.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ''
        setStreaming(true)
        let assistantId: string | null = null

        const processChunk = (line: string) => {
          if (line.startsWith('t:')) {
            try {
              const toolState = JSON.parse(line.slice(2))
              setStreamBuffer((prev) => [
                ...prev,
                {
                  type: 'tool',
                  toolType: toolState.type,
                  serverLabel: toolState.serverLabel,
                  tools: toolState.tools,
                  itemId: toolState.itemId,
                },
              ])
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
        }

        readChunk()
      },
    })

  // Auto-scroll to the bottom when messages or streamBuffer change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamBuffer])

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

  // What to render: if streaming or streamBuffer has content, use streamBuffer; else, use messages
  let renderEvents: (StreamEvent | Message)[]
  if (streaming || streamBuffer.length > 0) {
    renderEvents = [...streamBuffer]
  } else {
    renderEvents = messages
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            {renderEvents.map((event, idx) => {
              if ('type' in event && event.type === 'tool') {
                return (
                  <ToolCallMessage
                    key={`tool-${event.toolType}-${event.serverLabel || ''}-${event.itemId || generateMessageId()}`}
                    name={event.serverLabel || ''}
                    args={{
                      status: event.toolType,
                      tools: event.tools,
                    }}
                  />
                )
              } else if ('type' in event && event.type === 'assistant') {
                const assistantEvent = event as Extract<
                  StreamEvent,
                  { type: 'assistant' }
                >
                return (
                  <ChatMessage
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
                  <ChatMessage
                    key={userEvent.id}
                    message={{
                      id: userEvent.id,
                      content: userEvent.content,
                      sender: 'user',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                    isLoading={false}
                  />
                )
              } else {
                // Fallback for Message type (from useChat)
                const message = event as Message
                return (
                  <ChatMessage
                    key={message.id}
                    message={{
                      id: message.id,
                      content: message.content,
                      sender: message.role === 'assistant' ? 'agent' : 'user',
                      timestamp: new Date(),
                      status: 'sent',
                    }}
                    isLoading={
                      (isLoading || streaming) &&
                      message.role === 'assistant' &&
                      message === messages.at(-1)
                    }
                  />
                )
              }
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 left-0 right-0">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading || streaming}
          value={input}
          onChange={handleInputChange}
        />
      </div>
    </div>
  )
}
