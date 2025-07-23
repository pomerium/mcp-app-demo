import { createServerFileRoute } from '@tanstack/react-start/server'
import { handleJobStatusRequest, BackgroundJobError } from '@/lib/background-jobs'

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
})
