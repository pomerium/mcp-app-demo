import { cn } from '../lib/utils'
import type { Message } from '../mcp/client'
import { formatTimestamp } from '../lib/utils'
import { Bot, Copy, Download } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'

import { toast } from 'sonner'
import { copyToClipboard } from '../lib/utils/clipboard'
import { useState } from 'react'

export interface BotMessageProps {
  message: Message
  isLoading?: boolean
  fileAnnotations?: Array<{
    type: string
    container_id: string
    file_id: string
    filename: string
  }>
}

// Replace sandbox URLs with working API URLs
function replaceSandboxUrls(
  content: string,
  annotations: Array<{
    type: string
    container_id: string
    file_id: string
    filename: string
  }> = [],
) {
  return content.replace(
    /sandbox:\/mnt\/data\/([^)\s\]]+)/g,
    (match, filename) => {
      const annotation = annotations.find((a) => a.filename === filename)
      if (annotation) {
        return `/api/container-file?containerId=${annotation.container_id}&fileId=${annotation.file_id}`
      }
      return match // Keep original if no annotation found
    },
  )
}

// Check if a file is an image based on its extension
function isImageFile(filename: string): boolean {
  const imageExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.bmp',
  ]
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

// Generate API URL for a file annotation
function getFileUrl(annotation: {
  container_id: string
  file_id: string
}): string {
  return `/api/container-file?containerId=${annotation.container_id}&fileId=${annotation.file_id}`
}

export function BotMessage({
  message,
  isLoading,
  fileAnnotations = [],
}: BotMessageProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleCopy = async () => {
    const copied = await copyToClipboard(processedContent)

    if (copied) {
      toast.success('Copied message to clipboard')
    }
  }

  const handleImageError = (fileId: string) => {
    setImageErrors((prev) => new Set(prev).add(fileId))
  }

  const handleDownload = (annotation: {
    container_id: string
    file_id: string
    filename: string
  }) => {
    const url = getFileUrl(annotation)
    const link = document.createElement('a')
    link.href = url
    link.download = annotation.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Process message content to replace sandbox URLs
  const processedContent = replaceSandboxUrls(message.content, fileAnnotations)

  // Separate image and non-image files
  const imageFiles = fileAnnotations.filter((annotation) =>
    isImageFile(annotation.filename),
  )
  const otherFiles = fileAnnotations.filter(
    (annotation) => !isImageFile(annotation.filename),
  )

  return (
    <div
      className={cn(
        'flex w-full max-w-full gap-2 py-2 animate-in fade-in',
        'justify-start',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
          isLoading && 'animate-[pulse_1.5s_ease-in-out_infinite] opacity-80',
        )}
      >
        <Bot className="h-5 w-5" />
      </div>
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
          <div data-raw-markdown={processedContent}>
            <div className="prose prose-sm dark:prose-invert max-w-none break-words break-all whitespace-pre-wrap">
              <MarkdownContent content={processedContent} />
            </div>
          </div>

          {/* Image Gallery */}
          {imageFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              {imageFiles.map((annotation) => {
                const hasError = imageErrors.has(annotation.file_id)
                const imageUrl = getFileUrl(annotation)

                return (
                  <div key={annotation.file_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {annotation.filename}
                      </span>
                      <button
                        onClick={() => handleDownload(annotation)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    </div>

                    {hasError ? (
                      <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded border border-dashed border-gray-300 dark:border-gray-600">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Failed to load image
                          </p>
                          <button
                            onClick={() => handleDownload(annotation)}
                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Download file instead
                          </button>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={imageUrl}
                        alt={annotation.filename}
                        className="max-w-full h-auto rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                        onError={() => handleImageError(annotation.file_id)}
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Other Files */}
          {otherFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Attachments:
              </p>
              <div className="space-y-1">
                {otherFiles.map((annotation) => (
                  <div
                    key={annotation.file_id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {annotation.filename}
                    </span>
                    <button
                      onClick={() => handleDownload(annotation)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1 items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <time dateTime={message.timestamp.toISOString()}>
            {formatTimestamp(message.timestamp)}
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
