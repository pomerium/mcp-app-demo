import { Toggle } from './ui/toggle'
import type { ReactNode } from 'react'

interface ToolToggleProps {
  isSelected: boolean
  onToggle: (enabled: boolean) => void
  isSupported: boolean
  icon: ReactNode
  label: string
  tooltip: string
  disabled?: boolean
}

export function ToolToggle({
  isSelected,
  onToggle,
  isSupported,
  icon,
  label,
  tooltip,
  disabled = false,
}: ToolToggleProps) {
  const isDisabled = disabled || !isSupported

  return (
    <Toggle
      isSelected={isSelected}
      onToggle={() => onToggle(!isSelected)}
      disabled={isDisabled}
      className={`flex items-center gap-1.5 ${!isSupported ? 'opacity-50' : ''}`}
      title={tooltip}
      aria-pressed={isSelected}
    >
      {icon}
      <span className="sr-only text-sm md:not-sr-only">{label}</span>
    </Toggle>
  )
}
