import ReactMarkdown from 'react-markdown'

type MarkdownContentProps = {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words break-all whitespace-pre-wrap">
      <ReactMarkdown
        components={{
          pre: ({ node, ...props }) => (
            <pre
              className="overflow-x-auto whitespace-pre-wrap break-words break-all"
              {...props}
            />
          ),
          code: ({ node, ...props }) => (
            <code
              className="break-words break-all whitespace-pre-wrap"
              {...props}
            />
          ),
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="break-words break-all"
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
