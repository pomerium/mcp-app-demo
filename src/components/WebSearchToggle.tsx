import { Globe } from 'lucide-react'
import { isWebSearchSupported } from '@/lib/utils/prompting'
import { ToolToggle } from './ToolToggle'

interface WebSearchToggleProps {
  useWebSearch: boolean
  onToggle: (enabled: boolean) => void
  selectedModel: string
  disabled?: boolean
}

export function WebSearchToggle({
  useWebSearch,
  onToggle,
  selectedModel,
  disabled = false,
}: WebSearchToggleProps) {
  const isSupported = isWebSearchSupported(selectedModel)

  return (
    <ToolToggle
      isSelected={useWebSearch}
      onToggle={onToggle}
      isSupported={isSupported}
      icon={<Globe className="h-4 w-4" />}
      label="Web Search"
      tooltip={`Enable web search for up-to-date information from the internet.${!isSupported ? ` Not supported by ${selectedModel}` : ''}`}
      disabled={disabled}
    />
  )
}
