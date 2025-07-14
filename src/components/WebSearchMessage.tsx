import { Globe } from 'lucide-react'
import { MessageAvatar } from './MessageAvatar'
import { CollapsibleSection } from './ui/collapsible-section'
import type { WebSearchStreamEvent } from '@/hooks/useStreamingChat'

export interface WebSearchMessageProps {
  event: WebSearchStreamEvent
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
      {/* getStatusIcon(status, error) */}
      <span className="sr-only md:not-sr-only">
        {getStatusText(status, error)}
      </span>
    </span>
  )
  return (
    <div className={`flex w-full max-w-full gap-2 py-2 animate-in fade-in`}>
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
