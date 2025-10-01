import { StyledUIResource } from './StyledUIResource'
import { MarkdownContent } from './MarkdownContent'
import type { Content, UIAction } from '@/types/mcp'
import type { AnnotatedFile } from '@/lib/utils/code-interpreter'

export interface ContentRendererProps {
  content: Content
  onUIAction?: (action: UIAction) => void
  fileAnnotations?: Array<AnnotatedFile>
}

/**
 * ContentRenderer component routes different content types to appropriate renderers
 * - text: Renders as markdown
 * - image: Renders as an image tag
 * - resource with ui:// URI: Renders as interactive MCP-UI component
 */
export function ContentRenderer({
  content,
  onUIAction,
  fileAnnotations,
}: ContentRendererProps) {
  // Handle text content (markdown)
  if (content.type === 'text') {
    return (
      <MarkdownContent content={content.text} fileAnnotations={fileAnnotations} />
    )
  }

  // Handle image content
  if (content.type === 'image') {
    return (
      <img
        src={`data:${content.mimeType};base64,${content.data}`}
        alt="Generated content"
        className="max-w-full h-auto rounded border border-gray-200 dark:border-gray-700"
      />
    )
  }

  // Handle resource content with UI resources
  if (
    content.type === 'resource' &&
    content.resource.uri?.startsWith('ui://')
  ) {
    return <StyledUIResource resource={content.resource} onUIAction={onUIAction} />
  }

  // Fallback for unsupported content types
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Unsupported content type: {content.type}
      </p>
    </div>
  )
}
