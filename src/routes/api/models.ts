import { createServerFileRoute } from '@tanstack/react-start/server'
import OpenAI from 'openai'

const SUPPORTED_MODEL_PREFIXES = [
  'gpt-4o',
  'chatgpt-4o',
  'gpt-4.1',
  'o1',
  'o3',
  'o4-mini',
]

function isSupportedModel(id: string) {
  return SUPPORTED_MODEL_PREFIXES.some((prefix) => id.startsWith(prefix))
}

export const ServerRoute = createServerFileRoute('/api/models').methods({
  async GET() {
    try {
      const client = new OpenAI()
      const models = await client.models.list()
      const filtered = models.data
        .filter((model) => isSupportedModel(model.id))
        .sort((a, b) => a.id.localeCompare(b.id))
      return new Response(JSON.stringify(filtered), {
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
