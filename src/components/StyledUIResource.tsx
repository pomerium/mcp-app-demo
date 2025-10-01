import { UIResourceRenderer } from '@mcp-ui/client'
import type { UIResource, UIAction } from '@/types/mcp'
import { useState } from 'react'
import { UIResourceError } from './UIResourceError'

export interface StyledUIResourceProps {
  resource: UIResource
  onUIAction?: (action: UIAction) => void
}

export function StyledUIResource({
  resource,
  onUIAction,
}: StyledUIResourceProps) {
  const [error, setError] = useState<Error | null>(null)

  const preferredSize = resource.uiMetadata?.['preferred-frame-size']
  const style = preferredSize
    ? ({
        '--preferred-width': preferredSize[0],
        '--preferred-height': preferredSize[1],
      } as React.CSSProperties)
    : {}

  const handleUIAction = (action: UIAction) => {
    // Validate action structure
    if (!action || action.type !== 'tool') {
      console.warn('Invalid UI action:', action)
      return
    }

    if (!action.payload?.toolName) {
      console.warn('Missing tool name in UI action')
      return
    }

    // Call tool through validated handler
    onUIAction?.(action)
  }

  if (error) {
    return <UIResourceError error={error} resource={resource} />
  }

  try {
    return (
      <div
        className="mcp-ui-resource"
        style={style}
        data-preferred-width={preferredSize?.[0]}
        data-preferred-height={preferredSize?.[1]}
      >
        <UIResourceRenderer
          resource={resource}
          onUIAction={handleUIAction}
          onError={setError}
        />
      </div>
    )
  } catch (err) {
    return (
      <UIResourceError
        error={err instanceof Error ? err : new Error(String(err))}
        resource={resource}
      />
    )
  }
}
