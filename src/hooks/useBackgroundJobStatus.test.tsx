import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBackgroundJobStatus } from './useBackgroundJobStatus'
import { getTimestamp } from '@/lib/utils/date'

describe('useBackgroundJobStatus', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchInterval: false, // Disable polling for simpler tests
        },
      },
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('when job is running', () => {
    it('fetches job status and returns data', async () => {
      const job = {
        id: 'job-1',
        status: 'running' as const,
        createdAt: getTimestamp(),
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'completed', response: 'Success!' }),
      })

      const { result } = renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toEqual({
          status: 'completed',
          response: 'Success!',
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/background-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'job-1' }),
      })
    })

    it('handles different status responses', async () => {
      const job = {
        id: 'job-2',
        status: 'running' as const,
        createdAt: getTimestamp(),
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'failed',
          error: 'Something went wrong',
        }),
      })

      const { result } = renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data?.status).toBe('failed')
        expect(result.current.data?.error).toBe('Something went wrong')
      })
    })
  })

  describe('when job is completed', () => {
    it('does not fetch job status', () => {
      const job = {
        id: 'job-3',
        status: 'completed' as const,
        createdAt: getTimestamp(),
      }

      const { result } = renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('when job is failed', () => {
    it('does not fetch job status', () => {
      const job = {
        id: 'job-4',
        status: 'failed' as const,
        createdAt: getTimestamp(),
      }

      const { result } = renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('when job is undefined', () => {
    it('does not fetch and returns undefined', () => {
      const { result } = renderHook(() => useBackgroundJobStatus(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    const createErrorWrapper = () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchInterval: false,
          },
        },
      })
      return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    it('handles HTTP 404 errors without retrying', async () => {
      const job = {
        id: 'job-5',
        status: 'running' as const,
        createdAt: getTimestamp(),
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const { result } = renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createErrorWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('404')
      // Should only be called once (no retries for 4xx errors)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('calls fetch with correct parameters for error scenarios', async () => {
      const job = {
        id: 'job-6',
        status: 'running' as const,
        createdAt: getTimestamp(),
      }

      mockFetch.mockRejectedValue(new Error('Network error'))

      renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createErrorWrapper(),
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/background-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'job-6' }),
        })
      })
    })

    it('calls fetch for HTTP error responses', async () => {
      const job = {
        id: 'job-7',
        status: 'running' as const,
        createdAt: getTimestamp(),
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      renderHook(() => useBackgroundJobStatus(job), {
        wrapper: createErrorWrapper(),
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/background-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'job-7' }),
        })
      })
    })
  })
})
