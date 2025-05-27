import { Wrench } from 'lucide-react'

type ToolCallMessageProps<T = Record<string, unknown>> = {
  name: string
  args: T
}

export function ToolCallMessage({ name, args }: ToolCallMessageProps) {
  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
        <Wrench className="h-5 w-5" />
      </div>

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <div className="rounded-2xl px-4 py-2 text-sm w-full bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
          <div className="font-medium mb-1">Tool Call: {name}</div>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words break-all">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
