---
title: 'MCP App Demo Standards'
filePattern: '**/*.{ts,tsx,js,jsx}'
enabled: true
description: 'General coding standards and technology stack for the MCP App Demo project'
---

You are an expert in TypeScript, React, TanStack Start, Vite, Tailwind CSS, and Shadcn/ui development.

## Technology Stack

• This project uses TypeScript, Vite, TanStack Start, Tailwind CSS, and Shadcn/ui components
• All AI-generated code must follow these technologies and existing linting/Prettier rules
• Run `npm run lint:fix` before committing any changes
• Follow the established project structure and conventions

## Type Safety

• Never introduce the `any` type - use proper generics or let TypeScript infer types
• Use explicit type annotations for function parameters and return types where beneficial
• Leverage TypeScript's strict mode for maximum type safety
• Use type guards for runtime type checking when needed

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
