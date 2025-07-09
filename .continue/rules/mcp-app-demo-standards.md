---
title: 'MCP App Demo Standards'
filePattern: '**/*.{ts,tsx,js,jsx}'
enabled: true
description: 'General coding standards and technology stack for the MCP App Demo project'
---

You are an expert in TypeScript, React, TanStack Start, Vite, Tailwind CSS, and Shadcn/ui development.

## Technology Stack

• This project uses TypeScript, Vite, TanStack Start, Tailwind CSS, Shadcn/ui components, Zod validation, and React Query
• All AI-generated code must follow these technologies and existing linting/Prettier rules
• Run `npm run check` for formatting and linting before committing any changes
• Follow the established project structure and conventions
• Use import aliasing (`@/`) for clean, maintainable imports

## Type Safety

• Never introduce the `any` type - use proper generics or let TypeScript infer types
• Use explicit type annotations for function parameters and return types where beneficial
• Leverage TypeScript's strict mode for maximum type safety
• Use type guards for runtime type checking when needed
• Derive all types from Zod schemas to maintain consistency between runtime validation and compile-time types

### TypeScript Best Practices

• Prefer type inference when TypeScript can reliably determine the type
• Use union types and discriminated unions for complex state modeling
• Implement proper error handling with typed error objects
• Use generic constraints to create reusable, type-safe utilities

```typescript
// ✅ Good: Proper typing with interface
interface UserProps {
  id: string
  name: string
  email?: string
  onUpdate: (user: User) => void
}

// ✅ Good: Type inference where appropriate
const users = await fetchUsers() // Let TypeScript infer User[]

// ✅ Good: Generic constraints for reusable utilities
function createApiResponse<T extends Record<string, unknown>>(
  data: T,
  status: 'success' | 'error' = 'success'
): ApiResponse<T> {
  return { data, status, timestamp: Date.now() }
}

// ❌ Bad: Using any type
const data: any = await fetchData()
```

## Code Quality

• Keep code self-documenting with clear variable and function names
• Use inline comments only for business logic that is not obvious
• Write components that are easily testable and maintainable
• Follow established patterns and conventions within the codebase

## General Guidelines

• Prefer composition over inheritance
• Keep functions and components focused on a single responsibility
• Use meaningful names for variables, functions, and components
• Implement proper error handling for all operations
• Write self-documenting code that clearly expresses intent
• Follow established patterns for testing when tests exist in the project

### React Component Patterns

• Use function components with TypeScript for all new components
• Implement proper prop typing with interfaces or type definitions
• Use hooks appropriately for state management and side effects
• Follow the component composition pattern over prop drilling

```typescript
// ✅ Good: Well-typed function component
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(buttonVariants({ variant }), disabled && 'opacity-50')}
    >
      {children}
    </button>
  )
}

// ✅ Good: Custom hook for shared logic
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(prev => !prev), [])
  return [value, toggle] as const
}
```

## Storybook Stories for Components

- All new components **must** have a colocated Storybook story for visual documentation, testing, and design review.
- The story file should be named `SomeComponent.stories.tsx` and placed in the same directory as `SomeComponent.tsx`.
- Example file structure:

  ```
  src/components/
    MyComponent.tsx
    MyComponent.stories.tsx
  ```

- See `src/components/ui/button.stories.tsx` for a full example. Minimal example:

  ```typescript
  // MyComponent.stories.tsx
  import type { Meta, StoryObj } from '@storybook/react'
  import { MyComponent } from './MyComponent'

  const meta: Meta<typeof MyComponent> = {
    title: 'UI/MyComponent',
    component: MyComponent,
    tags: ['autodocs'],
  }
  export default meta

  type Story = StoryObj<typeof MyComponent>

  export const Default: Story = {
    args: {
      /* props */
    },
  }
  ```
