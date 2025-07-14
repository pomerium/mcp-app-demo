import { ChevronDown } from 'lucide-react'
import { useModels } from '../hooks/useModels'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'

// Visually hidden class for screen readers
const srOnly = 'sr-only'

type ModelSelectProps = {
  value: string
  onValueChange: (value: string) => void
}

export function ModelSelect({ value, onValueChange }: ModelSelectProps) {
  const { data: models, isLoading } = useModels()

  if (isLoading) {
    return (
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Loading models...
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-fit max-w-[100px] md:max-w-[240px] justify-between"
        >
          <span className="truncate block max-w-[160px] overflow-hidden whitespace-nowrap">
            {value || 'Select a model'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[60vh] overflow-y-auto w-[240px]">
        {/* Screen reader only label */}
        <span className={srOnly} id="models-label">
          Models
        </span>
        {/* Visible label, aria-hidden so not read twice */}
        <div
          className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 select-none pointer-events-none"
          aria-hidden="true"
        >
          Models
        </div>
        {models?.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onValueChange(model.id)}
            aria-labelledby="models-label"
          >
            {model.id}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
