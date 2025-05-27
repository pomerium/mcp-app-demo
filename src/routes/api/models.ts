import { createAPIFileRoute } from '@tanstack/react-start/api'
import OpenAI from 'openai'

export const APIRoute = createAPIFileRoute('/api/models')({
  GET: async () => {
    try {
      const client = new OpenAI()
      const models = await client.models.list()

      return new Response(JSON.stringify(models.data), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Error fetching models:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
