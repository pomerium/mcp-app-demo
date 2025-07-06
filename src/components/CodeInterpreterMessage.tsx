import { useState, useEffect } from 'react'
import { Badge } from './ui/badge'
import {
  Download,
  FileText,
  Image,
  Play,
  CheckCircle,
  Clock,
  Code2,
} from 'lucide-react'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { CodeBlock } from './CodeBlock'
import { CollapsibleSection } from './ui/collapsible-section'

type CodeInterpreterStatus = 'writing' | 'executing' | 'completed' | 'failed'

interface CodeInterpreterArgs {
  type: string
  itemId: string
  code?: string
  delta?: string
  annotation?: {
    type: string
    container_id: string
    file_id: string
    filename: string
    start_index: number
    end_index: number
  }
  status?: CodeInterpreterStatus
}

interface CodeInterpreterMessageProps {
  name: string
  args: CodeInterpreterArgs
}

export function CodeInterpreterMessage({ args }: CodeInterpreterMessageProps) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<CodeInterpreterStatus>('writing')
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => {
    // Handle different event types
    switch (args.type) {
      case 'code_interpreter_call_in_progress':
        setStatus('writing')
        break

      case 'code_interpreter_call_code_delta':
        // Use the accumulated code from the stream buffer if available
        if (args.code) {
          setCode(args.code)
        } else if (args.delta) {
          // Fallback to accumulating locally if no accumulated code
          setCode((prev) => prev + args.delta)
        }
        break

      case 'code_interpreter_call_code_done':
        if (args.code) {
          setCode(args.code)
        }
        break

      case 'code_interpreter_call_interpreting':
        setStatus('executing')
        break

      case 'code_interpreter_call_completed':
        setStatus('completed')
        break

      case 'code_interpreter_file_annotation':
        console.log(
          '[CodeInterpreterMessage] Processing file annotation:',
          args.annotation,
        )
        if (args.annotation) {
          setFiles((prev) => {
            console.log(
              '[CodeInterpreterMessage] Current files before update:',
              prev,
            )
            // Avoid duplicates by checking if file_id already exists
            const exists = prev.some(
              (file) => file.file_id === args.annotation?.file_id,
            )
            if (!exists) {
              console.log(
                '[CodeInterpreterMessage] Adding file to list:',
                args.annotation,
              )
              const newFiles = [...prev, args.annotation]
              console.log('[CodeInterpreterMessage] New files list:', newFiles)
              return newFiles
            }
            console.log(
              '[CodeInterpreterMessage] File already exists, skipping',
            )
            return prev
          })
        }
        break
    }
  }, [args])

  const handleCopySuccess = (_text: string) => {
    toast.success('Code copied to clipboard')
  }

  const handleCopyError = (_text: string, error?: any) => {
    toast.error('Failed to copy code')
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'writing':
        return <Code2 className="h-4 w-4" />
      case 'executing':
        return <Play className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <Clock className="h-4 w-4" />
      default:
        return <Code2 className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'writing':
        return 'Writing code...'
      case 'executing':
        return 'Executing code...'
      case 'completed':
        return 'Execution completed'
      case 'failed':
        return 'Execution failed'
      default:
        break
    }
  }

  const summaryContent = (
    <>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </>
  )

  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
        <Code2 className="h-5 w-5" />
      </div>

      <div className="flex flex-col space-y-1 items-start w-full sm:w-[85%] md:w-[75%] lg:w-[65%]">
        <CollapsibleSection
          title="Code Interpreter"
          open={true}
          additionalSummaryContent={summaryContent}
        >
          <div className="space-y-4">
            {/* Code Block */}
            {code && (
              <div className="space-y-2">
                <CodeBlock
                  className="text-sm"
                  onCopySuccess={handleCopySuccess}
                  onCopyError={handleCopyError}
                >
                  <code className="language-python">{code}</code>
                </CodeBlock>
                {status === 'writing' && (
                  <div className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                )}
              </div>
            )}

            {/* Files */}
            {files.length > 0 && (
              <div className="space-y-4">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Generated Files
                </span>
                <div className="space-y-4">
                  {files.map((file, index) => {
                    const isImage = file.filename?.match(
                      /\.(png|jpg|jpeg|gif|svg)$/i,
                    )
                    // Use URLSearchParams for secure query parameter encoding
                    const params = new URLSearchParams({
                      containerId: file.container_id,
                      fileId: file.file_id,
                    })
                    const fileUrl = `/api/container-file?${params.toString()}`

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/50">
                          {isImage ? (
                            <Image className="h-4 w-4 text-purple-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="text-sm font-medium">
                            {file.filename || 'Generated file'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-8 w-8 p-0 hover:bg-purple-200 dark:hover:bg-purple-800"
                            onClick={() => {
                              // Download the file
                              const link = document.createElement('a')
                              link.href = fileUrl
                              link.download =
                                file.filename || `file_${file.file_id}`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                              toast.success(
                                `Downloading ${file.filename || 'file'}`,
                              )
                            }}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">
                              Download {file.filename}
                            </span>
                          </Button>
                        </div>

                        {/* Display image inline if it's an image file */}
                        {isImage && (
                          <div className="rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/50 p-4">
                            <img
                              src={fileUrl}
                              alt={file.filename || 'Generated image'}
                              className="max-w-full h-auto rounded-lg shadow-sm"
                              style={{ maxHeight: '400px' }}
                              onError={(e) => {
                                console.error('Failed to load image:', e)
                                // Hide the image if it fails to load
                                ;(e.target as HTMLImageElement).style.display =
                                  'none'
                                toast.error('Failed to load image')
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
