# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **Pomerium MCP Chat Demo** - a minimal chat application showcasing remote Model Context Protocol (MCP) servers secured with Pomerium. The application demonstrates how to build internal applications that use agentic frameworks and LLM APIs with MCP server integration.

## Technology Stack

- **Frontend**: React 19 with TypeScript in strict mode
- **Framework**: TanStack Start (SSR routing with file-based patterns)
- **Styling**: Tailwind CSS 4.0 + Shadcn/ui components
- **Validation**: Zod for runtime validation and TypeScript integration
- **State Management**: React Query (TanStack Query) for server state, React Context for global state
- **Build Tool**: Vite 6.3
- **Testing**: Vitest with jsdom environment
- **Documentation**: Storybook for component documentation

## Development Commands

```bash
# Development server with hot reloading
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Testing
npm run test              # Run tests once
npm run test:ci          # Run tests with coverage

# Code quality
npm run lint             # ESLint check
npm run format           # Prettier format
npm run format:check     # Check formatting and linting

# Storybook
npm run storybook        # Development Storybook server
npm run build-storybook  # Build Storybook for production
```

## Architecture Overview

### Routing Pattern (TanStack Start)

- **File-based routing** in `src/routes/`
- **Client routes**: `.tsx` files with `createFileRoute()`
- **Server routes**: `.ts` files in `src/routes/api/` with `createServerFileRoute()`
- All routes must include `errorBoundary` and `pendingBoundary` for proper error/loading handling

### State Management Strategy

- **Route Loaders**: For initial page data, SSR requirements, and critical path data
- **React Query**: For dynamic/optional data, mutations, and client-side updates
- **React Context**: For global application state (user, theme, etc.)

### Component Architecture

- **UI Components**: Primarily Shadcn/ui components in `src/components/ui/`
- **Custom Components**: Application-specific components in `src/components/`
- **Storybook Stories**: Every component must have a colocated `.stories.tsx` file
- **Tests**: Components should have `.test.tsx` files using Vitest + Testing Library

### Data Validation

- **Zod schemas** defined in `src/lib/schemas.ts`
- Validate all external data: API responses, user input, environment variables
- Use `.safeParse()` for robust error handling

## MCP Integration Patterns

### MCP Client Application

This app runs as an MCP client behind Pomerium with `mcp.client: {}` configuration. Key patterns:

1. **Server Discovery**: Use `/.pomerium/mcp/routes` endpoint to get available MCP servers
2. **Authentication Flow**: Direct users to `/.pomerium/mcp/connect` for upstream OAuth when needed
3. **Tool Calls**: Pass the external token to LLM APIs for MCP server access
4. **User Identity**: Read `X-Pomerium-Assertion` header for user claims

### Key MCP Features

- **Chat Interface**: AI-powered chat using OpenAI with tool calling capabilities
- **Server Management**: Dynamic server selection and connection status
- **Tool Toggles**: Enable/disable specific tools (code interpreter, web search, etc.)
- **Model Selection**: Support for different OpenAI models

## File Organization Conventions

### Import Patterns

Always use `@/` alias for internal imports:

```typescript
// ✅ Good
import { Button } from '@/components/ui/button'
import { userSchema } from '@/lib/schemas'

// ❌ Bad
import { Button } from '../components/ui/button'
```

### Directory Structure

```
src/
├── components/          # Shared UI components
│   └── ui/             # Shadcn/ui components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── lib/                # Utilities and schemas
├── mcp/                # MCP client integration
├── routes/             # TanStack Start routes
│   └── api/           # Server routes (.ts files)
└── styles.css         # Global Tailwind styles
```

## Code Quality Standards

### TypeScript

- **Strict mode enabled** - never use `any` type
- Use proper generics and type inference
- Validate external data with Zod schemas

### Component Patterns

- **Function components only** with proper TypeScript interfaces
- **Accessibility first** - include ARIA attributes and semantic HTML
- **Error boundaries** and loading states in all routes
- **Mobile-first responsive design** with Tailwind

### Testing Requirements

- Component tests using Vitest + Testing Library
- Storybook stories for all custom components
- Focus on user interactions and accessibility

## Important Development Notes

- **Shadcn Components**: Add new components with `npx shadcn@latest add <component-name>`
- **Environment**: Uses Docker Compose setup with Pomerium for full MCP functionality
- **Authentication**: Integrated with Pomerium OAuth2 flows
- **Audit Logging**: MCP tool calls are logged for monitoring and compliance

## Pomerium MCP Configuration

The application expects specific Pomerium route configuration:

```yaml
# Client route (this app)
- from: https://mcp-app-demo.your-domain.com
  to: http://mcp-app-demo:3000
  mcp:
    client: {}

# Server routes (MCP servers)
- from: https://mcp-server.your-domain.com
  to: http://mcp-server:8080/mcp
  name: 'Server Name'
  mcp:
    server: {}
```

This configuration enables the app to discover MCP servers and handle authentication flows seamlessly.
