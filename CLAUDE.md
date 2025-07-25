# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development

- `npm run dev` - Start development server with hot reloading (runs on host)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run serve` - Preview production build

### Testing & Quality

- `npm test` or `npm run test` - Run tests with Vitest
- `npm run test:ci` - Run tests with coverage report
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting and linting

### Storybook

- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production

## Architecture Overview

This is a **Pomerium MCP Chat Demo** - a React/TypeScript application that provides a secure chat interface for AI models with Model Context Protocol (MCP) server integration.

### Core Technology Stack

- **TanStack Start** - Full-stack React framework with file-based routing and SSR
- **TypeScript** (strict mode) - All code uses proper typing, never `any`
- **Tailwind CSS + Shadcn/ui** - Styling and component system
- **Zod** - Runtime validation for all external data
- **React Query** - Server state management and caching
- **Vite** - Build tooling

### Application Architecture

#### Authentication & State Management

- **Pomerium Integration**: Uses `@pomerium/js-sdk` for enterprise authentication
- **UserContext**: Manages authenticated user state with React Query caching
- **ModelContext**: Manages selected AI model with localStorage persistence

#### Chat System Architecture

1. **Streaming Chat Hook** (`src/hooks/useStreamingChat.ts`):

   - Handles complex streaming responses from OpenAI API
   - Processes multiple event types: messages, tool calls, code interpreter, reasoning, web search
   - Uses 16ms text buffering for smooth UI updates
   - Manages stream cancellation and error recovery

2. **API Layer** (`src/routes/api/`):

   - `/api/chat` - Main streaming chat endpoint with OpenAI integration
   - `/api/models` - Fetches available AI models
   - `/api/container-file` - Handles code interpreter file access
   - All endpoints use Zod validation

3. **MCP Integration** (`src/mcp/client.ts`):
   - Discovers MCP servers dynamically via Pomerium routes
   - Manages server connection states and authentication flows
   - Forwards tools to OpenAI API with proper authorization headers

#### Component Organization

- **Message Components**: `BotMessage`, `UserMessage`, `ToolCallMessage`, etc.
- **Feature Components**: `ChatInput`, `ServerSelector`, `ModelSelect`
- **Toggle Components**: Code interpreter, web search, and tool toggles
- **UI Components**: Located in `src/components/ui/` (Shadcn/ui)

### Key Patterns & Conventions

#### TypeScript Standards

- Strict mode enabled - never use `any`, use proper generics
- Interface definitions for all component props and API responses
- Zod schemas for runtime validation in `src/lib/schemas.ts`

#### Import Conventions

```typescript
// Always use @/ alias for internal imports
import { Button } from '@/components/ui/button'
import { userSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'
```

#### Route Patterns (TanStack Start)

- Client routes: Export `Route` from `createFileRoute()`
- Server routes: Export `ServerRoute` from `createServerFileRoute()`
- Always include `errorBoundary` and `pendingBoundary` for user experience
- Validate all external data with Zod schemas

#### Component Requirements

- All new components must have colocated Storybook stories (`.stories.tsx`)
- Use Shadcn/ui components instead of custom UI components
- Follow accessibility patterns with proper ARIA attributes
- Use `cn()` utility for conditional Tailwind classes

#### Data Flow Preferences

- **Route loaders** for initial page data and SSR requirements
- **React Query** for dynamic data, mutations, and real-time updates
- Avoid redundant React Query when route loaders are sufficient

### MCP Server Integration

This application connects to external MCP (Model Context Protocol) servers through Pomerium for security:

#### Server Discovery

- Servers discovered via `/.pomerium/mcp/routes` endpoint
- Connection status indicates OAuth requirements: `connected: true/false`
- Authentication handled via `/.pomerium/mcp/connect` flow

#### Tool Integration

- MCP tools passed to OpenAI API as function calling tools
- Bearer tokens forwarded for server authentication
- Real-time tool execution status with streaming updates

### Development Notes

#### Testing

- Uses Vitest for unit testing with Testing Library
- Tests located adjacent to components (`.test.tsx`)
- Mock utilities in `src/test/utils/`

#### Error Handling

- Comprehensive error boundaries at route level
- Stream timeout detection with custom error messages
- Request ID tracking for debugging
- Proper error display with retry functionality

#### Performance Considerations

- Text buffering reduces DOM updates during streaming
- React Query caching minimizes API calls
- Proper memoization in streaming components
- Efficient event handling for real-time updates

### Deployment Context

This application is designed for deployment behind Pomerium proxy:

- Docker Compose setup with Pomerium integration
- Supports OAuth flows for MCP server authentication
- Comprehensive audit logging for tool calls
- Enterprise security with access policies

When making changes, always:

1. Validate external data with Zod schemas
2. Include proper TypeScript typing
3. Add error boundaries and loading states
4. Follow accessibility best practices
5. Use existing Shadcn/ui components
6. Add Storybook stories for new components
7. Run `npm run lint` and `npm run format:check` before committing
