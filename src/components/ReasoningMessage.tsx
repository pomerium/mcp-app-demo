import { Brain } from 'lucide-react'
import { cn } from '../lib/utils'
import { MarkdownContent } from './MarkdownContent'

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
        <details
          open
          className="rounded-2xl px-4 py-2 text-sm w-full bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100 group [&:not([open])]:h-8 [&:not([open])]:flex [&:not([open])]:items-center [&:not([open])]:py-0"
        >
          <summary className="font-medium mb-1 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden cursor-pointer group-[&:not([open])]:mb-0">
            {/* Chevron icon for expand/collapse */}
            <svg
              className="h-4 w-4 transition-transform group-open:rotate-90 text-purple-600 dark:text-purple-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            Reasoning
            {isLoading && (
              <span className="ml-2 animate-spin">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label="Loading"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </span>
            )}
          </summary>
          <div className="text-xs space-y-1 mt-1">
            {effort && <div>Effort: {effort}</div>}
            {summary && (
              <div className="prose prose-sm dark:prose-invert max-w-none break-words break-all whitespace-pre-wrap">
                <MarkdownContent content={summary} />
              </div>
            )}
            {model && <div>Model: {model}</div>}
            {serviceTier && <div>Service Tier: {serviceTier}</div>}
            <div className="flex gap-4">
              {temperature !== undefined && (
                <div>Temperature: {temperature}</div>
              )}
              {topP !== undefined && <div>Top P: {topP}</div>}
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
