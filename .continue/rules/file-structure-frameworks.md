---
title: 'File Structure and Frameworks'
filePattern: '**/*.{ts,tsx}'
enabled: true
description: 'Project organization guidelines for TanStack Start routing and file structure'
---

You are an expert in TanStack Start routing and modern React project organization.

## TanStack Start Routing

• Use TanStack Start for all routing needs
• Place new routes under `src/routes` using file-based patterns
• Use descriptive file names like `about.tsx` for static routes
• Use bracket notation like `[id].tsx` for dynamic routes
• Use `_layout.tsx` files for shared layouts across route groups

## Route File Structure and Patterns

• Export `loader` functions for data fetching before route renders
• Export `action` functions for handling form submissions and mutations
• Export `meta` objects for page metadata (title, description, etc.)
• Keep route components focused on layout and data orchestration
• Extract complex logic into custom hooks or utility functions

### Loader and Action Typing

• Always type loader and action returns explicitly for better type safety
• Use Zod schemas for validating loader parameters and action inputs
• Leverage `useLoaderData()` with proper typing for accessing loader data

```typescript
// ✅ Good: Properly typed loader with validation
export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }): Promise<User> => {
    const userIdSchema = z.object({ id: z.string() })
    const { id } = userIdSchema.parse(params)
    return fetchUser(id)
  },
  component: UserDetail,
})

function UserDetail() {
  const user = Route.useLoaderData() // Automatically typed as User
  return <div>{user.name}</div>
}
```

### Loader-First Data Flow

• Prefer loaders over React Query for initial page data to avoid redundant fetching
• Use React Query only for data that needs frequent updates or client-side caching
• Implement loader-first pattern to ensure data is available before component renders

```typescript
// ✅ Good: Loader-first approach
export const Route = createFileRoute('/dashboard')({
  loader: async (): Promise<DashboardData> => {
    // Fetch initial data in loader
    return {
      user: await fetchUser(),
      metrics: await fetchMetrics(),
    }
  },
  component: Dashboard,
})

// ❌ Avoid: Redundant React Query when loader data is sufficient
function Dashboard() {
  const data = Route.useLoaderData()
  // Don't use React Query here if loader data is sufficient
  return <DashboardView data={data} />
}
```

### Error and Loading Boundaries

• Use ErrorBoundary for handling route-level errors gracefully
• Implement PendingBoundary for loading states during navigation
• Provide meaningful error messages and recovery options

```typescript
// ✅ Good: Route with error and pending boundaries
export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    try {
      return await fetchUser(params.id)
    } catch (error) {
      throw new Error(`Failed to load user: ${error.message}`)
    }
  },
  errorComponent: ({ error }) => (
    <div className="text-center p-6">
      <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
      <p className="text-gray-600">{error.message}</p>
      <Link to="/users" className="text-blue-600 hover:underline mt-4 inline-block">
        Back to Users
      </Link>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex items-center justify-center p-6">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
  component: UserDetail,
})
```

## Component Organization

• Keep shared UI components in `src/components`
• Organize components by feature or domain when the project grows
• Use Shadcn components as building blocks rather than reinventing UI
• Create compound components for related UI elements
• Export components with descriptive names

### Critical UI Guidelines

**iOS Safari Auto-Zoom Prevention:**
• Always use `text-base` (16px) or larger for text inputs to prevent iOS Safari auto-zoom
• Never use `text-sm` (14px) or smaller font sizes for `<input>`, `<textarea>`, or `<select>` elements
• This prevents the frustrating auto-zoom behavior that takes inputs off-screen on iOS devices

```typescript
// ✅ Good: Prevents iOS Safari auto-zoom
<input className="text-base border rounded-md px-3 py-2" />
<textarea className="text-base border rounded-md px-3 py-2" />

// ❌ Bad: Triggers iOS Safari auto-zoom
<input className="text-sm border rounded-md px-3 py-2" />
<textarea className="text-sm border rounded-md px-3 py-2" />
```

## Code Organization

• Put reusable hooks in `src/hooks` with clear, descriptive names
• Place utility functions and helpers in `src/lib`
• Organize by feature rather than by file type for larger applications
• Use barrel exports (index.ts files) for clean imports
• Keep related code close together

## Import/Export Patterns

• Use ES6 modules with explicit imports and exports
• Prefer named exports for utilities and hooks
• Use default exports for React components
• Implement proper module boundaries between features
• Use path mapping (`@/`) for clean import statements - configured in tsconfig.json

### Import Aliasing Best Practices

• Use `@/components` for importing UI components
• Use `@/lib` for utilities, schemas, and helper functions
• Use `@/hooks` for custom React hooks
• Use `@/contexts` for React Context providers
• Always prefer aliased imports over relative paths for better maintainability

```typescript
// ✅ Good: Clean aliased imports
import { Button } from '@/components/ui/button'
import { userSchema } from '@/lib/schemas'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { UserProvider } from '@/contexts/UserContext'

// ❌ Avoid: Relative path imports for shared code
import { Button } from '../../../components/ui/button'
import { userSchema } from '../../lib/schemas'
```

## File Naming Conventions

• Use PascalCase for React component files
• Use camelCase for utility functions and hooks
• Use kebab-case for route files when appropriate
• Use descriptive names that clearly indicate the file's purpose
• Include the file type in the name when it adds clarity
