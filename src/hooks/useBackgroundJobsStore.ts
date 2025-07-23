import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BackgroundJob } from '@/lib/schemas'
import { backgroundJobSchema } from '@/lib/schemas'

interface BackgroundJobsState {
  jobs: Record<string, BackgroundJob>
  addJob: (job: BackgroundJob) => void
  removeJob: (id: string) => void
  updateJob: (id: string, updates: Partial<BackgroundJob>) => void
  clearAllJobs: () => void
  initializeJobs: (jobs: Record<string, BackgroundJob>) => void
}

export const BACKGROUND_JOBS_STORAGE_KEY = 'background-jobs'

export const useBackgroundJobsStore = create<BackgroundJobsState>()(
  persist(
    (set) => ({
      jobs: {},
      addJob: (job: BackgroundJob) => {
        const validatedJob = backgroundJobSchema.parse(job)
        set((state) => ({
          jobs: { ...state.jobs, [validatedJob.id]: validatedJob },
        }))
      },
      removeJob: (id: string) => {
        if (!id || id.trim().length === 0) {
          throw new Error('Job ID is required')
        }
        set((state) => {
          const { [id]: _removed, ...rest } = state.jobs
          return { jobs: rest }
        })
      },
      updateJob: (id: string, updates: Partial<BackgroundJob>) => {
        if (!id || id.trim().length === 0) {
          throw new Error('Job ID is required')
        }
        set((state) => {
          if (!(id in state.jobs)) {
            return state
          }
          const updatedJob = { ...state.jobs[id], ...updates }
          const validatedJob = backgroundJobSchema.parse(updatedJob)
          return {
            jobs: {
              ...state.jobs,
              [id]: validatedJob,
            },
          }
        })
      },
      clearAllJobs: () => set({ jobs: {} }),
      initializeJobs: (jobs: Record<string, BackgroundJob>) => {
        // Validate all jobs before setting
        const validatedJobs: Record<string, BackgroundJob> = {}
        for (const [id, job] of Object.entries(jobs)) {
          validatedJobs[id] = backgroundJobSchema.parse(job)
        }
        set({ jobs: validatedJobs })
      },
    }),
    {
      name: BACKGROUND_JOBS_STORAGE_KEY,
    },
  ),
)
