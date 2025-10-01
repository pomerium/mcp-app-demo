export interface UIAction {
  type: 'tool'
  payload: {
    toolName: string
    params: Record<string, unknown>
  }
}

export interface UIResource {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
  metadata?: Record<string, unknown>
  uiMetadata?: {
    'preferred-frame-size'?: [string, string]
    'initial-render-data'?: unknown
  }
}

export interface ResourceContent {
  type: 'resource'
  resource: UIResource
}

export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export type Content = TextContent | ImageContent | ResourceContent
