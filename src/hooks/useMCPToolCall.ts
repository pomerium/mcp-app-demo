import { useState, useCallback } from 'react'

export interface ToolCallParams {
  serverLabel: string
  toolName: string
  params: Record<string, unknown>
}

export interface UseMCPToolCallReturn {
  callTool: (
    toolName: string,
    params: Record<string, unknown>,
  ) => Promise<void>
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for calling MCP tools from UI components
 * This integrates with the existing chat flow by sending tool call messages
 */
export function useMCPToolCall(
  serverLabel: string,
  onToolCall?: (toolName: string, params: Record<string, unknown>) => void,
): UseMCPToolCallReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const callTool = useCallback(
    async (toolName: string, params: Record<string, unknown>) => {
      setIsLoading(true)
      setError(null)

      try {
        // Validate input
        if (!toolName || typeof toolName !== 'string') {
          throw new Error('Invalid tool name')
        }

        if (!params || typeof params !== 'object') {
          throw new Error('Invalid parameters')
        }

        // Call the provided callback if available
        // This allows the parent component to handle the tool call
        // (e.g., by adding it to the chat message stream)
        if (onToolCall) {
          onToolCall(toolName, params)
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        console.error('Tool call failed:', errorObj)
        throw errorObj
      } finally {
        setIsLoading(false)
      }
    },
    [serverLabel, onToolCall],
  )

  return { callTool, isLoading, error }
}
