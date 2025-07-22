import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Sidebar } from './ui/sidebar'
import { Clock, Play, X, Trash2 } from 'lucide-react'
import { useHasMounted } from '@/hooks/useHasMounted'
import {
  getBackgroundJobs,
  removeBackgroundJob,
  updateBackgroundJob,
} from '@/lib/background-jobs-storage'
import type { BackgroundJob } from '@/lib/schemas'

interface BackgroundJobsSidebarProps {
  isOpen: boolean
  onClose: () => void
  onLoadResponse?: (jobId: string, response: string) => void
  onCancelJob?: (jobId: string) => void
}

export function BackgroundJobsSidebar({
  isOpen,
  onClose,
  onLoadResponse,
  onCancelJob,
}: BackgroundJobsSidebarProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const hasMounted = useHasMounted()

  useEffect(() => {
    if (!hasMounted) return

    const loadJobs = () => {
      const backgroundJobs = getBackgroundJobs()
      setJobs(backgroundJobs)
    }

    loadJobs()

    // Set up periodic refresh for job status updates
    const interval = setInterval(loadJobs, 2000)
    return () => clearInterval(interval)
  }, [hasMounted])

  const handleLoadResponse = (job: BackgroundJob) => {
    if (job.response && onLoadResponse) {
      onLoadResponse(job.id, job.response)
    }
  }

  const handleCancelJob = (job: BackgroundJob) => {
    if (onCancelJob) {
      onCancelJob(job.id)
    }
    // Update job status to indicate cancellation attempt
    updateBackgroundJob(job.id, { status: 'failed', error: 'Cancelled by user' })
    setJobs(getBackgroundJobs())
  }

  const handleDeleteJob = (jobId: string) => {
    removeBackgroundJob(jobId)
    setJobs(getBackgroundJobs())
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

  if (!hasMounted) {
    return null
  }

  return (
    <Sidebar
      isOpen={isOpen}
      onClose={onClose}
      title="Background Jobs"
      className="w-96"
    >
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No background jobs</p>
            <p className="text-sm">
              Enable "Run in background" to start jobs here
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="font-medium">{getStatusText(job.status)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(job.createdAt)}
                </span>
              </div>

              {job.title && (
                <div>
                  <p className="text-sm font-medium truncate" title={job.title}>
                    {job.title}
                  </p>
                </div>
              )}

              {job.error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {job.error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadResponse(job)}
                  disabled={job.status !== 'completed' || !job.response}
                  className="flex-1"
                  aria-label={`Load response for job ${job.id}`}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Load Response
                </Button>

                {job.status === 'running' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelJob(job)}
                    className="flex-1"
                    aria-label={`Cancel job ${job.id}`}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteJob(job.id)}
                  className="px-2"
                  aria-label={`Delete job ${job.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {job.completedAt && (
                <div className="text-xs text-muted-foreground">
                  Completed: {formatTimestamp(job.completedAt)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Sidebar>
  )
}