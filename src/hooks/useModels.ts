import { useQuery } from '@tanstack/react-query'
import type { Model } from 'openai/resources/models.mjs'

export function useModels() {
  return useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await fetch('/api/models')
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      return response.json()
    },
  })
}
