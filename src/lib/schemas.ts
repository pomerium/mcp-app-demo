import { z } from 'zod'

// Server status enum
export const ServerStatusEnum = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'error',
])

// Tool state schema
export const toolStateSchema = z.object({
  enabled: z.boolean(),
  allow: z.string(),
})

export const toolSchema = z.any()

// Pomerium MCP server info schema (from /.pomerium/mcp/routes)
export const pomeriumServerInfoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  url: z.string().url('Invalid server URL'),
  connected: z.boolean(),
  needs_oauth: z.boolean().optional(),
})

// Pomerium MCP routes response schema
export const pomeriumRoutesResponseSchema = z.object({
  servers: z.array(pomeriumServerInfoSchema),
})

// Server schema (local state)
export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  url: z.string().url('Invalid server URL'),
  status: ServerStatusEnum,
  connected: z.boolean().default(false),
  needs_oauth: z.boolean().optional(),
  tools: z.record(toolStateSchema).optional(),
  toolStates: z.record(toolStateSchema).optional(),
})

// Servers record schema
export const serversSchema = z.record(serverSchema)

// Message part schema
export const messagePartSchema = z.object({
  type: z.string(),
  text: z.string(),
})

// Message schema
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  parts: z.array(messagePartSchema).optional(),
})

// Request body schema
export const chatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(messageSchema),
  servers: serversSchema,
  model: z.string(),
  userId: z.string(),
})

// Disconnect request schema
export const disconnectRequestSchema = z.object({
  routes: z.array(z.string().url('Invalid route URL')),
})

// Disconnect response schema (same format as routes response)
export const disconnectResponseSchema = z.object({
  servers: z.array(pomeriumServerInfoSchema),
})

// Types
export type PomeriumServerInfo = z.infer<typeof pomeriumServerInfoSchema>
export type PomeriumRoutesResponse = z.infer<
  typeof pomeriumRoutesResponseSchema
>
export type DisconnectRequest = z.infer<typeof disconnectRequestSchema>
export type DisconnectResponse = z.infer<typeof disconnectResponseSchema>
export type Server = z.infer<typeof serverSchema>
export type Servers = z.infer<typeof serversSchema>
export type ToolState = z.infer<typeof toolStateSchema>

// Tool item type for MCP tools
export type ToolItem = {
  name?: string
  description?: string
  [key: string]: unknown
}

export const allowOptions = {
  ask: {
    label: 'Always ask permission',
    description: 'Your approval is required every time',
  },
  unsupervised: {
    label: 'Allow unsupervised',
    description: 'Your approval is not required',
  },
} as const
