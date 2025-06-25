import {
  Settings,
  CheckCircle,
  Loader2,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { useMemo } from 'react'
import { type ToolItem } from '../lib/schemas'
import { getStatusIcon } from '@/lib/toolStatus'

type ToolboxProps = {
  name: string
  args: {
    toolType?: string
    status?:
      | 'in_progress'
      | 'completed'
      | 'done'
      | 'arguments_delta'
      | 'arguments_done'
    tools?: ToolItem[]
    [key: string]: unknown
  }
}

const getStatusText = (status?: string) => {
  if (status?.includes('in_progress')) {
    return 'Loading tools...'
  }
  if (status?.includes('completed') || status?.includes('done')) {
    return 'Available'
  }
  // Consolidate intermediate states to reduce visual flickering
  if (status?.includes('arguments')) {
    return 'Preparing...'
  }
  return 'Tool list'
}

export function Toolbox({ name, args }: ToolboxProps) {
  // Memoize the status elements to reduce unnecessary re-renders
  const statusElements = useMemo(
    () => ({
      icon: getStatusIcon(args.status),
      text: getStatusText(args.status),
    }),
    [args.status],
  )

  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
        <Settings className="h-5 w-5" />
      </div>

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <details className="rounded-2xl px-4 py-2 text-sm w-full bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 group">
          <summary className="font-medium mb-1 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden cursor-pointer">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            Tool List: {name}
            <span className="flex items-center gap-1 text-xs opacity-75">
              {statusElements.icon}
              {statusElements.text}
            </span>
          </summary>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words break-all">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
