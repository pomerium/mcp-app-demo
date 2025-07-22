import { Clock } from 'lucide-react'
import { ToolToggle } from './ToolToggle'
import { isBackgroundSupported } from '@/lib/background-supported-models'

interface BackgroundToggleProps {
  useBackground: boolean
  onToggle: (enabled: boolean) => void
  selectedModel: string
  disabled?: boolean
  maxJobsReached?: boolean
}

export function BackgroundToggle({
  useBackground,
  onToggle,
  selectedModel,
  disabled = false,
  maxJobsReached = false,
}: BackgroundToggleProps) {
  const isSupported = isBackgroundSupported(selectedModel)

  let tooltip = `Run requests in the background to continue using the chat interface.${!isSupported ? ` Not supported by ${selectedModel}` : ''}`
  
  if (maxJobsReached) {
    tooltip = 'Maximum number of concurrent background jobs reached. Please wait for existing jobs to complete.'
  }

  return (
    <ToolToggle
      isSelected={useBackground}
      onToggle={onToggle}
      isSupported={isSupported && !maxJobsReached}
      icon={<Clock className="h-4 w-4" />}
      label="Run in background"
      tooltip={tooltip}
      disabled={disabled || !isSupported || maxJobsReached}
    />
  )
}