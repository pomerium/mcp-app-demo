import { useCallback, useMemo, useRef, useState } from 'react'
import { useChat } from 'ai/react'
import { MessageSquarePlus } from 'lucide-react'
import { useModel } from '../contexts/ModelContext'
import { useUser } from '../contexts/UserContext'
import { generateMessageId } from '../mcp/client'
import { ToolCallMessage } from './ToolCallMessage'
import { Toolbox } from './Toolbox'
import { ReasoningMessage } from './ReasoningMessage'
import { Button } from './ui/button'
import { ServerSelector } from './ServerSelector'
import { ChatInput } from './ChatInput'
import { BotMessage } from './BotMessage'
import { UserMessage } from './UserMessage'
import { CodeInterpreterToggle } from './CodeInterpreterToggle'
import { WebSearchToggle } from './WebSearchToggle'
import { ModelSelect } from './ModelSelect'
import { BotThinking } from './BotThinking'
import { BotError } from './BotError'
import { CodeInterpreterMessage } from './CodeInterpreterMessage'
import { WebSearchMessage } from './WebSearchMessage'
import type { Servers } from '../lib/schemas'
import type { Message } from 'ai'
import type { StreamEvent } from '@/hooks/useStreamingChat'
import { useStreamingChat } from '@/hooks/useStreamingChat'
import { getTimestamp } from '@/lib/utils/date'
import { isCodeInterpreterSupported } from '@/lib/utils/prompting'
import { useHasMounted } from '@/hooks/useHasMounted'

const getEventKey = (event: StreamEvent | Message, idx: number): string => {
  if ('type' in event) {
    switch (event.type) {
      case 'tool':
        return (
          event.itemId || `tool-${idx}-${event.toolType}-${event.serverLabel}`
        )
      case 'code_interpreter':
        return `code-interpreter-${event.itemId}`
      case 'assistant':
        return `assistant-${event.id}`
      case 'user':
        return `user-${event.id}`
      case 'reasoning':
        return `reasoning-${idx}-${event.effort}`
      case 'error':
        return `error-${idx}`
      case 'code_interpreter_file_annotation':
        // Use file_id or a combination for uniqueness
        return `file-annotation-${event.annotation.file_id || idx}`
      case 'web_search':
        return `web-search-${event.id}`
    }
  }
  // Fallback: use idx if id is not present
  return `message-${'id' in event ? (event as any).id : idx}`
}

const TIMEOUT_ERROR_MESSAGE =
  'Your connection was interrupted after 30 seconds, possibly due to a Pomerium proxy timeout.'

export function Chat() {
  const hasMounted = useHasMounted()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [focusTimestamp, setFocusTimestamp] = useState(Date.now())
  const [servers, setServers] = useState<Servers>({})
  const [selectedServers, setSelectedServers] = useState<Array<string>>([])
  const [useCodeInterpreter, setUseCodeInterpreter] = useState(false)
  const [useWebSearch, setUseWebSearch] = useState(false)
  const { selectedModel, setSelectedModel } = useModel()
  const { user } = useUser()

  const {
    streamBuffer,
    streaming,
    timedOut,
    requestId,
    handleResponse,
    handleError,
    addUserMessage,
    cancelStream,
    clearBuffer,
  } = useStreamingChat()

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel)

    if (!isCodeInterpreterSupported(newModel)) {
      setUseCodeInterpreter(false)
    }
  }

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
      webSearch: useWebSearch,
    }),
    [
      selectedServers,
      servers,
      selectedModel,
      user?.id,
      useCodeInterpreter,
      useWebSearch,
    ],
  )

  const { messages, isLoading, setMessages, append, stop } = useChat({
    body: chatBody,
    onError: handleError,
    onResponse: handleResponse,
  })

  const renderEvents = useMemo<Array<StreamEvent | Message>>(() => {
    if (streaming || streamBuffer.length > 0) {
      return [...streamBuffer]
    }
    // Show initial message only when there are no real messages and no streaming
    if (messages.length === 0 && !hasStartedChat) {
      return [initialMessage]
    }
    return messages
  }, [streaming, streamBuffer, messages, hasStartedChat, initialMessage])

  const handleSendMessage = useCallback(
    (prompt: string) => {
      if (!hasStartedChat) {
        setHasStartedChat(true)
      }
      addUserMessage(prompt)
      append({ role: 'user', content: prompt })
    },
    [hasStartedChat, append, addUserMessage],
  )

  const handleServerToggle = useCallback((serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId],
    )
  }, [])

  const handleNewChat = useCallback(() => {
    cancelStream()
    stop()

    setHasStartedChat(false)
    clearBuffer()
    setMessages([])
    setFocusTimestamp(Date.now())
    setUseCodeInterpreter(false)
    setUseWebSearch(false)
  }, [setMessages, stop, cancelStream, clearBuffer])

  const handleScrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const toolToggles = [
    {
      key: 'codeInterpreter',
      isActive: useCodeInterpreter,
      component: (
        <CodeInterpreterToggle
          key="codeInterpreter"
          useCodeInterpreter={useCodeInterpreter}
          onToggle={setUseCodeInterpreter}
          selectedModel={selectedModel}
          disabled={hasStartedChat}
        />
      ),
    },
    {
      key: 'webSearch',
      isActive: useWebSearch,
      component: (
        <WebSearchToggle
          key="webSearch"
          useWebSearch={useWebSearch}
          onToggle={setUseWebSearch}
          selectedModel={selectedModel}
          disabled={hasStartedChat}
        />
      ),
    },
  ]

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
                      timestamp: getTimestamp(),
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
                      timestamp: getTimestamp(),
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
                      timestamp: getTimestamp(),
                      status: 'sent',
                    }}
                  />
                )
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              } else if ('type' in event && event.type === 'web_search') {
                return <WebSearchMessage key={key} event={event} />
              } else {
                // Fallback for Message type (from useChat)
                const message = event
                // Only render if the event has an 'id' property (i.e., is a Message)
                if ('id' in event) {
                  const isAssistant = message.role === 'assistant'
                  if (isAssistant) {
                    if (!hasMounted) {
                      return null
                    }

                    return (
                      <BotMessage
                        key={key}
                        message={{
                          id: message.id,
                          content: message.content,
                          timestamp: getTimestamp(),
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
                          timestamp: getTimestamp(),
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
            {timedOut && (
              <BotError
                key="timeout-error"
                message={
                  <div className="grid gap-2">
                    <p>{TIMEOUT_ERROR_MESSAGE}</p>
                    <p>
                      See the Pomerium{' '}
                      <a
                        href="https://www.pomerium.com/docs/reference/routes/timeouts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Timeouts Settings documentation
                      </a>{' '}
                      for more information. .
                    </p>
                    {requestId && (
                      <>
                        <hr />
                        <dl>
                          <dt>Request ID</dt>
                          <dd>{requestId}</dd>
                        </dl>
                        <p>
                          Use this ID to search Pomerium logs for more details.
                        </p>
                      </>
                    )}
                  </div>
                }
              />
            )}
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
              toolToggles={toolToggles}
            />
          </div>
        )}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || streaming}
          focusTimestamp={focusTimestamp}
        />
      </div>
    </div>
  )
}
