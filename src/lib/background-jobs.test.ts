import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import OpenAI from 'openai'
import { handleJobStatusRequest, BackgroundJobError } from './background-jobs'

// Mock OpenAI
vi.mock('openai')

describe('handleJobStatusRequest', () => {
  let mockOpenAI: {
    responses: {
      retrieve: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    mockOpenAI = {
      responses: {
        retrieve: vi.fn(),
      },
    }
    
    vi.mocked(OpenAI).mockImplementation(() => mockOpenAI as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('input validation', () => {
    it('throws BackgroundJobError for missing request body', async () => {
      await expect(handleJobStatusRequest({})).rejects.toThrow(BackgroundJobError)
      
      try {
        await handleJobStatusRequest({})
      } catch (error) {
        expect(error).toBeInstanceOf(BackgroundJobError)
        expect(error.statusCode).toBe(400)
      }
    })

    it('throws BackgroundJobError for invalid id field', async () => {
      await expect(handleJobStatusRequest({ id: '' })).rejects.toThrow(BackgroundJobError)
      
      try {
        await handleJobStatusRequest({ id: '' })
      } catch (error) {
        expect(error).toBeInstanceOf(BackgroundJobError)
        expect(error.statusCode).toBe(400)
      }
    })

    it('accepts valid request with id', async () => {
      mockOpenAI.responses.retrieve.mockResolvedValue({
        status: 'running',
      })

      const result = await handleJobStatusRequest({ id: 'valid-job-id' })

      expect(result.status).toBe('running')
      expect(mockOpenAI.responses.retrieve).toHaveBeenCalledWith('valid-job-id')
    })
  })

  describe('OpenAI integration', () => {
    it('returns completed status when OpenAI response is completed', async () => {
      mockOpenAI.responses.retrieve.mockResolvedValue({
        status: 'completed',
      })

      const result = await handleJobStatusRequest({ id: 'completed-job' })

      expect(result.status).toBe('completed')
      expect(result).toHaveProperty('completedAt')
      expect(typeof result.completedAt).toBe('string')
    })

    it('returns failed status when OpenAI response is failed', async () => {
      mockOpenAI.responses.retrieve.mockResolvedValue({
        status: 'failed',
      })

      const result = await handleJobStatusRequest({ id: 'failed-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Background job failed')
    })

    it('returns running status when OpenAI response is in progress', async () => {
      mockOpenAI.responses.retrieve.mockResolvedValue({
        status: 'in_progress',
      })

      const result = await handleJobStatusRequest({ id: 'running-job' })

      expect(result.status).toBe('running')
    })

    it('returns running status for any non-completed/failed status', async () => {
      mockOpenAI.responses.retrieve.mockResolvedValue({
        status: 'queued',
      })

      const result = await handleJobStatusRequest({ id: 'queued-job' })

      expect(result.status).toBe('running')
    })
  })

  describe('OpenAI error handling', () => {
    it('handles 404 errors with user-friendly message', async () => {
      const apiError = new OpenAI.APIError(
        404,
        { message: 'Not found' },
        'Not found',
        {}
      )
      apiError.status = 404
      mockOpenAI.responses.retrieve.mockRejectedValue(apiError)

      const result = await handleJobStatusRequest({ id: 'missing-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Background job not found')
    })

    it('handles 401 errors with authentication message', async () => {
      const apiError = new OpenAI.APIError(
        401,
        { message: 'Unauthorized' },
        'Unauthorized',
        {}
      )
      apiError.status = 401
      mockOpenAI.responses.retrieve.mockRejectedValue(apiError)

      const result = await handleJobStatusRequest({ id: 'unauthorized-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Authentication failed')
    })

    it('handles 403 errors with access denied message', async () => {
      const apiError = new OpenAI.APIError(
        403,
        { message: 'Forbidden' },
        'Forbidden',
        {}
      )
      apiError.status = 403
      mockOpenAI.responses.retrieve.mockRejectedValue(apiError)

      const result = await handleJobStatusRequest({ id: 'forbidden-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Access denied')
    })

    it('handles 429 rate limit errors', async () => {
      const apiError = new OpenAI.APIError(
        429,
        { message: 'Rate limit exceeded' },
        'Rate limit exceeded',
        {}
      )
      apiError.status = 429
      mockOpenAI.responses.retrieve.mockRejectedValue(apiError)

      const result = await handleJobStatusRequest({ id: 'rate-limited-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('handles generic API errors with default message', async () => {
      const apiError = new OpenAI.APIError(
        502,
        { message: 'Bad gateway' },
        'Bad gateway',
        {}
      )
      mockOpenAI.responses.retrieve.mockRejectedValue(apiError)

      const result = await handleJobStatusRequest({ id: 'server-error-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Failed to check background job status')
    })

    it('handles API errors without status code', async () => {
      const apiError = new OpenAI.APIError(
        undefined,
        { message: 'Unknown error' },
        'Unknown error',
        {}
      )
      apiError.status = undefined
      mockOpenAI.responses.retrieve.mockRejectedValue(apiError)

      const result = await handleJobStatusRequest({ id: 'unknown-error-job' })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Failed to check background job status')
    })
  })

  describe('network and generic error handling', () => {
    it('throws BackgroundJobError for network errors', async () => {
      const networkError = new Error('Network connection failed')
      mockOpenAI.responses.retrieve.mockRejectedValue(networkError)

      await expect(handleJobStatusRequest({ id: 'network-error-job' })).rejects.toThrow(BackgroundJobError)
      
      try {
        await handleJobStatusRequest({ id: 'network-error-job' })
      } catch (error) {
        expect(error).toBeInstanceOf(BackgroundJobError)
        expect(error.statusCode).toBe(500)
        expect(error.message).toBe('Internal server error')
      }
    })

    it('throws BackgroundJobError for malformed request body', async () => {
      // Simulate malformed JSON by passing invalid data that would cause parsing error
      await expect(handleJobStatusRequest('{ invalid json')).rejects.toThrow(BackgroundJobError)
      
      try {
        await handleJobStatusRequest('{ invalid json')
      } catch (error) {
        expect(error).toBeInstanceOf(BackgroundJobError)
        expect(error.statusCode).toBe(400)
      }
    })
  })

  describe('response format validation', () => {
    it('includes completedAt timestamp for completed jobs', async () => {
      mockOpenAI.responses.retrieve.mockResolvedValue({
        status: 'completed',
      })

      const beforeTime = new Date().toISOString()
      const result = await handleJobStatusRequest({ id: 'timestamp-test' })

      expect(result).toHaveProperty('completedAt')
      expect(new Date(result.completedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      )
    })
  })
})