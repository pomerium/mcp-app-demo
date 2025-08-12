import { useMemo } from 'react'
import { useBackgroundJobsStore } from './useBackgroundJobsStore'
import type { BackgroundJob } from '../lib/schemas'

interface UseBackgroundJobsReturn {
  jobs: Array<BackgroundJob>
  jobsMap: Record<string, BackgroundJob>
  addJob: (job: BackgroundJob) => void
  removeJob: (id: string) => void
  updateJob: (id: string, updates: Partial<BackgroundJob>) => void
  getJobById: (id: string) => BackgroundJob | undefined
  clearAllJobs: () => void
}

export const useBackgroundJobs = (): UseBackgroundJobsReturn => {
  const jobsMap = useBackgroundJobsStore((state) => state.jobs)
  const addJob = useBackgroundJobsStore((state) => state.addJob)
  const removeJob = useBackgroundJobsStore((state) => state.removeJob)
  const updateJob = useBackgroundJobsStore((state) => state.updateJob)
  const clearAllJobs = useBackgroundJobsStore((state) => state.clearAllJobs)

  const jobs = useMemo(() => Object.values(jobsMap).filter(Boolean), [jobsMap])

  const getJobById = (id: string) => {
    return jobsMap[id]
  }

  return {
    jobs,
    jobsMap,
    addJob,
    removeJob,
    updateJob,
    getJobById,
    clearAllJobs,
  }
}
