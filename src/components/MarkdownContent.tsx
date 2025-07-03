import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownContentProps = {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ node, ...props }) => (
            <pre
              className="overflow-x-auto whitespace-pre-wrap break-words"
              {...props}
            />
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
