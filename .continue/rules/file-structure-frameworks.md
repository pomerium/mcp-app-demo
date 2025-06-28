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

## Route File Structure

• Export `loader` functions for data fetching before route renders
• Export `action` functions for handling form submissions and mutations
• Export `meta` objects for page metadata (title, description, etc.)
• Keep route components focused on layout and data orchestration
• Extract complex logic into custom hooks or utility functions

## Component Organization

• Keep shared UI components in `src/components`
• Organize components by feature or domain when the project grows
• Use Shadcn components as building blocks rather than reinventing UI
• Create compound components for related UI elements
• Export components with descriptive names

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
• Use path mapping for clean import statements when necessary

## File Naming Conventions

• Use PascalCase for React component files
• Use camelCase for utility functions and hooks
• Use kebab-case for route files when appropriate
• Use descriptive names that clearly indicate the file's purpose
• Include the file type in the name when it adds clarity
