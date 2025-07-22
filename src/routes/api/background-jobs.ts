import { createServerFileRoute } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import { z } from 'zod'

// Request schema for checking job status
const jobStatusRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
})

export const ServerRoute = createServerFileRoute('/api/background-jobs').methods({
  async POST({ request }) {
    try {
      const body = await request.json()
      const result = jobStatusRequestSchema.safeParse(body)

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { requestId } = result.data
      const client = new OpenAI()

      try {
        // Retrieve the response from OpenAI
        const response = await client.responses.retrieve(requestId)
        
        // Check if the response is complete
        if (response.status === 'completed' && response.response) {
          // Extract the content from the response
          let content = ''
          
          if (response.response.body && Array.isArray(response.response.body)) {
            // Handle response body array
            content = response.response.body
              .filter(item => item.type === 'text')
              .map(item => item.text)
              .join('\n')
          } else if (response.response.output && Array.isArray(response.response.output)) {
            // Handle output array format
            content = response.response.output
              .filter(item => item.type === 'content' && item.content && Array.isArray(item.content))
              .flatMap(item => item.content)
              .filter(part => part.type === 'text')
              .map(part => part.text)
              .join('\n')
          }

          return new Response(
            JSON.stringify({
              status: 'completed',
              response: content,
              completedAt: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } else if (response.status === 'failed') {
          return new Response(
            JSON.stringify({
              status: 'failed',
              error: 'Background job failed',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } else {
          // Still running
          return new Response(
            JSON.stringify({
              status: 'running',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
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

          return new Response(
            JSON.stringify({
              status: 'failed',
              error: clientMessage,
            }),
            {
              status: 200, // Return 200 but indicate failure in the body
              headers: { 'Content-Type': 'application/json' },
            }
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
          }
        )
      }
    } catch (error) {
      console.error('Error in background jobs route:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
})