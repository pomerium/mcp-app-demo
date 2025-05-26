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
})

// Get tools request schema
export const getToolsSchema = z.object({
  url: z.string().url('Invalid URL format'),
})

// Server form schema
export const serverFormSchema = z.object({
  name: z.string(),
  url: z.string().url('Invalid server URL'),
})

// Types
export type Server = z.infer<typeof serverSchema>
export type Servers = z.infer<typeof serversSchema>
export type ServerFormData = z.infer<typeof serverFormSchema>
