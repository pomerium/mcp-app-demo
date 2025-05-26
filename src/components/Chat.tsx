import { useRef, useEffect, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useChat } from 'ai/react'
import { generateMessageId } from '../mcp/client'
import type { Message } from 'ai'

// This value would typically come from authentication
const USER_EMAIL = 'user@example.com'

export function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [initialMessage] = useState<Message>({
    id: generateMessageId(),
    content: "👋 Hello! I'm your AI assistant. How can I help you today?",
    role: 'assistant',
  })

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      initialMessages: [initialMessage],
      // body: {
      //   user: USER_EMAIL,
      // },
    })

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const onSendMessage = (prompt: string) => {
    handleSubmit(new Event('submit') as any)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 space-y-4">
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
                  message === messages[messages.length - 1]
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isLoading}
        value={input}
        onChange={handleInputChange}
      />
    </>
  )
}
