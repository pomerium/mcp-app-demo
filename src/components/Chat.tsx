import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from 'ai/react'
import { MessageSquarePlus, Clock } from 'lucide-react'
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
import { BackgroundToggle } from './BackgroundToggle'
import { BackgroundJobsSidebar } from './BackgroundJobsSidebar'
import { ModelSelect } from './ModelSelect'
import { BotThinking } from './BotThinking'
import { BotError } from './BotError'
import { CodeInterpreterMessage } from './CodeInterpreterMessage'
import { WebSearchMessage } from './WebSearchMessage'
import type { Servers } from '../lib/schemas'
import type { Message as AIMessage } from 'ai'

// Extended message type for background job tracking
interface Message extends AIMessage {
  backgroundJobId?: string
}
import type { StreamEvent } from '@/hooks/useStreamingChat'
import { useStreamingChat } from '@/hooks/useStreamingChat'
import { getTimestamp } from '@/lib/utils/date'
import { isCodeInterpreterSupported } from '@/lib/utils/prompting'
import { useHasMounted } from '@/hooks/useHasMounted'
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs'

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
      case 'background_job_created':
        return `background-job-${event.requestId}`
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
  const lastPromptRef = useRef<string>('')
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [focusTimestamp, setFocusTimestamp] = useState(Date.now())
  const [servers, setServers] = useState<Servers>({})
  const [selectedServers, setSelectedServers] = useState<Array<string>>([])
  const [useCodeInterpreter, setUseCodeInterpreter] = useState(false)
  const [useWebSearch, setUseWebSearch] = useState(false)
  const [useBackground, setUseBackground] = useState(false)
  const [backgroundJobsSidebarOpen, setBackgroundJobsSidebarOpen] =
    useState(false)
  const { selectedModel, setSelectedModel } = useModel()
  const { user } = useUser()
  const { jobs: backgroundJobs } = useBackgroundJobs()

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
      background: useBackground,
      store: useBackground, // Store is enabled when background is enabled
    }),
    [
      selectedServers,
      servers,
      selectedModel,
      user?.id,
      useCodeInterpreter,
      useWebSearch,
      useBackground,
    ],
  )

  const handleResponseWithBackground = useCallback(
    (response: Response) => {
      if (useBackground) {
        // The background job title is the last user prompt
        const title = lastPromptRef.current

        handleResponse(response, { background: true, title })
      } else {
        handleResponse(response, { background: false })
      }
    },
    [handleResponse, useBackground],
  )

  const { messages, isLoading, setMessages, append, stop } = useChat({
    body: chatBody,
    onError: handleError,
    onResponse: handleResponseWithBackground,
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
      lastPromptRef.current = prompt // Store the prompt for background job title
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
    setUseBackground(false)
  }, [setMessages, stop, cancelStream, clearBuffer])

  // Check if max concurrent background jobs limit is reached
  const maxJobsReached = useMemo(() => {
    if (!hasMounted) return false
    const runningJobs = backgroundJobs.filter((job) => job.status === 'running')
    return runningJobs.length >= 5 // Default limit from PRD
  }, [hasMounted, backgroundJobs])

  // Update chat messages when background jobs update (for streaming loaded responses)
  useEffect(() => {
    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        if (message.backgroundJobId) {
          const job = backgroundJobs.find(
            (j) => j.id === message.backgroundJobId,
          )
          if (job && job.response && job.response !== message.content) {
            // Update message content with latest job response
            return { ...message, content: job.response }
          }
        }
        return message
      }),
    )
  }, [backgroundJobs, setMessages])

  const handleLoadJobResponse = useCallback(
    async (jobId: string, response: string) => {
      const job = backgroundJobs.find((j) => j.id === jobId)

      if (job?.status === 'failed') {
        console.warn(
          `Job ${jobId} is not failed, cannot load response: ${job?.status}`,
        )
        return
      }

      try {
        const url = new URL('/api/background-jobs', window.location.origin)
        url.searchParams.set('requestId', job.requestId)
        const streamResponse = await fetch(url.toString(), {
          method: 'GET',
        })

        if (streamResponse.ok && streamResponse.body) {
          // Create message and start streaming
          const messageId = generateMessageId()
          const assistantMessage: Message = {
            id: messageId,
            content: '',
            role: 'assistant',
            backgroundJobId: jobId,
          }

          setMessages((prev) => [...prev, assistantMessage])
          setBackgroundJobsSidebarOpen(false)

          // Handle streaming response similar to regular chat
          const reader = streamResponse.body.getReader()
          const decoder = new TextDecoder()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()
                  if (data && data !== '[DONE]') {
                    try {
                      const parsed = JSON.parse(data)
                      if (parsed.content) {
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === messageId
                              ? {
                                  ...msg,
                                  content: msg.content + parsed.content,
                                }
                              : msg,
                          ),
                        )
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
          return
        }
      } catch (error) {
        console.error('Failed to stream background job response:', error)
        // Fall back to loading static response
      }

      // Fallback: Load static response (for running jobs or if streaming fails)
      const messageId = generateMessageId()
      const assistantMessage: Message = {
        id: messageId,
        content: response,
        role: 'assistant',
        backgroundJobId: jobId,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setBackgroundJobsSidebarOpen(false)
    },
    [backgroundJobs, setMessages],
  )

  const handleCancelJob = useCallback((jobId: string) => {
    // TODO: Implement actual job cancellation via OpenAI API
    console.log('Cancelling job:', jobId)
  }, [])

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
    {
      key: 'background',
      isActive: useBackground,
      component: (
        <BackgroundToggle
          key="background"
          useBackground={useBackground}
          onToggle={setUseBackground}
          selectedModel={selectedModel}
          disabled={hasStartedChat}
          maxJobsReached={maxJobsReached}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col min-h-full relative">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleNewChat}
            className="flex items-center gap-2"
          >
            <MessageSquarePlus className="size-4" />
            <span className="sr-only sm:not-sr-only">New Chat</span>
          </Button>
          {hasMounted && (
            <Button
              variant="outline"
              onClick={() => setBackgroundJobsSidebarOpen(true)}
              className="flex items-center gap-2"
              title="Background Jobs"
            >
              <Clock className="size-4" />
              <span className="sr-only sm:not-sr-only">Jobs</span>
            </Button>
          )}
        </div>
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
              } else if (
                'type' in event &&
                event.type === 'background_job_created'
              ) {
                // Background job handled by streaming hook - no UI rendering needed
                return null
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
      <BackgroundJobsSidebar
        isOpen={backgroundJobsSidebarOpen}
        onClose={() => setBackgroundJobsSidebarOpen(false)}
        onLoadResponse={handleLoadJobResponse}
        onCancelJob={handleCancelJob}
      />
    </div>
  )
}
