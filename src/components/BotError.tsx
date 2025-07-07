import { AlertTriangle, ChevronRight } from 'lucide-react'

interface BotErrorProps {
  message: string
}

export function BotError({ message }: BotErrorProps) {
  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start items-start text-red-900 dark:text-red-100">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <details
          open
          className="rounded-2xl px-4 py-2 text-sm w-full group [&:not([open])]:h-8 [&:not([open])]:flex [&:not([open])]:items-center [&:not([open])]:py-0 bg-red-50 dark:bg-red-950"
        >
          <summary className="font-medium mb-1 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden cursor-pointer group-[&:not([open])]:mb-0">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            <span>Error</span>
          </summary>
          <div>{message}</div>
        </details>
      </div>
    </div>
  )
}
