import { Bot, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { MessageAvatar } from './MessageAvatar'
import type { AssistantStreamEvent } from '@/hooks/useStreamingChat'
import type { AnnotatedFile } from '@/lib/utils/code-interpreter'
import { cn, formatTimestamp } from '@/lib/utils'
import { MarkdownContent } from '@/components/MarkdownContent'
import { copyToClipboard } from '@/lib/utils/clipboard'
import {
  createAnnotatedFileUrl,
  isImageFile,
  replaceSandboxUrls,
} from '@/lib/utils/code-interpreter'
import { ContentRenderer } from './ContentRenderer'
import type { Content, UIAction } from '@/types/mcp'

export interface Message extends Omit<AssistantStreamEvent, 'type'> {
  timestamp: string
  status: string
}

export interface BotMessageProps {
  message: Message
  fileAnnotations?: Array<AnnotatedFile>
  onUIAction?: (action: UIAction) => void
}

export function BotMessage({
  message,
  fileAnnotations = [],
  onUIAction,
}: BotMessageProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const processedContent = replaceSandboxUrls(message.content, fileAnnotations)

  const handleCopy = async () => {
    const copied = await copyToClipboard(processedContent)

    if (copied) {
      toast.success('Copied message to clipboard')
    }
  }

  const handleImageError = (fileId: string) => {
    setImageErrors((prev) => new Set(prev).add(fileId))
  }

  const fileLikeAnnotations = fileAnnotations.filter(
    (annotation) => annotation.type === 'container_file_citation',
  )
  const imageFiles = fileLikeAnnotations.filter((annotation) =>
    isImageFile(annotation.filename),
  )
  const otherFiles = fileLikeAnnotations.filter(
    (annotation) => !isImageFile(annotation.filename),
  )

  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        'justify-start',
      )}
    >
      <MessageAvatar icon={<Bot className="h-5 w-5" />} variant="default" />
      <div
        className={cn(
          'group grid gap-1 space-y-1 items-start',
          'w-full sm:w-[85%] md:w-[75%] lg:w-[65%]',
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          )}
        >
          {/* Render MCP content items if present */}
          {message.mcpContent && message.mcpContent.length > 0 && (
            <div className="space-y-2 mb-2">
              {message.mcpContent.map((item: any, index: number) => {
                if (item && typeof item === 'object' && 'type' in item) {
                  const content = item as Content
                  return (
                    <ContentRenderer
                      key={index}
                      content={content}
                      fileAnnotations={fileAnnotations}
                      onUIAction={onUIAction}
                    />
                  )
                }
                return null
              })}
            </div>
          )}

          {/* Render markdown content if present */}
          {processedContent && (
            <div data-raw-markdown={processedContent}>
              <MarkdownContent
                content={processedContent}
                fileAnnotations={fileAnnotations}
              />
            </div>
          )}

          {imageFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              {imageFiles.map((annotation) => {
                const hasError = imageErrors.has(annotation.file_id)
                const imageUrl = createAnnotatedFileUrl(annotation)

                const getAltText = (filename: string) => {
                  const name = filename.replace(/\.[^/.]+$/, '')
                  return `Generated visualization: ${name.replace(/_/g, ' ')}`
                }

                return (
                  <div key={annotation.file_id} className="relative group">
                    {hasError ? (
                      <div
                        className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded border border-dashed border-gray-300 dark:border-gray-600"
                        role="alert"
                      >
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Failed to load image
                          </p>
                          <a
                            href={createAnnotatedFileUrl(annotation)}
                            download={annotation.filename}
                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Download file instead
                          </a>
                        </div>
                      </div>
                    ) : (
                      <>
                        <img
                          src={imageUrl}
                          alt={getAltText(annotation.filename)}
                          className="max-w-full h-auto rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                          onError={() => handleImageError(annotation.file_id)}
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                        <a
                          href={createAnnotatedFileUrl(annotation)}
                          download={annotation.filename}
                          className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-800"
                          title="Download image"
                        >
                          <Download className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </a>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {otherFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Attachments:
              </p>
              <ul className="space-y-1" aria-label="File attachments">
                {otherFiles.map((annotation) => (
                  <li
                    key={annotation.file_id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {annotation.filename}
                    </span>
                    <a
                      href={createAnnotatedFileUrl(annotation)}
                      download={annotation.filename}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Download className="h-3 w-3" />
                      Download
                      <span className="sr-only"> {annotation.filename}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-1 items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <time dateTime={message.timestamp}>
            {formatTimestamp(new Date(message.timestamp))}
          </time>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Copy message to clipboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
