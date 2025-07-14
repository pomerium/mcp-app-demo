import type { ReasoningStreamEvent } from '@/hooks/useStreamingChat'
import { Brain } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'
import { CollapsibleSection } from './ui/collapsible-section'
import { MessageAvatar } from './MessageAvatar'

interface ReasoningMessageProps extends Omit<ReasoningStreamEvent, 'type'> {
  isLoading?: boolean
}

export function ReasoningMessage({
  effort,
  summary,
  model,
  serviceTier,
  temperature,
  topP,
  isLoading,
}: ReasoningMessageProps) {
  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start">
      <MessageAvatar icon={<Brain className="h-5 w-5" />} variant="reasoning" />

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <CollapsibleSection
          title="Reasoning"
          open={true}
          isLoading={isLoading}
          variant="reasoning"
        >
          <div className="text-xs space-y-1">
            {effort && <div>Effort: {effort}</div>}
            {summary && <MarkdownContent content={summary} />}
            {model && <div>Model: {model}</div>}
            {serviceTier && <div>Service Tier: {serviceTier}</div>}
            <div className="flex gap-4">
              {temperature !== undefined && (
                <div>Temperature: {temperature}</div>
              )}
              {topP !== undefined && <div>Top P: {topP}</div>}
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
