import { useRef, useEffect, useMemo, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useChat } from 'ai/react'
import { generateMessageId } from '../mcp/client'
import type { Message } from 'ai'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { type Servers } from '../lib/schemas'

export function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [servers] = useLocalStorage<Servers>('mcp-servers', {})

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
      },
    })

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const onSendMessage = (prompt: string) => {
    if (!hasStartedChat) {
      setHasStartedChat(true)
    }
    handleSubmit(new Event('submit'))
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            {messages.map((message) => (
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
                  isLoading &&
                  message.role === 'assistant' &&
                  message === messages.at(-1)
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 left-0 right-0">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading}
          value={input}
          onChange={handleInputChange}
        />
      </div>
    </div>
  )
}
