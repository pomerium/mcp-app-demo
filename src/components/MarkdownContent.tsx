import { Streamdown } from 'streamdown'
import { toast } from 'sonner'
import type { ComponentProps } from 'react'
import { CodeBlock } from '@/components/CodeBlock'

type MarkdownContentProps = {
  content: string
  isAnimating?: boolean
}

export function MarkdownContent({
  content,
  isAnimating = false,
}: MarkdownContentProps) {
  const handleCopySuccess = () => {
    toast.success('Copied code snippet to clipboard')
  }

  const handleCopyError = () => {
    toast.error('Failed to copy code snippet')
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <Streamdown
        isAnimating={isAnimating}
        components={{
          pre: ({ children, ...props }: ComponentProps<'pre'>) => (
            <CodeBlock
              onCopySuccess={handleCopySuccess}
              onCopyError={handleCopyError}
              {...props}
            >
              {children}
            </CodeBlock>
          ),
          code: ({ ...props }: ComponentProps<'code'>) => (
            <code className="break-words whitespace-pre-wrap" {...props} />
          ),
          table: ({ ...props }: ComponentProps<'table'>) => (
            <div className="overflow-x-auto my-4">
              <table {...props} />
            </div>
          ),
          a: ({ href, children, ...props }: ComponentProps<'a'>) => (
            <a
              href={href}
              className="break-words"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Streamdown>
    </div>
  )
}
