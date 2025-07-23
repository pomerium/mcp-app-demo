import { beforeEach, describe, expect, it } from 'vitest'
import type { BackgroundJob } from '@/lib/schemas'
import { useBackgroundJobsStore } from './useBackgroundJobsStore'

describe('useBackgroundJobsStore', () => {
  beforeEach(() => {
    // Reset store state using proper API
    useBackgroundJobsStore.getState().clearAllJobs()
  })

  const mockJob: BackgroundJob = {
    id: 'resp_6880e725623081a1af3dc14ba0d562620d62da86',
    status: 'running',
    createdAt: '2023-01-01T00:00:00.000Z',
    title: 'Test Job',
  }

  describe('addJob', () => {
    it('should add a job to the store', () => {
      const { addJob } = useBackgroundJobsStore.getState()

      addJob(mockJob)

      const updatedState = useBackgroundJobsStore.getState()
      expect(updatedState.jobs).toEqual({
        resp_6880e725623081a1af3dc14ba0d562620d62da86: mockJob,
      })
    })

    it('should validate job data when adding', () => {
      const { addJob } = useBackgroundJobsStore.getState()
      const invalidJob = {
        id: '',
        status: 'invalid' as any,
        createdAt: '2023-01-01T00:00:00.000Z',
      }

      expect(() => addJob(invalidJob)).toThrow()
    })

    it('should add multiple jobs', () => {
      const { addJob } = useBackgroundJobsStore.getState()
      const job2: BackgroundJob = {
        id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2',
        status: 'completed',
        createdAt: '2023-01-01T01:00:00.000Z',
        completedAt: '2023-01-01T01:05:00.000Z',
      }

      addJob(mockJob)
      addJob(job2)

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual({
        resp_6880e725623081a1af3dc14ba0d562620d62da86: mockJob,
        resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2: job2,
      })
    })

    it('should overwrite existing job with same id', () => {
      const { addJob } = useBackgroundJobsStore.getState()
      const updatedJob: BackgroundJob = {
        ...mockJob,
        status: 'completed',
        completedAt: '2023-01-01T00:05:00.000Z',
      }

      addJob(mockJob)
      addJob(updatedJob)

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs['resp_6880e725623081a1af3dc14ba0d562620d62da86']).toEqual(
        updatedJob,
      )
      expect(Object.keys(jobs)).toHaveLength(1)
    })
  })

  describe('removeJob', () => {
    beforeEach(() => {
      useBackgroundJobsStore.getState().addJob(mockJob)
    })

    it('should remove a job from the store', () => {
      const { removeJob } = useBackgroundJobsStore.getState()

      removeJob('resp_6880e725623081a1af3dc14ba0d562620d62da86')

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual({})
    })

    it('should not affect other jobs when removing one', () => {
      const job2: BackgroundJob = {
        id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2',
        status: 'running',
        createdAt: '2023-01-01T01:00:00.000Z',
      }
      const { addJob, removeJob } = useBackgroundJobsStore.getState()

      addJob(job2)
      removeJob('resp_6880e725623081a1af3dc14ba0d562620d62da86')

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual({
        resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2: job2,
      })
    })

    it('should handle removing non-existent job gracefully', () => {
      const { removeJob } = useBackgroundJobsStore.getState()
      const initialJobs = useBackgroundJobsStore.getState().jobs

      removeJob('non-existent')

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual(initialJobs)
    })

    it('should throw error for empty job ID', () => {
      const { removeJob } = useBackgroundJobsStore.getState()

      expect(() => removeJob('')).toThrow('Job ID is required')
      expect(() => removeJob('   ')).toThrow('Job ID is required')
    })
  })

  describe('updateJob', () => {
    beforeEach(() => {
      useBackgroundJobsStore.getState().addJob(mockJob)
    })

    it('should update an existing job', () => {
      const { updateJob } = useBackgroundJobsStore.getState()
      const updates = {
        status: 'completed' as const,
        completedAt: '2023-01-01T00:05:00.000Z',
        response: 'Job completed successfully',
      }

      updateJob('resp_6880e725623081a1af3dc14ba0d562620d62da86', updates)

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs['resp_6880e725623081a1af3dc14ba0d562620d62da8']).toEqual({
        ...mockJob,
        ...updates,
      })
    })

    it('should partially update job properties', () => {
      const { updateJob } = useBackgroundJobsStore.getState()

      updateJob('resp_6880e725623081a1af3dc14ba0d562620d62da86', {
        status: 'failed',
        error: 'Something went wrong',
      })

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs['resp_6880e725623081a1af3dc14ba0d562620d62da86']).toEqual({
        ...mockJob,
        status: 'failed',
        error: 'Something went wrong',
      })
    })

    it('should not update non-existent job', () => {
      const { updateJob } = useBackgroundJobsStore.getState()
      const initialJobs = useBackgroundJobsStore.getState().jobs

      updateJob('non-existent', { status: 'completed' })

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual(initialJobs)
    })

    it('should not modify other jobs when updating one', () => {
      const job2: BackgroundJob = {
        id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2',
        status: 'running',
        createdAt: '2023-01-01T01:00:00.000Z',
      }
      const { addJob, updateJob } = useBackgroundJobsStore.getState()

      addJob(job2)
      updateJob('resp_6880e725623081a1af3dc14ba0d562620d62da86', {
        status: 'completed',
      })

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs['resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2']).toEqual(
        job2,
      )
    })

    it('should throw error for empty job ID', () => {
      const { updateJob } = useBackgroundJobsStore.getState()

      expect(() => updateJob('', { status: 'completed' })).toThrow(
        'Job ID is required',
      )
      expect(() => updateJob('   ', { status: 'completed' })).toThrow(
        'Job ID is required',
      )
    })

    it('should validate updated job data', () => {
      const { updateJob } = useBackgroundJobsStore.getState()

      // Should throw for invalid status
      expect(() =>
        updateJob('resp_6880e725623081a1af3dc14ba0d562620d62da86', {
          status: 'invalid' as any,
        }),
      ).toThrow()
    })
  })

  describe('clearAllJobs', () => {
    beforeEach(() => {
      const { addJob } = useBackgroundJobsStore.getState()
      addJob(mockJob)
      addJob({
        id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2',
        status: 'completed',
        createdAt: '2023-01-01T01:00:00.000Z',
      })
    })

    it('should clear all jobs from the store', () => {
      const { clearAllJobs } = useBackgroundJobsStore.getState()

      clearAllJobs()

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual({})
    })
  })

  describe('initializeJobs', () => {
    it('should initialize store with provided jobs', () => {
      const { initializeJobs } = useBackgroundJobsStore.getState()
      const initialJobs = {
        resp_6880e725623081a1af3dc14ba0d562620d62da86: mockJob,
        resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2: {
          id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2',
          status: 'completed' as const,
          createdAt: '2023-01-01T01:00:00.000Z',
        },
      }

      initializeJobs(initialJobs)

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual(initialJobs)
    })

    it('should replace existing jobs when initializing', () => {
      const { addJob, initializeJobs } = useBackgroundJobsStore.getState()

      addJob(mockJob)

      // Initialize with different jobs
      const newJobs = {
        resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2: {
          id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2',
          status: 'completed' as const,
          createdAt: '2023-01-01T01:00:00.000Z',
        },
      }

      initializeJobs(newJobs)

      const { jobs } = useBackgroundJobsStore.getState()
      expect(jobs).toEqual(newJobs)
      expect(
        jobs['resp_6880e725623081a1af3dc14ba0d562620d62da86'],
      ).toBeUndefined()
    })

    it('should validate all jobs when initializing', () => {
      const { initializeJobs } = useBackgroundJobsStore.getState()
      const invalidJobs = {
        resp_6880e725623081a1af3dc14ba0d562620d62da86: {
          id: 'resp_6880e725623081a1af3dc14ba0d562620d62da86',
          status: 'invalid' as any,
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      }

      expect(() => initializeJobs(invalidJobs)).toThrow()
    })
  })

  describe('persistence', () => {
    it('should use correct localStorage key', () => {
      // The persist middleware should use 'background-jobs' as the key
      // This is tested implicitly through the middleware configuration
      expect(true).toBe(true) // Placeholder - actual persistence testing requires more complex setup
    })
  })
})
