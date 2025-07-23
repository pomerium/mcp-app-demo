import { Sidebar } from './ui/sidebar'
import { useHasMounted } from '@/hooks/useHasMounted'
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs'
import { Clock } from 'lucide-react'
import { BackgroundJobItem } from './BackgroundJobItem'

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
          <div
            className="text-center text-muted-foreground py-8"
            aria-live="polite"
          >
            <Clock
              className="h-8 w-8 mx-auto mb-2 opacity-50"
              aria-hidden="true"
            />
            <p>No background jobs</p>
          </div>
        ) : (
          <ul aria-label="Background jobs" className="grid gap-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <BackgroundJobItem
                  key={job.id}
                  job={job}
                  onLoadResponse={onLoadResponse}
                  onCancelJob={onCancelJob}
                  updateJob={updateJob}
                  removeJob={removeJob}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sidebar>
  )
}
