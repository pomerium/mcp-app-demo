import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { UserMessage } from './UserMessage'
import { BotMessage } from './BotMessage'
import { ChatInput } from './ChatInput'
import { ServerSelector } from './ServerSelector'
import { useChat } from 'ai/react'
import type { Message } from 'ai'
import { type Servers } from '../lib/schemas'
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
import { useStreamedChat, type StreamEvent } from '../hooks/useStreamedChat'

// Stable key generation function
const getEventKey = (event: StreamEvent | Message, idx: number): string => {
  if ('type' in event) {
    if (event.type === 'tool') {
      return (
        event.itemId || `tool-${idx}-${event.toolType}-${event.serverLabel}`
      )
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [focusTimestamp, setFocusTimestamp] = useState(Date.now())
  const [servers, setServers] = useState<Servers>({})
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const { selectedModel, setSelectedModel } = useModel()
  const { user } = useUser()

  const initialMessage = useMemo<Message>(
    () => ({
      id: 'initial',
      role: 'assistant',
      content: `Hello! I'm your AI assistant with access to various tools and services. How can I help you today?`,
    }),
    [],
  )

  // Chat body for streaming
  const chatBody = useMemo(
    () => ({
      messages: [], // Start with empty messages - will be managed by streaming
      servers: Object.fromEntries(
        selectedServers
          .map((serverId) => [serverId, servers[serverId]])
          .filter(([_, server]) => server),
      ),
      model: selectedModel,
      userId: user?.id || 'anonymous', // Provide default value since userId is required
    }),
    [selectedServers, servers, selectedModel, user?.id],
  )

  // Error handler
  const handleError = useCallback((error: Error) => {
    console.error('Chat error:', error)
  }, [])

  // Streaming chat hook
  const {
    events: streamEvents,
    streaming,
    start: startStreaming,
    abort: abortStreaming,
    addUserMessage,
    reset: resetStream,
  } = useStreamedChat(chatBody, handleError)

  // Fallback to useChat for non-streaming mode
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
    onError: handleError,
  })

  // Determine which events to render
  const renderEvents = useMemo<(StreamEvent | Message)[]>(
    () => (streaming || streamEvents.length > 0 ? streamEvents : messages),
    [streaming, streamEvents, messages],
  )

  // UI Event handlers
  const handleSendMessage = useCallback(
    (prompt: string) => {
      if (!hasStartedChat) {
        setHasStartedChat(true)
      }

      // Add user message to stream
      addUserMessage(prompt)

      // Start streaming
      startStreaming()
    },
    [hasStartedChat, addUserMessage, startStreaming],
  )

  const handleServerToggle = useCallback((serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId],
    )
  }, [])

  const handleNewChat = useCallback(() => {
    // Reset streaming state
    resetStream()

    // Reset UI state
    setHasStartedChat(false)
    setMessages([initialMessage])
    setInput('')
    setFocusTimestamp(Date.now())
  }, [resetStream, initialMessage, setMessages, setInput])

  const handleScrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (streaming || renderEvents.length > 0) {
      handleScrollToBottom()
    }
  }, [streaming, renderEvents.length, handleScrollToBottom])

  return (
    <div className="flex flex-col min-h-full relative">
      {/* Header */}
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

      {/* Messages */}
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
                    isLoading={streaming && idx === renderEvents.length - 1}
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
                      isLoading={
                        (isLoading || streaming) && message === messages.at(-1)
                      }
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
            })}
            {streaming && <BotThinking />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 left-0 right-0">
        {/* Scroll to bottom button */}
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

        {/* Server selector */}
        <ServerSelector
          servers={servers}
          onServersChange={setServers}
          selectedServers={selectedServers}
          onServerToggle={handleServerToggle}
          disabled={hasStartedChat}
        />

        {/* Chat input */}
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
