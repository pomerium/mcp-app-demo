import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { CodeBlock } from '@/components/CodeBlock'

type MarkdownContentProps = {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const handleCopySuccess = () => {
    toast.success('Copied code snippet to clipboard')
  }

  const handleCopyError = () => {
    toast.error('Failed to copy code snippet')
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>*+*]:mt-4 [&>h1+*]:mt-3 [&>h2+*]:mt-3 [&>h3+*]:mt-3 [&>p+ul]:mt-3 [&>p+ol]:mt-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ node, className, children, ...props }) => (
            <CodeBlock
              className={className}
              onCopySuccess={handleCopySuccess}
              onCopyError={handleCopyError}
              {...props}
            >
              {children}
            </CodeBlock>
          ),
          code: ({ node, ...props }) => (
            <code className="break-words whitespace-pre-wrap" {...props} />
          ),
          table: ({ node, ...props }) => (
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
