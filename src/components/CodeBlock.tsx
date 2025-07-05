import { useRef, type ComponentProps } from 'react'
import { Copy } from 'lucide-react'
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
        className={`overflow-x-auto whitespace-pre-wrap break-words ${className || ''}`}
        {...props}
      >
        {children}
      </pre>
      <Button
        onClick={handleCopy}
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs"
      >
        <Copy className="h-4 w-4" />
        <span className="sr-only">Copy code snippet</span>
      </Button>
    </div>
  )
}
