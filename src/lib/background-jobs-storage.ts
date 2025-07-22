import type { BackgroundJob } from './schemas'

const STORAGE_KEY = 'background-jobs'

export const addBackgroundJob = (job: BackgroundJob): void => {
  const jobs = getBackgroundJobs()
  const updatedJobs = [...jobs, job]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJobs))
}

export const removeBackgroundJob = (id: string): void => {
  const jobs = getBackgroundJobs()
  const updatedJobs = jobs.filter((job) => job.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJobs))
}

export const updateBackgroundJob = (
  id: string,
  updates: Partial<BackgroundJob>,
): void => {
  const jobs = getBackgroundJobs()
  const updatedJobs = jobs.map((job) =>
    job.id === id ? { ...job, ...updates } : job,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJobs))
}

export const getBackgroundJobs = (): BackgroundJob[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading background jobs from localStorage:', error)
    return []
  }
}

export const getBackgroundJobById = (id: string): BackgroundJob | undefined => {
  const jobs = getBackgroundJobs()
  return jobs.find((job) => job.id === id)
}

export const clearAllBackgroundJobs = (): void => {
  localStorage.removeItem(STORAGE_KEY)
}