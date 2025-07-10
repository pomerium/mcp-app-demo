import { Button } from './button'
import type { ReactNode } from 'react'

interface ToggleProps {
  isSelected: boolean
  onToggle: () => void
  disabled?: boolean
  title?: string
  className?: string
  children: ReactNode
}

export function Toggle({
  isSelected,
  onToggle,
  disabled = false,
  title,
  className = '',
  children,
}: ToggleProps) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      disabled={disabled}
      className={`
        flex items-center gap-2 transition-all border text-sm
        ${
          isSelected
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary'
            : 'hover:bg-primary/10 hover:text-primary hover:border-primary/30'
        }
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={title}
    >
      {children}
    </Button>
  )
}
