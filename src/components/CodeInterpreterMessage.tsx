import React from 'react'
import {
  Download,
  FileText,
  Image,
  Play,
  CheckCircle,
  Clock,
  Code2,
} from 'lucide-react'
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

const getStatusIcon = (status: CodeInterpreterStatus) => {
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

const getStatusText = (status: CodeInterpreterStatus) => {
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
      return ''
  }
}

interface AnnotatedFile {
  type: string
  container_id: string
  file_id: string
  filename: string
  start_index: number
  end_index: number
}

const reImageFileExtension = /\.(jpg|jpeg|png|gif|bmp|webp)$/i

const isImage = (file: AnnotatedFile) => {
  return file.filename?.match(reImageFileExtension)
}

function createAnnotatedFileUrl(file: AnnotatedFile) {
  const url = new URL('/api/container-file', window.location.origin)
  url.searchParams.set('containerId', file.container_id)
  url.searchParams.set('fileId', file.file_id)

  return url.toString()
}

function getInterpreterState(args: CodeInterpreterArgs): {
  status: CodeInterpreterStatus
  code: string
  files: AnnotatedFile[]
} {
  let status: CodeInterpreterStatus = 'writing'
  let code = ''
  let files: AnnotatedFile[] = []

  switch (args.type) {
    case 'code_interpreter_call_in_progress':
      status = 'writing'
      break
    case 'code_interpreter_call_code_delta':
      status = 'writing'
      code = args.code ?? args.delta ?? ''
      break
    case 'code_interpreter_call_code_done':
      status = 'writing'
      code = args.code ?? ''
      break
    case 'code_interpreter_call_interpreting':
      status = 'executing'
      code = args.code ?? ''
      break
    case 'code_interpreter_call_completed':
      status = 'completed'
      code = args.code ?? ''
      break
    case 'code_interpreter_file_annotation':
      status = args.status ?? 'completed'
      code = args.code ?? ''
      if (args.annotation) {
        files = [args.annotation]
      }
      break
    default:
      status = args.status ?? 'writing'
      code = args.code ?? ''
      break
  }
  return { status, code, files }
}

export function CodeInterpreterMessage({ args }: CodeInterpreterMessageProps) {
  const { status, code, files } = getInterpreterState(args)

  const handleCopySuccess = () => {
    toast.success('Code copied to clipboard')
  }

  const handleCopyError = () => {
    toast.error('Failed to copy code')
  }

  const summaryContent = (
    <>
      {getStatusIcon(status)}
      <span>{getStatusText(status)}</span>
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

            {files.length > 0 && (
              <div className="space-y-4">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Generated Files
                </span>
                <div className="space-y-4">
                  {files.map((file) => {
                    const fileUrl = createAnnotatedFileUrl(file)

                    return (
                      <div key={fileUrl} className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/50">
                          {isImage(file) ? (
                            <Image className="h-4 w-4 text-purple-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="text-sm font-medium">
                            {file.filename || 'Generated file'}
                          </span>
                          <a
                            href={fileUrl}
                            download={file.filename}
                            className="ml-auto h-8 w-8 p-0 hover:bg-purple-200 dark:hover:bg-purple-800 rounded inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">
                              Download {file.filename}
                            </span>
                          </a>
                        </div>

                        {isImage(file) && (
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
