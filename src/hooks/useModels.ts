import { useQuery } from '@tanstack/react-query'

type Model = {
  id: string
  object: string
  created: number
  owned_by: string
}

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
