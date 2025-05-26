import { cn } from '../lib/utils'
import type { Message } from '../mcp/client'
import { formatTimestamp } from '../lib/utils'
import { Bot, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

type ChatMessageProps = {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUserMessage = message.sender === 'user'

  const statusIcons = {
    sending: <Clock className="h-3 w-3 text-gray-400" />,
    sent: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    error: <AlertCircle className="h-3 w-3 text-red-500" />,
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        isUserMessage ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUserMessage && (
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
            isLoading && 'animate-[pulse_1.5s_ease-in-out_infinite] opacity-80',
          )}
        >
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col space-y-1',
          isUserMessage ? 'items-end' : 'items-start',
          'w-full sm:w-[85%] md:w-[75%] lg:w-[65%]',
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm w-full',
            isUserMessage
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none break-words break-all whitespace-pre-wrap">
            <ReactMarkdown
              components={{
                pre: ({ node, ...props }) => (
                  <pre
                    className="overflow-x-auto whitespace-pre-wrap break-words break-all"
                    {...props}
                  />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="break-words break-all whitespace-pre-wrap"
                    {...props}
                  />
                ),
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    className="break-words break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <span>{formatTimestamp(message.timestamp)}</span>
          {isUserMessage && statusIcons[message.status]}
        </div>
      </div>

      {isUserMessage && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}
