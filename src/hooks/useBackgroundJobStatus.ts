import { useQuery } from '@tanstack/react-query'
import type { BackgroundJob } from '../lib/schemas'

interface BackgroundJobStatusResponse {
  status: 'running' | 'completed' | 'failed'
  response?: string
  error?: string
  completedAt?: string
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

const fetchJobStatus = async (
  id: string,
): Promise<BackgroundJobStatusResponse> => {
  const response = await fetch('/api/background-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  if (!response.ok) {
    throw new HttpError(
      response.status,
      `Failed to fetch job status: ${response.status}`,
    )
  }

  return response.json()
}

export const useBackgroundJobStatus = (
  job: BackgroundJob | undefined,
  refetchInterval: number = 2000,
) => {
  return useQuery({
    queryKey: ['backgroundJobStatus', job?.id],
    queryFn: () => {
      if (!job?.id) {
        throw new Error('No request ID available')
      }
      return fetchJobStatus(job.id)
    },
    enabled:
      !!job?.id &&
      (job.status === 'running' ||
        (job.status === 'failed' && !job.completedAt)),
    refetchInterval,
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (
        error instanceof HttpError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return false
      }
      // Retry network errors and 5xx errors up to 3 times
      return failureCount < 3
    },
    retryDelay: 1000,
  })
}
