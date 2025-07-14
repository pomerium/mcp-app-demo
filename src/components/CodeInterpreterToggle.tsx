import { Code2 } from 'lucide-react'
import { ToolToggle } from './ToolToggle'
import { isCodeInterpreterSupported } from '@/lib/utils/prompting'

interface CodeInterpreterToggleProps {
  useCodeInterpreter: boolean
  onToggle: (enabled: boolean) => void
  selectedModel: string
  disabled?: boolean
}

export function CodeInterpreterToggle({
  useCodeInterpreter,
  onToggle,
  selectedModel,
  disabled = false,
}: CodeInterpreterToggleProps) {
  const isSupported = isCodeInterpreterSupported(selectedModel)

  return (
    <ToolToggle
      isSelected={useCodeInterpreter}
      onToggle={onToggle}
      isSupported={isSupported}
      icon={<Code2 className="h-4 w-4" />}
      label="Code Interpreter"
      tooltip={`Execute Python code for calculations, data analysis, and visualizations.${!isSupported ? ` Not supported by ${selectedModel}` : ''}`}
      disabled={!isSupported || disabled}
    />
  )
}
