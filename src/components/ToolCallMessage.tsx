import { Wrench, Check, X } from 'lucide-react'
import { Button } from './ui/button'

type ToolCallMessageProps<T = Record<string, unknown>> = {
  name: string
  args: T
  onApprove?: () => void
  onReject?: () => void
  requiresApproval?: boolean
  isApproved?: boolean
  isRejected?: boolean
}

export function ToolCallMessage({
  name,
  args,
  onApprove,
  onReject,
  requiresApproval = false,
  isApproved = false,
  isRejected = false
}: ToolCallMessageProps) {
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
          {requiresApproval && !isApproved && !isRejected && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700"
                onClick={onApprove}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={onReject}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {isApproved && (
            <div className="mt-2 text-sm text-green-600 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Approved
            </div>
          )}
          {isRejected && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <X className="h-4 w-4 mr-1" />
              Rejected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
