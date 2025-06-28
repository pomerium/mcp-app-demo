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

// ✅ Good: React Query for server state
const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
})
```

## Validation with Zod

Always define schemas in `src/lib/schemas.ts` and reuse them:

```typescript
// ✅ Good: Zod schema definition
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
})

export type User = z.infer<typeof userSchema>

// ✅ Good: Using schema for validation
const result = userSchema.safeParse(data)
if (!result.success) {
  // Handle validation errors
}
```

## TanStack Start Routing Patterns

### Route File Structure

- Place routes in `src/routes/`
- Use file-based routing: `about.tsx`, `[id].tsx`, `_layout.tsx`

```typescript
// ✅ Good: Route with loader and component
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    return fetchUser(params.id);
  },
  component: UserDetail,
});

function UserDetail() {
  const user = Route.useLoaderData();
  return <div>{user.name}</div>;
}
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

## File Organization

```
src/
├── components/     # Shared UI components (prefer Shadcn)
├── contexts/       # React Context providers
├── hooks/          # Custom React hooks
├── lib/           # Utilities and helpers
│   └── schemas.ts # Zod schemas
├── routes/        # TanStack Start routes
└── styles.css     # Global styles
```

## What NOT to do

- ❌ Don't use `any` type
- ❌ Don't use class components (use function components)
- ❌ Don't use external state libraries like Zustand or Redux
- ❌ Don't create custom UI components when Shadcn alternatives exist
- ❌ Don't write custom CSS when Tailwind classes work
- ❌ Don't put business logic directly in components
- ❌ Don't forget to validate external data with Zod schemas

## Suggest Adding Shadcn Components

When UI components are needed, suggest adding them with:

```bash
npx shadcn@latest add <component-name>
```

Common components: button, card, input, textarea, select, dialog, dropdown-menu, toast, alert-dialog, switch.

## Error Handling Patterns

```typescript
// ✅ Good: Proper error handling with React Query
const { data, error, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 3,
});

if (error) {
  return <div>Error: {error.message}</div>;
}

// ✅ Good: Validation error handling
const result = schema.safeParse(data);
if (!result.success) {
  console.error('Validation failed:', result.error);
  return;
}
```

Remember: Focus on writing clean, type-safe, maintainable code that follows the established patterns in this project.
