import React from 'react'
import type { ColorVariant } from '@/lib/variants'
import { cn } from '@/lib/utils'
import { getIconVariantStyles } from '@/lib/variants'

interface MessageAvatarProps {
  icon: React.ReactNode
  variant?: ColorVariant
  isLoading?: boolean
  className?: string
}

export function MessageAvatar({
  icon,
  variant = 'default',
  isLoading = false,
  className,
}: MessageAvatarProps) {
  const iconStyles = getIconVariantStyles(variant)

  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md',
        iconStyles,
        isLoading && 'animate-[pulse_1.5s_ease-in-out_infinite] opacity-80',
        className,
      )}
      aria-hidden="true"
    >
      {icon}
    </div>
  )
}
