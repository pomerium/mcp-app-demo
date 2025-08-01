import { AlertCircle, CheckCircle2, Clock, User } from 'lucide-react'
import { cn, formatTimestamp } from '../lib/utils'
import { MarkdownContent } from './MarkdownContent'
import type { UserStreamEvent } from '@/hooks/useStreamingChat'

export type MessageStatus = 'sending' | 'sent' | 'error'

export interface UserMessageProps {
  message: Omit<UserStreamEvent, 'type'> & {
    timestamp: string
    status: MessageStatus
  }
}

export function UserMessage({ message }: UserMessageProps) {
  const statusIcons: Record<MessageStatus, React.ReactNode> = {
    sending: <Clock className="h-3 w-3 text-gray-400" />,
    sent: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    error: <AlertCircle className="h-3 w-3 text-red-500" />,
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        'justify-end',
      )}
    >
      <div
        className={cn(
          'flex flex-col space-y-1 items-end',
          'w-full sm:w-[85%] md:w-[75%] lg:w-[65%]',
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          )}
        >
          <MarkdownContent content={message.content} />
        </div>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <span>{formatTimestamp(new Date(message.timestamp))}</span>
          {statusIcons[message.status]}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
        <User className="h-5 w-5" />
      </div>
    </div>
  )
}
