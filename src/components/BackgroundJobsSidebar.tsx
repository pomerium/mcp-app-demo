import { Button } from './ui/button'
import { Sidebar } from './ui/sidebar'
import { Clock, Play, X, Trash2 } from 'lucide-react'
import { useHasMounted } from '@/hooks/useHasMounted'
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs'
import { useBackgroundJobStatus } from '@/hooks/useBackgroundJobStatus'
import type { BackgroundJob } from '@/lib/schemas'
import { useEffect } from 'react'

interface BackgroundJobsSidebarProps {
  isOpen: boolean
  onClose: () => void
  onLoadResponse?: (jobId: string, response: string) => void
  onCancelJob?: (jobId: string) => void
}

// Component for individual job polling
function BackgroundJobItem({ job, onLoadResponse, onCancelJob, updateJob, removeJob }: {
  job: BackgroundJob
  onLoadResponse?: (jobId: string, response: string) => void
  onCancelJob?: (jobId: string) => void
  updateJob: (jobId: string, updates: Partial<BackgroundJob>) => void
  removeJob: (jobId: string) => void
}) {
  // Use polling hook to check job status - continue polling until definitely complete or failed
  const shouldPoll = (job.status === 'running' || (job.status === 'failed' && !job.completedAt))
  
  const { data: statusData, error } = useBackgroundJobStatus(
    shouldPoll ? job : undefined,
    2000 // Poll every 2 seconds
  )

  // Update job when status changes
  useEffect(() => {
    if (statusData) {
      console.log('Polling data received:', statusData)
      console.log('Current job:', job)
      
      const needsUpdate = statusData.status !== job.status || 
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
      const responseContent = job.response || '[Job is still running - partial response will appear here]'
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
    <div className="border rounded-lg p-4 space-y-3 bg-card">
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
          onClick={handleLoadResponse}
          disabled={job.status === 'failed' && !job.response}
          className="flex-1"
          aria-label={`Load response for job ${job.id}`}
          title={job.status === 'running' && !job.response
            ? 'Load partial response (updates as job continues)' 
            : job.status === 'completed'
              ? 'Load completed response into chat'
              : job.response 
                ? 'Load response into chat'
                : job.status === 'failed'
                  ? 'No response available for failed job'
                  : 'Load current progress'
          }
        >
          <Play className="h-3 w-3 mr-1" />
          {job.status === 'running' && !job.response ? 'Load Progress' : 
           job.status === 'running' && job.response ? 'Load Partial' : 
           'Load Response'}
        </Button>

        {job.status === 'running' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelJob}
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
          onClick={handleDeleteJob}
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
  )
}

export function BackgroundJobsSidebar({
  isOpen,
  onClose,
  onLoadResponse,
  onCancelJob,
}: BackgroundJobsSidebarProps) {
  const { jobs, updateJob, removeJob } = useBackgroundJobs()
  const hasMounted = useHasMounted()


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
            <BackgroundJobItem
              key={job.id}
              job={job}
              onLoadResponse={onLoadResponse}
              onCancelJob={onCancelJob}
              updateJob={updateJob}
              removeJob={removeJob}
            />
          ))
        )}
      </div>
    </Sidebar>
  )
}