import React from 'react'
import type { ColorVariant } from '@/lib/variants'
import { cn } from '@/lib/utils'
import { getVariantStyles } from '@/lib/variants'

interface CollapsibleSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  open?: boolean
  className?: string
  isLoading?: boolean
  additionalSummaryContent?: React.ReactNode
  variant?: ColorVariant
}

export function CollapsibleSection({
  title,
  children,
  open = false,
  className,
  isLoading = false,
  additionalSummaryContent,
  variant = 'default',
}: CollapsibleSectionProps) {
  const styles = getVariantStyles(variant)

  return (
    <details
      open={open}
      className={cn(
        'grid gap-4 rounded-2xl px-4 py-2 text-sm w-full group [&:not([open])]:h-8 [&:not([open])]:flex [&:not([open])]:items-center [&:not([open])]:py-0',
        styles.background,
        className,
      )}
    >
      <summary className="font-medium mb-1 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden cursor-pointer group-[&:not([open])]:mb-0">
        <svg
          className={cn(
            'h-4 w-4 transition-transform group-open:rotate-90',
            styles.chevron,
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
