import { createServerFileRoute } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import { createLogger } from '../../lib/logger'

const log = createLogger('api-models')

const SUPPORTED_MODEL_PREFIXES = [
  'gpt-5',
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
      log.error(
        {
          err: error,
          operation: 'fetch-models',
        },
        'Error fetching models',
      )
      return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
