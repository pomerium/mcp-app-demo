import { getStatusIcon } from '@/lib/toolStatus'
import { Wrench, ChevronRight, ArrowRight } from 'lucide-react'
import { CollapsibleSection } from './ui/collapsible-section'

type ToolCallMessageProps<T = Record<string, unknown>> = {
  name: string
  args: T & {
    toolType?: string
    status?:
      | 'in_progress'
      | 'completed'
      | 'done'
      | 'arguments_delta'
      | 'arguments_done'
      | 'failed'
    toolName?: string
    arguments?: unknown
    delta?: unknown
    error?: string
  }
}

const getStatusText = (status?: string, error?: string) => {
  if (error || status?.includes('failed')) {
    return 'Failed'
  }
  if (status?.includes('in_progress')) {
    return 'In progress...'
  }
  if (status?.includes('completed') || status?.includes('done')) {
    return 'Completed'
  }
  if (
    status?.includes('arguments_delta') ||
    status?.includes('arguments_done')
  ) {
    return 'Preparing...'
  }
  return 'Tool call'
}

const getTitle = (name: string, args: ToolCallMessageProps['args']) => {
  // For tool calls, include the tool name if available
  if (args.toolName) {
    return (
      <>
        Tool Call: {name} <ArrowRight className="h-3 w-3" /> {args.toolName}
      </>
    )
  }
  return `Tool Call: ${name}`
}

export function ToolCallMessage({ name, args }: ToolCallMessageProps) {
  const summaryContent = (
    <>
      {getStatusIcon(args.status, args.error)}
      <span className="sr-only">{getStatusText(args.status, args.error)}</span>
    </>
  )

  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
        <Wrench className="h-5 w-5" />
      </div>

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <CollapsibleSection
          title={getTitle(name, args)}
          icon={<Wrench className="h-4 w-4" />}
          variant="orange"
          additionalSummaryContent={summaryContent}
        >
          {args.error && <span>Error: {args.error}</span>}
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words break-all">
            {JSON.stringify(args, null, 2)}
          </pre>
        </CollapsibleSection>
      </div>
    </div>
  )
}
