import { Clock, Play, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from './ui/button'
import type { BackgroundJob } from '@/lib/schemas'
import { useBackgroundJobStatus } from '@/hooks/useBackgroundJobStatus'

export function BackgroundJobItem({
  job,
  onLoadResponse,
  onCancelJob,
  updateJob,
  removeJob,
}: {
  job: BackgroundJob
  onLoadResponse?: (jobId: string, response: string) => void
  onCancelJob?: (jobId: string) => void
  updateJob: (jobId: string, updates: Partial<BackgroundJob>) => void
  removeJob: (jobId: string) => void
}) {
  // Use polling hook to check job status - continue polling until definitely complete or failed
  const shouldPoll =
    job.status === 'running' || (job.status === 'failed' && !job.completedAt)

  const { data: statusData } = useBackgroundJobStatus(
    shouldPoll ? job : undefined,
    2000,
  )

  // Update job when status changes
  useEffect(() => {
    if (statusData) {
      console.log('Polling data received:', statusData)
      console.log('Current job:', job)

      const needsUpdate =
        statusData.status !== job.status ||
        statusData.response !== job.response ||
        statusData.error !== job.error ||
        statusData.completedAt !== job.completedAt

      if (needsUpdate) {
        console.log('Updating job with:', {
          status: statusData.status,
          response: statusData.response,
          error: statusData.error,
          completedAt: statusData.completedAt,
        })

        updateJob(job.id, {
          status: statusData.status,
          response: statusData.response || job.response,
          error: statusData.error,
          completedAt: statusData.completedAt || job.completedAt,
        })
      }
    }
  }, [statusData, job, updateJob])

  const handleLoadResponse = () => {
    if (onLoadResponse) {
      // If no response yet, load a placeholder or empty content
      const responseContent =
        job.response ||
        '[Job is still running - partial response will appear here]'
      onLoadResponse(job.id, responseContent)
    }
  }

  const handleCancelJob = () => {
    if (onCancelJob) {
      onCancelJob(job.id)
    }
    // Update job status to indicate cancellation attempt
    updateJob(job.id, { status: 'failed', error: 'Cancelled by user' })
  }

  const handleDeleteJob = () => {
    removeJob(job.id)
  }

  const getStatusIcon = (status: BackgroundJob['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <Play className="h-4 w-4 text-green-500" />
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: BackgroundJob['status']) => {
    switch (status) {
      case 'running':
        return 'Running'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  return (
    <section
      className="grid gap-2 border rounded-lg p-4 space-y-3 bg-card"
      aria-label={job.title}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(job.status)}
          <span className="font-medium">{getStatusText(job.status)}</span>
        </div>
        <time
          className="text-xs text-muted-foreground"
          dateTime={job.completedAt ?? job.createdAt}
        >
          {formatTimestamp(job.createdAt)}
        </time>
      </header>

      <span className="text-sm font-medium truncate" title={job.title}>
        {job.title}
      </span>

      {job.error && (
        <div
          className="text-sm text-red-600 bg-red-50 p-2 rounded"
          role="alert"
          aria-live="assertive"
        >
          {job.error}
        </div>
      )}

      <nav
        aria-label={`Job actions for background job ${job.title}`}
        className="flex justify-end"
      >
        <ul className="flex gap-1">
          <li>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadResponse}
              disabled={job.status === 'failed' && !job.response}
            >
              <Play className="h-3 w-3 mr-1" />
              <span className="sr-only md:not-sr-only">
                {job.status === 'running' && !job.response
                  ? 'Load Progress'
                  : job.status === 'running' && job.response
                    ? 'Load Partial'
                    : 'Load Response'}
              </span>
            </Button>
          </li>
          {job.status === 'running' && (
            <li>
              <Button variant="outline" size="sm" onClick={handleCancelJob}>
                <X className="h-3 w-3 mr-1" />
                <span>Cancel</span>
              </Button>
            </li>
          )}
          <li>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteJob}
              className="px-2"
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only md:not-sr-only">Delete</span>
            </Button>
          </li>
        </ul>
      </nav>
    </section>
  )
}
