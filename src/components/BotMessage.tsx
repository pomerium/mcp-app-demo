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
          'flex flex-col space-y-1 items-start',
          'w-full sm:w-[85%] md:w-[75%] lg:w-[65%]',
        )}
      >
        <div
          className={cn(
            'relative rounded-2xl px-4 py-2 text-sm w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          )}
          data-raw-markdown={message.content}
        >
          {/* Copy button */}
          <button
            type="button"
            aria-label="Copy raw markdown"
            className={cn(
              'absolute top-2 right-2 p-1 rounded-md transition-colors bg-transparent text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
            )}
            onClick={handleCopy}
            tabIndex={0}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Copy</span>
          </button>
          <div className="prose prose-sm dark:prose-invert max-w-none break-words break-all whitespace-pre-wrap">
            <MarkdownContent content={message.content} />
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <span>{formatTimestamp(message.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}
