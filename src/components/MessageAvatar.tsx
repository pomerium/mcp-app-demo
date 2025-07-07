import { cn, getVariantStyles, type ColorVariant } from '@/lib/utils'

interface MessageAvatarProps {
  icon: React.ReactNode
  variant?: ColorVariant
  className?: string
}

export function MessageAvatar({
  icon,
  variant = 'default',
  className,
}: MessageAvatarProps) {
  const styles = getVariantStyles(variant)

  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md',
        styles.icon,
        className,
      )}
      aria-hidden="true"
    >
      {icon}
    </div>
  )
}
