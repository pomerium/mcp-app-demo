import { getStatusIcon } from '@/lib/toolStatus'
import {
  Wrench,
  Loader2,
  CheckCircle,
  Clock,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'

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
    toolName?: string
    arguments?: unknown
    delta?: unknown
  }
}

const getStatusText = (status?: string) => {
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
  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
        <Wrench className="h-5 w-5" />
      </div>

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <details className="rounded-2xl px-4 py-2 text-sm w-full bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100 group [&:not([open])]:h-8 [&:not([open])]:flex [&:not([open])]:items-center [&:not([open])]:py-0">
          <summary className="font-medium mb-1 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden cursor-pointer group-[&:not([open])]:mb-0">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            {getTitle(name, args)}
            {getStatusIcon(args.status)}
            {getStatusText(args.status)}
          </summary>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words break-all">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
