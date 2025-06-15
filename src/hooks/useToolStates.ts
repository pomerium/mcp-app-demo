import { useState, useEffect } from 'react'

type ToolState = {
  enabled: boolean
  allow: 'approval' | 'unsupervised' | 'once'
}

type ToolStates = Record<string, ToolState>

export function useToolStates(serverId: string) {
  const [toolStates, setToolStates] = useState<ToolStates>({})

  // Load initial state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`tool-states-${serverId}`)
    if (stored) {
      try {
        setToolStates(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored tool states:', e)
      }
    }
  }, [serverId])

  // Update localStorage when toolStates change
  useEffect(() => {
    localStorage.setItem(`tool-states-${serverId}`, JSON.stringify(toolStates))
  }, [serverId, toolStates])

  const updateToolState = (toolName: string, state: Partial<ToolState>) => {
    setToolStates(prev => {
      const newState = {
        ...prev,
        [toolName]: {
          ...prev[toolName],
          ...state,
        }
      }

      // If allow is set to 'once', reset it to 'approval' after the state update
      if (state.allow === 'once') {
        setTimeout(() => {
          setToolStates(current => ({
            ...current,
            [toolName]: {
              ...current[toolName],
              allow: 'approval'
            }
          }))
        }, 0)
      }

      return newState
    })
  }

  return {
    toolStates,
    updateToolState,
  }
}