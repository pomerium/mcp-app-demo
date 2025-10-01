import { AlertCircle } from 'lucide-react'
import type { UIResource } from '@/types/mcp'

export interface UIResourceErrorProps {
  error: Error
  resource: UIResource
}

export function UIResourceError({ error, resource }: UIResourceErrorProps) {
  return (
    <div className="ui-resource-error flex gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-red-900 dark:text-red-100">
          Failed to load UI resource
        </p>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          {error.message}
        </p>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-red-600 dark:text-red-400 hover:underline">
            Debug Info
          </summary>
          <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded overflow-x-auto">
            {JSON.stringify(resource, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
