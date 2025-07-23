import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { BackgroundJob } from '../lib/schemas'

const STORAGE_KEY = 'background-jobs'

interface UseBackgroundJobsReturn {
  jobs: BackgroundJob[]
  jobsMap: Record<string, BackgroundJob>
  addJob: (job: BackgroundJob) => void
  removeJob: (id: string) => void
  updateJob: (id: string, updates: Partial<BackgroundJob>) => void
  getJobById: (id: string) => BackgroundJob | undefined
  clearAllJobs: () => void
}

export const useBackgroundJobs = (): UseBackgroundJobsReturn => {
  const [jobsMap, setJobsMap] = useLocalStorage<Record<string, BackgroundJob>>(
    STORAGE_KEY,
    {},
  )

  const jobs = useMemo(() => Object.values(jobsMap).filter(Boolean), [jobsMap])

  const addJob = useCallback(
    (job: BackgroundJob) => {
      setJobsMap((prev) => ({
        ...prev,
        [job.id]: job,
      }))
    },
    [setJobsMap],
  )

  const removeJob = useCallback(
    (id: string) => {
      setJobsMap((prev) => {
        const { [id]: removed, ...rest } = prev
        return rest
      })
    },
    [setJobsMap],
  )

  const updateJob = useCallback(
    (id: string, updates: Partial<BackgroundJob>) => {
      setJobsMap((prev) => {
        if (!prev[id]) {
          return prev
        }
        return {
          ...prev,
          [id]: { ...prev[id], ...updates },
        }
      })
    },
    [setJobsMap],
  )

  const getJobById = useCallback(
    (id: string) => {
      return jobsMap[id]
    },
    [jobsMap],
  )

  const clearAllJobs = useCallback(() => {
    setJobsMap({})
  }, [setJobsMap])

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
