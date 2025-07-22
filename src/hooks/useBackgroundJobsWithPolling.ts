import { useBackgroundJobs } from './useBackgroundJobs'

/**
 * Temporarily simplified - just return the basic hook to debug infinite re-renders
 */
export const useBackgroundJobsWithPolling = (refetchInterval?: number) => {
  return useBackgroundJobs()
}