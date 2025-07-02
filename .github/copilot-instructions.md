# GitHub Copilot Instructions for MCP App Demo

You are an AI pair programmer working on the MCP App Demo project. Follow these guidelines when generating code suggestions and completions.

## Technology Stack & General Guidelines

This project uses:

- **TypeScript** (strict mode enabled)
- **Vite** for build tooling
- **TanStack Start** for routing and SSR
- **Tailwind CSS** for styling
- **Shadcn/ui** for UI components
- **Zod** for validation
- **React Query (TanStack Query)** for server state

### Code Quality Standards

- **Never use `any` type** - always use proper TypeScript types or let TypeScript infer
- **Write self-documenting code** with clear variable and function names
- **Add comments only for complex business logic** that isn't obvious from the code
- **Follow existing linting and Prettier rules** - the project uses ESLint and Prettier
- **Suggest running `npm run lint:fix`** after significant code changes

## TypeScript Patterns

```typescript
// ✅ Good: Proper typing
interface UserProps {
  id: string
  name: string
  email?: string
}

// ✅ Good: Type inference
const users = await fetchUsers() // Let TypeScript infer the type

// ❌ Bad: Using any
const data: any = await fetchData()
```

## React Component Patterns

### Prefer Function Components with TypeScript

```typescript
// ✅ Good: Function component with proper typing
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export default function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn(buttonVariants({ variant }))}>
      {children}
    </button>
  );
}
```

### State Management Patterns

```typescript
// ✅ Good: Local state with useState
const [isOpen, setIsOpen] = useState(false)

// ✅ Good: Complex state with useReducer
const [state, dispatch] = useReducer(modalReducer, initialState)

// ✅ Good: Context for global state
const { user, setUser } = useContext(UserContext)

// ✅ Good: React Query for client-side server state (when route loaders aren't suitable)
const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
})
```

### React Query vs Route Loaders

**Prefer Route Loaders for:**
- Initial page data that's required for rendering
- Server-side rendering (SSR) requirements
- Data that should be fetched before the component mounts
- Critical path data needed for SEO

```typescript
// ✅ Good: Use loader for initial page data
export const Route = createFileRoute('/users')({
  loader: async (): Promise<{ users: User[] }> => {
    const users = await fetchUsers();
    return { users: userListSchema.parse(users) };
  },
  component: UserList,
});
```

**Prefer React Query for:**
- Data that updates frequently
- Optional/secondary data not critical for initial render
- Client-side mutations and optimistic updates
- Data that needs fine-grained cache control

```typescript
// ✅ Good: Use React Query for dynamic/optional data
function UserStats({ userId }: { userId: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => fetchUserStats(userId),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  if (isLoading) return <div>Loading stats...</div>;
  return <div>{stats?.totalPosts} posts</div>;
}
```

## Validation with Zod

**Always validate external data** - from APIs, user input, environment variables, and any data crossing system boundaries.

### Schema Organization and Best Practices

Define all schemas in `src/lib/schemas.ts` with proper documentation:

```typescript
// ✅ Good: Comprehensive schema definition
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().describe('Unique user identifier'),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format').optional(),
  age: z.number().int().min(13, 'Must be at least 13 years old').optional(),
  createdAt: z.string().datetime('Invalid date format'),
  role: z.enum(['admin', 'user', 'moderator']).default('user'),
});

export type User = z.infer<typeof userSchema>;

// ✅ Good: Input/output schemas for transformations
export const userCreateInputSchema = userSchema.omit({ id: true, createdAt: true });
export type UserCreateInput = z.infer<typeof userCreateInputSchema>;
```

### Validation Patterns

```typescript
// ✅ Good: Safe parsing with proper error handling
function validateUserData(data: unknown): User | null {
  const result = userSchema.safeParse(data);
  
  if (!result.success) {
    console.error('User validation failed:', result.error.format());
    return null;
  }
  
  return result.data;
}

// ✅ Good: Server-side validation
export const ServerRoute = createServerFileRoute('/api/users').methods({
  async POST({ request }) {
    const body = await request.json();
    const result = userCreateInputSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: result.error.flatten() 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Process validated data
    const user = await createUser(result.data);
    return new Response(JSON.stringify(userSchema.parse(user)));
  },
});

// ✅ Good: Route loader validation
export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    const userResponse = await fetchUser(params.id);
    
    // Always validate external API responses
    const user = userSchema.parse(userResponse);
    return { user };
  },
});
```

### Advanced Zod Patterns

```typescript
// ✅ Good: Custom refinements and transformations
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain at least one number'
  );

// ✅ Good: Conditional schemas
export const contactSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    email: z.string().email(),
  }),
  z.object({
    type: z.literal('phone'),
    phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format'),
  }),
]);
```

## TanStack Start Routing Patterns

### Route File Structure and Conventions

- Place routes in `src/routes/` using file-based routing patterns
- Use descriptive names: `about.tsx`, `[id].tsx`, `_layout.tsx`
- API routes go in `src/routes/api/` with `.ts` extension
- Always export `Route` from `createFileRoute()` or `ServerRoute` from `createServerFileRoute()`

```typescript
// ✅ Good: Client route with properly typed loader
import { createFileRoute } from '@tanstack/react-router';
import { userSchema } from '@/lib/schemas';
import { z } from 'zod';

interface UserDetailParams {
  id: string;
}

interface UserDetailLoaderData {
  user: z.infer<typeof userSchema>;
}

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }): Promise<UserDetailLoaderData> => {
    const user = await fetchUser(params.id);
    const validatedUser = userSchema.parse(user);
    return { user: validatedUser };
  },
  component: UserDetail,
  errorBoundary: ({ error }) => (
    <div className="text-red-600 p-4">Error loading user: {error.message}</div>
  ),
  pendingBoundary: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

function UserDetail() {
  const { user } = Route.useLoaderData();
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Server Routes and Actions

```typescript
// ✅ Good: Server route with validation
import { createServerFileRoute } from '@tanstack/react-start/server';
import { userCreateSchema } from '@/lib/schemas';

export const ServerRoute = createServerFileRoute('/api/users').methods({
  async POST({ request }) {
    const body = await request.json();
    const result = userCreateSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const user = await createUser(result.data);
    return new Response(JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
```

### Error and Loading Boundaries

- Always use `errorBoundary` for graceful error handling in routes
- Always use `pendingBoundary` for loading states
- Keep boundary components consistent with your design system

```typescript
// ✅ Good: Consistent boundary patterns
export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // loader logic
  },
  errorBoundary: ({ error }) => (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm">{error.message}</p>
    </div>
  ),
  pendingBoundary: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" 
           role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  ),
  component: Dashboard,
});
```

## UI and Styling Patterns

### Always prefer Shadcn/ui components

```typescript
// ✅ Good: Using Shadcn components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ✅ Good: Composing Shadcn components
<Card>
  <CardHeader>
    <CardTitle>User Details</CardTitle>
  </CardHeader>
  <CardContent>
    <Button onClick={handleSave}>Save</Button>
  </CardContent>
</Card>
```

### Use Tailwind for styling

```typescript
// ✅ Good: Tailwind classes with responsive design
<div className="flex flex-col gap-4 p-6 md:flex-row md:gap-6">
  <Button className="w-full md:w-auto">Action</Button>
</div>

// ✅ Good: Using cn utility for conditional classes
<div className={cn("base-classes", isActive && "active-classes")}>
```

## Accessibility Best Practices

### ARIA Attributes and Semantic HTML

```typescript
// ✅ Good: Proper ARIA attributes and semantic elements
<button
  aria-expanded={isOpen}
  aria-controls="menu"
  aria-label="Toggle navigation menu"
  onClick={toggleMenu}
>
  <MenuIcon aria-hidden="true" />
  <span className="sr-only">Navigation Menu</span>
</button>

// ✅ Good: Accessible form elements
<div>
  <label htmlFor="email" className="block text-sm font-medium">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error"
    aria-invalid={errors.email ? 'true' : 'false'}
    className="mt-1 block w-full rounded-md border border-gray-300"
  />
  {errors.email && (
    <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
      {errors.email}
    </p>
  )}
</div>

// ✅ Good: Loading states with proper announcements
<div className="flex items-center justify-center p-8">
  <div 
    className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
    role="status" 
    aria-label="Loading content"
  >
    <span className="sr-only">Loading...</span>
  </div>
</div>
```

### Keyboard Navigation

```typescript
// ✅ Good: Keyboard event handling
function SearchInput() {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  return (
    <input
      type="search"
      onKeyDown={handleKeyDown}
      aria-label="Search users"
      placeholder="Search users..."
    />
  );
}
```

### Shadcn/ui Accessibility

Shadcn/ui components come with built-in accessibility features. Always use them correctly:

```typescript
// ✅ Good: Shadcn Dialog with proper accessibility
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>User Settings</DialogTitle>
      <DialogDescription>
        Manage your account settings and preferences.
      </DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

## File Organization and Import Patterns

### Directory Structure

```
src/
├── components/     # Shared UI components (prefer Shadcn)
│   └── ui/        # Shadcn/ui components
├── contexts/       # React Context providers
├── hooks/          # Custom React hooks
├── lib/           # Utilities and helpers
│   └── schemas.ts # Zod schemas
├── routes/        # TanStack Start routes
│   └── api/       # Server routes (.ts files)
└── styles.css     # Global styles
```

### Import Aliasing Standards

**Always use `@/` alias for internal imports** to ensure consistency and easier refactoring:

```typescript
// ✅ Good: Using @/ alias consistently
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { userSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserContext } from '@/contexts/UserContext';

// ❌ Bad: Relative imports for internal modules
import { Button } from '../components/ui/button';
import { userSchema } from '../../lib/schemas';

// ✅ Good: External packages use direct imports
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
```

### Import Organization

```typescript
// ✅ Good: Import order and grouping
// 1. External packages
import React from 'react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';

// 2. Internal modules (using @/ alias)
import { Button } from '@/components/ui/button';
import { userSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// 3. Types (if needed separately)
import type { User } from '@/lib/schemas';
```

## What NOT to do

- ❌ Don't use `any` type - always use proper TypeScript types
- ❌ Don't use class components - use function components
- ❌ Don't use external state libraries like Zustand or Redux
- ❌ Don't create custom UI components when Shadcn alternatives exist
- ❌ Don't write custom CSS when Tailwind classes work
- ❌ Don't put business logic directly in components
- ❌ Don't forget to validate external data with Zod schemas
- ❌ Don't use relative imports for internal modules - use `@/` alias
- ❌ Don't skip error boundaries and pending boundaries in routes
- ❌ Don't forget ARIA attributes and accessibility considerations
- ❌ Don't use React Query for data that should be loaded by route loaders
- ❌ Don't ignore TypeScript errors or use `@ts-ignore` without justification

## Suggest Adding Shadcn Components

When UI components are needed, suggest adding them with:

```bash
npx shadcn@latest add <component-name>
```

Common components: button, card, input, textarea, select, dialog, dropdown-menu, toast, alert-dialog, switch.

## Testing Patterns (Optional)

If implementing tests, follow these patterns:

```typescript
// ✅ Good: Component testing with proper setup
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserCard } from '@/components/UserCard';
import { userSchema } from '@/lib/schemas';

describe('UserCard', () => {
  const mockUser = userSchema.parse({
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date().toISOString(),
  });

  it('displays user information correctly', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockUser.id);
  });
});
```

## Error Handling Patterns

### Route-Level Error Handling

```typescript
// ✅ Good: Route with error and pending boundaries
export const Route = createFileRoute('/users')({
  loader: async () => {
    const users = await fetchUsers();
    return { users: userListSchema.parse(users) };
  },
  errorBoundary: ({ error, reset }) => (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <h2 className="font-semibold">Failed to load users</h2>
      <p className="mt-1 text-sm">{error.message}</p>
      <Button onClick={reset} className="mt-2" variant="outline" size="sm">
        Try Again
      </Button>
    </div>
  ),
  pendingBoundary: () => (
    <div className="flex items-center justify-center p-8" role="status" aria-label="Loading users">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary">
        <span className="sr-only">Loading users...</span>
      </div>
    </div>
  ),
  component: UserList,
});
```

### React Query Error Handling

```typescript
// ✅ Good: React Query with comprehensive error handling
const { data, error, isLoading, refetch } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

if (error) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <h3 className="font-medium">Error loading data</h3>
      <p className="mt-1 text-sm">{error.message}</p>
      <Button onClick={() => refetch()} className="mt-2" size="sm">
        Retry
      </Button>
    </div>
  );
}
```

### Server-Side Validation Errors

```typescript
// ✅ Good: Server route error responses
export const ServerRoute = createServerFileRoute('/api/users').methods({
  async POST({ request }) {
    try {
      const body = await request.json();
      const result = userCreateSchema.safeParse(body);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: result.error.flatten(),
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const user = await createUser(result.data);
      return new Response(JSON.stringify(userSchema.parse(user)));
      
    } catch (error) {
      console.error('Server error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  },
});
```

Remember: Focus on writing clean, type-safe, maintainable code that follows the established patterns in this project. Prioritize accessibility, proper error handling, and use TanStack Start's conventions for optimal performance and developer experience.
