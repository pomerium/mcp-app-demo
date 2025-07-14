---
title: 'Validation with Zod'
filePattern: '**/*.{ts,tsx}'
enabled: true
description: 'Runtime validation and type safety guidelines using Zod'
---

You are an expert in Zod validation and TypeScript integration.

## Schema Organization

• Define all Zod schemas in `src/lib/schemas.ts` for centralized management
• Reuse schemas across the application to maintain consistency
• Use descriptive names for schemas that clearly indicate their purpose
• Group related schemas together with appropriate comments
• Export both schemas and inferred types for easy consumption

```typescript
// ✅ Good: Centralized schema organization in src/lib/schemas.ts
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
})

export const createUserSchema = userSchema.omit({ id: true })

// Export inferred types
export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
```

## TypeScript Integration

• Leverage Zod's TypeScript integration with `z.infer<typeof schema>` for type definitions
• Use schemas as the single source of truth for both runtime validation and compile-time types
• Avoid duplicating type definitions - derive TypeScript types from Zod schemas
• Use `z.input<typeof schema>` and `z.output<typeof schema>` when dealing with transformations

### Type Derivation Patterns

• Always derive TypeScript types from Zod schemas for consistency
• Use schema composition to build complex types from simpler ones
• Leverage utility schemas for common patterns (IDs, dates, etc.)

```typescript
// ✅ Good: Types derived from schemas
const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  createdAt: z.string().datetime(),
})

// Derive the type from the schema
export type User = z.infer<typeof userSchema>

// ❌ Avoid: Duplicate type definitions
interface User {
  id: string
  name: string
  email?: string
  createdAt: string
}
```

## Validation Patterns

• Validate API inputs at route handlers and middleware level
• Validate form data before processing or submission
• Validate external data sources (APIs, file uploads, user input)
• Use `.safeParse()` for validation with error handling
• Use `.parse()` only when you're certain the data is valid
• Always validate external data - never trust API responses or user inputs

### Comprehensive Validation Examples

```typescript
// ✅ Good: Route handler validation
export const Route = createServerFileRoute('/api/users').methods({
  async POST({ request }) {
    const body = await request.json()
    const result = createUserSchema.safeParse(body)

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: result.error.flatten(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const user = await createUser(result.data)
    return new Response(JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
})

// ✅ Good: External API validation
async function fetchUserFromAPI(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  const data = await response.json()

  // Always validate external API responses
  const result = userSchema.safeParse(data)
  if (!result.success) {
    throw new Error(`Invalid user data from API: ${result.error.message}`)
  }

  return result.data
}
```

## Error Handling

• Provide meaningful error messages for validation failures
• Use Zod's built-in error formatting or create custom error formatters
• Handle validation errors gracefully in the UI
• Log validation errors appropriately for debugging

## Schema Best Practices

• Use appropriate Zod validators for each data type
• Add `.describe()` to schemas for better error messages and documentation
• Use `.refine()` for custom validation logic
• Implement proper optional and default value handling with `.optional()` and `.default()`
