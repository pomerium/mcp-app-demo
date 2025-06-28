---
title: 'State Management Patterns'
filePattern: '**/*.{ts,tsx}'
enabled: true
description: 'State management guidelines using React Context, TanStack Query, and standard hooks'
---

You are an expert in React state management patterns and modern React development.

## React Context for Global State

• Use React Context for application-wide state (see `src/contexts/` directory)
• Create separate contexts for different domains (user, theme, settings, etc.)
• Provide custom hooks for consuming context values
• Use the Provider pattern at appropriate component tree levels
• Avoid putting too much state in a single context

## TanStack Query for Server State

• Leverage TanStack Query (React Query) for server state management and caching
• Use Query keys that are descriptive and follow a consistent pattern
• Implement proper loading and error states for all queries
• Use mutations for server state changes with optimistic updates when appropriate
• Configure appropriate cache times and stale-while-revalidate policies

## Local Component State

• Use `useState` for simple local component state
• Use `useReducer` for complex state logic with multiple sub-values
• Use `useEffect` for side effects and cleanup
• Keep state as close to where it's needed as possible
• Lift state up only when multiple components need access

## State Management Best Practices

• Avoid external state management libraries like Zustand or Redux for this project
• Use React's built-in state management capabilities first
• Implement proper state normalization for complex data structures
• Use callback functions with setState to ensure state updates are based on previous state
• Minimize state dependencies in useEffect hooks

## Performance Considerations

• Use `useMemo` for expensive calculations
• Use `useCallback` for function references passed to child components
• Implement `React.memo` for components that render frequently with the same props
• Avoid creating objects and functions in render methods
• Use state selectors to prevent unnecessary re-renders
