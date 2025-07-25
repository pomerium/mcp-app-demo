import OpenAI from 'openai'
import { jobStatusRequestSchema } from './schemas'

export interface BackgroundJobStatusResponse {
  status: 'running' | 'completed' | 'failed'
  response?: string
  error?: string
  completedAt?: string
}

export class BackgroundJobError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'BackgroundJobError'
  }
}

export async function handleJobStatusRequest(
  requestBody: unknown,
): Promise<BackgroundJobStatusResponse> {
  const result = jobStatusRequestSchema.safeParse(requestBody)

  if (!result.success) {
    throw new BackgroundJobError(
      400,
      JSON.stringify({ error: result.error.errors }),
    )
  }

  const { id } = result.data
  const client = new OpenAI()

  try {
    const response = await client.responses.retrieve(id)

    // Return response based on status
    if (response.status === 'completed') {
      return {
        status: 'completed',
        completedAt: new Date().toISOString(),
      }
    } else if (response.status === 'failed') {
      return {
        status: 'failed',
        error: 'Background job failed',
      }
    } else {
      // Still running, but may have partial content
      return {
        status: 'running',
      }
    }
  } catch (error) {
    console.error('Error retrieving OpenAI response:', error)

    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status || 500
      let clientMessage = 'Failed to check background job status'

      switch (statusCode) {
        case 404:
          clientMessage = 'Background job not found'
          break
        case 401:
          clientMessage = 'Authentication failed'
          break
        case 403:
          clientMessage = 'Access denied'
          break
        case 429:
          clientMessage = 'Rate limit exceeded'
          break
      }

      // Return 200 status with error in body for API errors
      return {
        status: 'failed',
        error: clientMessage,
      }
    }

    // Re-throw non-API errors as 500
    throw new BackgroundJobError(500, 'Internal server error')
  }
}
