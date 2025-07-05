import React from 'react'
import { cn } from '@/lib/utils'

type ColorVariant = 'purple' | 'orange' | 'red' | 'blue'

interface CollapsibleSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  open?: boolean
  className?: string
  isLoading?: boolean
  additionalSummaryContent?: React.ReactNode
  variant?: ColorVariant
}

const getVariantStyles = (variant: ColorVariant) => {
  switch (variant) {
    case 'orange':
      return 'bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100'
    case 'red':
      return 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
    case 'blue':
      return 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100'
    case 'purple':
    default:
      return 'bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100'
  }
}

const getChevronColor = (variant: ColorVariant) => {
  switch (variant) {
    case 'orange':
      return 'text-orange-600 dark:text-orange-300'
    case 'red':
      return 'text-red-600 dark:text-red-300'
    case 'blue':
      return 'text-blue-600 dark:text-blue-300'
    case 'purple':
    default:
      return 'text-purple-600 dark:text-purple-300'
  }
}

export function CollapsibleSection({
  title,
  children,
  open = false,
  className,
  isLoading = false,
  additionalSummaryContent,
  variant = 'purple',
}: CollapsibleSectionProps) {
  return (
    <details
      open={open}
      className={cn(
        'grid gap-4 rounded-2xl px-4 py-2 text-sm w-full group [&:not([open])]:h-8 [&:not([open])]:flex [&:not([open])]:items-center [&:not([open])]:py-0',
        getVariantStyles(variant),
        className,
      )}
    >
      <summary className="font-medium mb-1 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden cursor-pointer group-[&:not([open])]:mb-0">
        {/* Chevron icon for expand/collapse */}
        <svg
          className={cn(
            'h-4 w-4 transition-transform group-open:rotate-90',
            getChevronColor(variant),
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {title}
        {additionalSummaryContent}
        {isLoading && (
          <span className="ml-2 animate-spin">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-label="Loading"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </span>
        )}
      </summary>
      <div className="grid gap-4">{children}</div>
    </details>
  )
}
