import { AlertTriangle } from 'lucide-react'
import { CollapsibleSection } from './ui/collapsible-section'
import { MessageAvatar } from './MessageAvatar'
import type { ReactNode } from 'react'

interface BotErrorProps {
  message: ReactNode
}

export function BotError({ message }: BotErrorProps) {
  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start items-start text-red-900 dark:text-red-100">
      <MessageAvatar
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="error"
      />
      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <CollapsibleSection title="Error" variant="error" open={true}>
          {message}
        </CollapsibleSection>
      </div>
    </div>
  )
}
