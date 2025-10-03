import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBackgroundJobs } from './useBackgroundJobs'
import {
  BACKGROUND_JOBS_STORAGE_KEY,
  useBackgroundJobsStore,
} from './useBackgroundJobsStore'
import type { BackgroundJob } from '../lib/schemas'

describe('useBackgroundJobs', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useBackgroundJobs())
    act(() => {
      result.current.clearAllJobs()
    })
  })

  const createMockJob = (
    overrides: Partial<BackgroundJob> = {},
  ): BackgroundJob => ({
    id: 'resp_1234567890abcdef1234567890abcdef12345678',
    status: 'running',
    createdAt: '2025-01-01T00:00:00Z',
    title: 'Test Job',
    ...overrides,
  })

  describe('initialization and persistence', () => {
    it('should reset jobs using resetJobs()', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef12',
      })
      act(() => {
        result.current.addJob(job)
      })
      expect(result.current.jobs).toHaveLength(1)
      act(() => {
        result.current.clearAllJobs()
      })
      expect(result.current.jobs).toHaveLength(0)
      expect(result.current.jobsMap).toEqual({})
    })
    it('should start with empty jobs when no data in localStorage', () => {
      const { result } = renderHook(() => useBackgroundJobs())

      expect(result.current.jobs).toEqual([])
      expect(result.current.jobsMap).toEqual({})
    })

    it('should load existing jobs from localStorage', () => {
      const job1 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef11',
      })
      const job2 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef22',
        status: 'completed',
      })
      const storedData = { job1, job2 }

      // Initialize store with existing data using proper API
      useBackgroundJobsStore.getState().initializeJobs(storedData)

      const { result } = renderHook(() => useBackgroundJobs())

      expect(result.current.jobs).toHaveLength(2)
      expect(result.current.jobs).toContainEqual(job1)
      expect(result.current.jobs).toContainEqual(job2)
      expect(result.current.jobsMap).toEqual(storedData)
    })

    it('should persist jobs across hook instances', () => {
      const job = createMockJob()

      // First hook instance adds a job
      const { result: firstResult, unmount } = renderHook(() =>
        useBackgroundJobs(),
      )
      act(() => {
        firstResult.current.addJob(job)
      })
      unmount()

      // Second hook instance should load the persisted job
      const { result: secondResult } = renderHook(() => useBackgroundJobs())
      expect(secondResult.current.jobs).toContainEqual(job)
    })
  })

  describe('job management', () => {
    it('should add a job and make it available', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const newJob = createMockJob()

      act(() => {
        result.current.addJob(newJob)
      })

      expect(result.current.jobs).toContainEqual(newJob)
      expect(result.current.jobsMap[newJob.id]).toEqual(newJob)
      expect(result.current.getJobById(newJob.id)).toEqual(newJob)
    })

    it('should add multiple jobs', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job1 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef11',
        title: 'Job 1',
      })
      const job2 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef22',
        title: 'Job 2',
      })

      expect(result.current.jobs).toHaveLength(0)

      act(() => {
        result.current.addJob(job1)
      })

      expect(result.current.jobs).toHaveLength(1)
      expect(result.current.jobs).toContainEqual(job1)

      act(() => {
        result.current.addJob(job2)
      })

      expect(result.current.jobs).toHaveLength(2)
      expect(result.current.jobs).toContainEqual(job1)
      expect(result.current.jobs).toContainEqual(job2)
    })

    it('should overwrite job with same id', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const originalJob = createMockJob({ status: 'running' })
      const updatedJob = createMockJob({ status: 'completed' })

      act(() => {
        result.current.addJob(originalJob)
        result.current.addJob(updatedJob)
      })

      expect(result.current.jobs).toHaveLength(1)
      expect(result.current.getJobById(updatedJob.id)).toEqual(updatedJob)
      expect(result.current.getJobById(updatedJob.id)?.status).toBe('completed')
    })

    it('should remove a job by id', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job1 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef11',
      })
      const job2 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef22',
      })

      act(() => {
        result.current.addJob(job1)
        result.current.addJob(job2)
      })

      act(() => {
        result.current.removeJob(
          'resp_abcdef1234567890abcdef1234567890abcdef11',
        )
      })

      expect(result.current.jobs).toHaveLength(1)
      expect(result.current.jobs).toContainEqual(job2)
      expect(
        result.current.getJobById(
          'resp_abcdef1234567890abcdef1234567890abcdef11',
        ),
      ).toBeUndefined()
      expect(
        result.current.getJobById(
          'resp_abcdef1234567890abcdef1234567890abcdef22',
        ),
      ).toEqual(job2)
    })

    it('should handle removing non-existent job gracefully', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job = createMockJob()

      act(() => {
        result.current.addJob(job)
      })

      act(() => {
        result.current.removeJob('non-existent')
      })

      expect(result.current.jobs).toHaveLength(1)
      expect(result.current.jobs).toContainEqual(job)
    })

    it('should update existing job with partial data', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job = createMockJob({ status: 'running' })

      act(() => {
        result.current.addJob(job)
      })

      act(() => {
        result.current.updateJob(job.id, {
          status: 'completed',
          completedAt: '2025-01-01T01:00:00Z',
        })
      })

      const updatedJob = result.current.getJobById(job.id)
      expect(updatedJob?.status).toBe('completed')
      expect(updatedJob?.completedAt).toBe('2025-01-01T01:00:00Z')
      expect(updatedJob?.title).toBe(job.title) // Should preserve other fields
    })

    it('should handle updating non-existent job gracefully', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const existingJob = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef99',
      })

      act(() => {
        result.current.addJob(existingJob)
      })

      act(() => {
        result.current.updateJob('non-existent', { status: 'completed' })
      })

      // Should not affect existing jobs and should not create undefined entries
      expect(result.current.jobs).toHaveLength(1)
      expect(result.current.jobs).toContainEqual(existingJob)
      expect(result.current.getJobById('non-existent')).toBeUndefined()
    })

    it('should clear all jobs', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job1 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef11',
      })
      const job2 = createMockJob({
        id: 'resp_abcdef1234567890abcdef1234567890abcdef22',
      })

      act(() => {
        result.current.addJob(job1)
        result.current.addJob(job2)
      })

      act(() => {
        result.current.clearAllJobs()
      })

      expect(result.current.jobs).toHaveLength(0)
      expect(result.current.jobsMap).toEqual({})
    })
  })

  describe('real-world scenarios', () => {
    it('should handle complete job lifecycle with persistence', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const job = createMockJob()

      act(() => {
        result.current.addJob(job)
      })

      act(() => {
        result.current.updateJob(job.id, {
          status: 'completed',
          response: 'Job completed successfully',
          completedAt: '2025-01-01T01:00:00Z',
        })
      })

      const finalJob = result.current.getJobById(job.id)
      expect(finalJob?.status).toBe('completed')
      expect(finalJob?.response).toBe('Job completed successfully')
      expect(finalJob?.completedAt).toBe('2025-01-01T01:00:00Z')

      const storedData = JSON.parse(
        localStorage.getItem(BACKGROUND_JOBS_STORAGE_KEY) || '{}',
      )
      expect(storedData.state.jobs[job.id]).toEqual(finalJob)
    })

    it('should handle concurrent job operations', () => {
      const { result } = renderHook(() => useBackgroundJobs())
      const runningJob = createMockJob({
        id: 'resp_1111111111111111111111111111111111111111',
        status: 'running',
        title: 'Running Job',
      })
      const completedJob = createMockJob({
        id: 'resp_2222222222222222222222222222222222222222',
        status: 'completed',
        title: 'Completed Job',
      })
      const failedJob = createMockJob({
        id: 'resp_3333333333333333333333333333333333333333',
        status: 'failed',
        title: 'Failed Job',
      })

      expect(result.current.jobs).toHaveLength(0)
      // Zustand persist middleware always creates localStorage entry, so check it has empty jobs
      const storedData = JSON.parse(
        localStorage.getItem(BACKGROUND_JOBS_STORAGE_KEY) || '{}',
      )
      expect(storedData.state?.jobs).toEqual({})

      act(() => {
        result.current.addJob(runningJob)
      })
      expect(result.current.jobs).toHaveLength(1)

      act(() => {
        result.current.addJob(completedJob)
      })
      expect(result.current.jobs).toHaveLength(2)

      act(() => {
        result.current.addJob(failedJob)
      })

      expect(result.current.jobs).toHaveLength(3)

      act(() => {
        result.current.removeJob(
          'resp_2222222222222222222222222222222222222222',
        )
      })

      act(() => {
        result.current.updateJob(
          'resp_1111111111111111111111111111111111111111',
          {
            status: 'completed',
          },
        )
      })

      expect(result.current.jobs).toHaveLength(2)
      expect(
        result.current.getJobById(
          'resp_1111111111111111111111111111111111111111',
        )?.status,
      ).toBe('completed')
      expect(
        result.current.getJobById(
          'resp_2222222222222222222222222222222222222222',
        ),
      ).toBeUndefined()
      expect(
        result.current.getJobById(
          'resp_3333333333333333333333333333333333333333',
        ),
      ).toEqual(failedJob)
    })

    it('should maintain data integrity across browser sessions', () => {
      const job1 = createMockJob({
        id: 'resp_6880e725623081a1af3dc14ba0d562620d62da8686c56bdd',
        title: 'Session 1 Job',
      })
      const job2 = createMockJob({
        id: 'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2b3e1f4a6c8d',
        title: 'Session 2 Job',
      })

      const firstSessionResult = renderHook(() => useBackgroundJobs())

      expect(firstSessionResult.result.current.jobs).toHaveLength(0)
      // Zustand persist middleware always creates localStorage entry, so check it has empty jobs
      const initialStoredData = JSON.parse(
        localStorage.getItem(BACKGROUND_JOBS_STORAGE_KEY) || '{}',
      )
      expect(initialStoredData.state?.jobs).toEqual({})

      act(() => {
        firstSessionResult.result.current.addJob(job1)
      })
      expect(firstSessionResult.result.current.jobs).toHaveLength(1)

      act(() => {
        firstSessionResult.result.current.addJob(job2)
      })

      expect(firstSessionResult.result.current.jobs).toHaveLength(2)
      firstSessionResult.unmount()

      const secondSessionResult = renderHook(() => useBackgroundJobs())
      expect(secondSessionResult.result.current.jobs).toHaveLength(2)
      expect(
        secondSessionResult.result.current.getJobById(
          'resp_6880e725623081a1af3dc14ba0d562620d62da8686c56bdd',
        ),
      ).toEqual(job1)
      expect(
        secondSessionResult.result.current.getJobById(
          'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2b3e1f4a6c8d',
        ),
      ).toEqual(job2)

      act(() => {
        secondSessionResult.result.current.updateJob(
          'resp_6880e725623081a1af3dc14ba0d562620d62da8686c56bdd',
          {
            status: 'completed',
          },
        )
      })

      expect(
        secondSessionResult.result.current.getJobById(
          'resp_6880e725623081a1af3dc14ba0d562620d62da8686c56bdd',
        )?.status,
      ).toBe('completed')

      act(() => {
        secondSessionResult.result.current.removeJob(
          'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2b3e1f4a6c8d',
        )
      })

      expect(secondSessionResult.result.current.jobs).toHaveLength(1)
      expect(
        secondSessionResult.result.current.getJobById(
          'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2b3e1f4a6c8d',
        ),
      ).toBeUndefined()

      secondSessionResult.unmount()

      const thirdSessionResult = renderHook(() => useBackgroundJobs())
      expect(thirdSessionResult.result.current.jobs).toHaveLength(1)

      const persistedJob = thirdSessionResult.result.current.getJobById(
        'resp_6880e725623081a1af3dc14ba0d562620d62da8686c56bdd',
      )
      expect(persistedJob).toBeDefined()
      expect(persistedJob?.status).toBe('completed')
      expect(persistedJob?.title).toBe('Session 1 Job') // Should preserve other fields
      expect(
        thirdSessionResult.result.current.getJobById(
          'resp_7e2b1c8e9f4a3d2b6c1e8f7a9d4c3b2e1f6a8d7c2b3e1f4a6c8d',
        ),
      ).toBeUndefined()
      thirdSessionResult.unmount()
    })
  })
})
