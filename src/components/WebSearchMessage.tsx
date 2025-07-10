import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageAvatar } from './MessageAvatar'
import { CollapsibleSection } from './ui/collapsible-section'
import { getStatusIcon } from '@/lib/toolStatus'

export interface WebSearchMessageProps {
  event: {
    type: 'web_search'
    id: string
    status: 'in_progress' | 'searching' | 'completed' | 'failed' | 'result'
    error?: string
    raw?: unknown
  }
}

const getVariant = (status?: string, error?: string) => {
  if (error || status?.includes('failed')) {
    return 'error'
  }

  if (status?.includes('completed') || status?.includes('done')) {
    return 'completed'
  }

  return 'processing'
}

const getStatusText = (status?: string, error?: string) => {
  if (error || status === 'failed') return 'Failed'
  if (status === 'in_progress') return 'In progress...'
  if (status === 'searching') return 'Searching...'
  if (status === 'completed' || status === 'result') return 'Completed'
  return 'Web Search'
}

export function WebSearchMessage({ event }: WebSearchMessageProps) {
  const { status, error } = event
  const variant = getVariant(status, error)
  const summaryContent = (
    <span className="flex items-center gap-1 text-xs opacity-75">
      {getStatusIcon(status, error)}
      <span className="sr-only md:not-sr-only">
        {getStatusText(status, error)}
      </span>
    </span>
  )
  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        'justify-start items-start',
      )}
    >
      <MessageAvatar icon={<Globe className="h-5 w-5" />} variant={variant} />
      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <CollapsibleSection
          title="Web Search"
          variant={variant}
          additionalSummaryContent={summaryContent}
          open={!!error}
        >
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words break-all">
            {JSON.stringify(event, null, 2)}
          </pre>
        </CollapsibleSection>
      </div>
    </div>
  )
}
