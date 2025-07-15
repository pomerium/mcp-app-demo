import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import type { AnnotatedFile } from '@/lib/utils/code-interpreter'
import { CodeBlock } from '@/components/CodeBlock'

type MarkdownContentProps = {
  content: string
  fileAnnotations?: Array<AnnotatedFile>
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const handleCopySuccess = () => {
    toast.success('Copied code snippet to clipboard')
  }

  const handleCopyError = () => {
    toast.error('Failed to copy code snippet')
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children, ...props }) => (
            <CodeBlock
              onCopySuccess={handleCopySuccess}
              onCopyError={handleCopyError}
              {...props}
            >
              {children}
            </CodeBlock>
          ),
          code: ({ ...props }) => (
            <code className="break-words whitespace-pre-wrap" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table {...props} />
            </div>
          ),
          a: ({ href, children, ...props }) => (
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
      </ReactMarkdown>
    </div>
  )
}
