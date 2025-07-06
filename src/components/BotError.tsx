import { AlertTriangle, ChevronRight } from 'lucide-react'
import { CollapsibleSection } from './ui/collapsible-section'

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
        <CollapsibleSection
          title="Error"
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="red"
          open={true}
        >
          <div>{message}</div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
