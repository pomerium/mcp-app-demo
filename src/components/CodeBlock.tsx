import { useRef } from 'react'
import { Copy } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/utils/clipboard'

type CodeBlockProps = {
  onCopySuccess?: (text: string) => void
  onCopyError?: (text: string, error?: unknown) => void
  copyButtonLabel?: string
  copiedButtonLabel?: string
} & Omit<ComponentProps<'pre'>, 'onCopy'>

export function CodeBlock({
  children,
  className,
  onCopySuccess,
  onCopyError,
  ...props
}: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    // Extract text content from the actual DOM element
    const textContent = preRef.current?.textContent ?? ''

    try {
      const success = await copyToClipboard(textContent)

      if (success) {
        onCopySuccess?.(textContent)
      } else {
        onCopyError?.(textContent)
      }
    } catch (error) {
      onCopyError?.(textContent, error)
    }
  }

  return (
    <div className="relative group">
      <pre
        ref={preRef}
        className={`overflow-auto max-h-64 md:max-h-80 lg:max-h-96 whitespace-pre-wrap break-words bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${className || ''}`}
        {...props}
      >
        {children}
      </pre>
      <Button
        onClick={handleCopy}
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs bg-white hover:bg-gray-50 text-gray-900 border-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
      >
        <Copy className="h-4 w-4" />
        <span className="sr-only">Copy code snippet</span>
      </Button>
    </div>
  )
}
