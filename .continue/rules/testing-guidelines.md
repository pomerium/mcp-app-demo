---
title: 'Testing Guidelines'
filePattern: '**/*.{test,spec}.{ts,tsx}'
enabled: true
description: 'Testing patterns and best practices for React components and utilities'
---

You are an expert in React Testing Library, Vitest, and modern JavaScript testing practices.

## Testing Philosophy

• Write tests that focus on user behavior rather than implementation details
• Test components as users would interact with them
• Use Testing Library's query priority: getByRole, getByLabelText, getByText, etc.
• Avoid testing implementation details like state or internal component methods
• Write descriptive test names that clearly explain the expected behavior

## Component Testing Patterns

• Test user interactions and their outcomes
• Mock external dependencies appropriately
• Use proper cleanup and setup for each test
• Focus on accessibility and user experience in tests

```typescript
// ✅ Good: Testing user behavior
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledOnce()
  })
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled onClick={vi.fn()}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeDisabled()
  })
})
```

## Testing TanStack Router Components

• Test route components in isolation when possible
• Mock loaders and actions for focused component testing
• Test error and loading states appropriately

```typescript
// ✅ Good: Testing route component with mocked loader data
import { createMemoryHistory } from '@tanstack/react-router'
import { renderWithRouter } from '@/test-utils'

describe('UserDetail Route', () => {
  it('should display user information', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }
    
    renderWithRouter({
      component: UserDetail,
      loaderData: mockUser,
      path: '/users/1'
    })
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
```

## Testing Utilities and Hooks

• Test custom hooks using Testing Library's renderHook utility
• Test utility functions with comprehensive input/output scenarios
• Use Zod schema validation in tests to ensure data integrity

```typescript
// ✅ Good: Testing custom hooks
import { renderHook, act } from '@testing-library/react'
import { useToggle } from '@/hooks/useToggle'

describe('useToggle Hook', () => {
  it('should toggle value when called', () => {
    const { result } = renderHook(() => useToggle(false))
    
    expect(result.current[0]).toBe(false)
    
    act(() => {
      result.current[1]()
    })
    
    expect(result.current[0]).toBe(true)
  })
})

// ✅ Good: Testing utilities with Zod validation
import { userSchema } from '@/lib/schemas'
import { validateUser } from '@/lib/validation'

describe('validateUser', () => {
  it('should validate correct user data', () => {
    const validUser = { id: '1', name: 'John', email: 'john@example.com' }
    const result = validateUser(validUser)
    
    expect(result.success).toBe(true)
    expect(userSchema.safeParse(result.data).success).toBe(true)
  })
})
```

## Test Organization and Setup

• Organize tests alongside the code they test when possible
• Use descriptive test file names matching the component/utility being tested
• Create shared test utilities for common testing patterns
• Set up proper test environment with necessary providers and mocks

```typescript
// test-utils.ts - Shared testing utilities
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
```

## Testing Best Practices

• Keep tests focused and atomic - test one behavior per test case
• Use proper cleanup to prevent test pollution
• Mock external dependencies at the appropriate level
• Write tests that fail for the right reasons
• Maintain test coverage for critical user flows and edge cases