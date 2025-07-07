import { cn } from '../lib/utils'
import type { Message } from '../mcp/client'
import { formatTimestamp } from '../lib/utils'
import { Bot, Copy } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'

import { toast } from 'sonner'
import { copyToClipboard } from '../lib/utils/clipboard'

export interface BotMessageProps {
  message: Message
  isLoading?: boolean
}

export function BotMessage({ message, isLoading }: BotMessageProps) {
  const handleCopy = async () => {
    const copied = await copyToClipboard(message.content)

    if (copied) {
      toast.success('Copied message to clipboard')
    }
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        'justify-start',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          isLoading && 'animate-[pulse_1.5s_ease-in-out_infinite] opacity-80',
        )}
      >
        <Bot className="h-5 w-5" />
      </div>
      <div
        className={cn(
          'group grid gap-1 space-y-1 items-start',
          'w-full sm:w-[85%] md:w-[75%] lg:w-[65%]',
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          )}
        >
          <div data-raw-markdown={message.content}>
            <MarkdownContent content={message.content} />
          </div>
        </div>
        <div className="flex gap-1 items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <time dateTime={message.timestamp.toISOString()}>
            {formatTimestamp(message.timestamp)}
          </time>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Copy message to clipboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
