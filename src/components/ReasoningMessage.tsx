import { Brain } from 'lucide-react'
import { cn } from '../lib/utils'
import { MarkdownContent } from './MarkdownContent'
import { CollapsibleSection } from './ui/collapsible-section'

type ReasoningMessageProps = {
  effort: string
  summary: string | null
  model?: string
  serviceTier?: string
  temperature?: number
  topP?: number
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
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
          isLoading && 'animate-[pulse_1.5s_ease-in-out_infinite] opacity-80',
        )}
        aria-hidden="true"
      >
        <Brain className="h-5 w-5" />
      </div>

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <CollapsibleSection
          title="Reasoning"
          icon={<Brain className="h-4 w-4" />}
          open={true}
          isLoading={isLoading}
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
