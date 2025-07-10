import { Toggle } from './ui/toggle'
import { Code2 } from 'lucide-react'
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
  const isDisabled = disabled || !isSupported

  return (
    <Toggle
      isSelected={useCodeInterpreter}
      onToggle={() => onToggle(!useCodeInterpreter)}
      disabled={isDisabled}
      className={!isSupported ? 'opacity-50' : ''}
      title={`Execute Python code for calculations, data analysis, and visualizations.${!isSupported ? ` Not supported by ${selectedModel}` : ''}`}
    >
      <Code2 className="h-4 w-4" />
      <span className="sr-only text-sm md:not-sr-only">Code Interpreter</span>
    </Toggle>
  )
}
