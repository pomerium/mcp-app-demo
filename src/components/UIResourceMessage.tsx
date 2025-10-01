import { Bot } from 'lucide-react'
import { MessageAvatar } from './MessageAvatar'
import { StyledUIResource } from './StyledUIResource'
import type { UIResource, UIAction } from '@/types/mcp'
import { cn } from '@/lib/utils'

export interface UIResourceMessageProps {
  resource: UIResource
  onUIAction?: (action: UIAction) => void
  timestamp?: string
}

/**
 * Renders a UI resource (like a chess board) as a standalone message
 * This component is used when MCP servers return interactive UI components
 */
export function UIResourceMessage({
  resource,
  onUIAction,
}: UIResourceMessageProps) {
  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        'justify-start',
      )}
    >
      <MessageAvatar icon={<Bot className="h-5 w-5" />} variant="default" />
      <div
        className={cn(
          'group grid gap-1 space-y-1 items-start',
          'w-full sm:w-[85%] md:w-[75%] lg:w-[65%]',
        )}
      >
        <div className="w-full">
          <StyledUIResource resource={resource} onUIAction={onUIAction} />
        </div>
      </div>
    </div>
  )
}
