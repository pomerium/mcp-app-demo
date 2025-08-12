import { createServerFileRoute } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import {
  BackgroundJobError,
  handleJobStatusRequest,
} from '@/lib/background-jobs'
import { streamText } from '@/lib/streaming'

export const ServerRoute = createServerFileRoute(
  '/api/background-jobs',
).methods({
  async POST({ request }) {
    try {
      const body = await request.json()
      const result = await handleJobStatusRequest(body)

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Error in background jobs route:', error)

      if (error instanceof BackgroundJobError) {
        const responseBody = error.message.startsWith('{')
          ? error.message // Already JSON string for validation errors
          : JSON.stringify({ error: error.message })

        return new Response(responseBody, {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
  async GET({ request }) {
    const url = new URL(request.url)
    const backgroundJobId = url.searchParams.get('id')

    if (!backgroundJobId) {
      return new Response(
        JSON.stringify({ error: 'Background job ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const client = new OpenAI()

    try {
      const response = await client.responses.retrieve(backgroundJobId, {
        stream: true,
      })

      return streamText(response)
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

        return new Response(
          JSON.stringify({
            status: 'failed',
            error: clientMessage,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          status: 'failed',
          error: 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  },
})
