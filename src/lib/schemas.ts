import { z } from 'zod'

// Server status enum
export const ServerStatusEnum = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'error',
])

// Server schema
export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url('Invalid server URL'),
  status: ServerStatusEnum,
  tools: z.record(z.any()).optional(),
  toolStates: z
    .record(z.object({ enabled: z.boolean(), allow: z.string() }))
    .optional(),
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
})

// Get tools request schema
export const getToolsSchema = z.object({
  url: z.string().url('Invalid URL format'),
  name: z.string(),
})

// Server form schema
export const serverFormSchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      'Name must start with a letter and can only contain letters, numbers, dashes, and underscores',
    ),
  url: z.string().url('Invalid server URL'),
})

// Types
export type Server = z.infer<typeof serverSchema>
export type Servers = z.infer<typeof serversSchema>
export type ServerFormData = z.infer<typeof serverFormSchema>

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
