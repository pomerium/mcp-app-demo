---
title: 'Styling and UI Guidelines'
filePattern: '**/*.{ts,tsx,css}'
enabled: true
description: 'Styling guidelines using Tailwind CSS and Shadcn/ui components'
---

You are an expert in Tailwind CSS and Shadcn/ui component development.

## Shadcn/ui Component Usage

• Prefer Shadcn/ui components over custom UI implementations
• Add new Shadcn components using: `npx shadcn@latest add <component>`
• Compose existing Shadcn components rather than creating new ones from scratch
• Follow Shadcn's composition patterns for building complex UI
• Customize Shadcn components through their built-in variant system

## Tailwind CSS Best Practices

• Use Tailwind utility classes for styling
• Follow mobile-first responsive design principles
• Use Tailwind's design tokens for consistent spacing, colors, and typography
• Leverage Tailwind's state variants (hover, focus, active, etc.)
• Use CSS custom properties for dynamic values when necessary

## Component Styling Patterns

• Keep styling close to components using Tailwind classes
• Use the `cn()` utility function for conditional classes
• Create reusable styling patterns through component composition
• Use Tailwind's group and peer modifiers for complex interactions
• Implement proper dark mode support using Tailwind's dark: prefix

## Design System Consistency

• Follow the established design system from Shadcn/ui
• Use consistent spacing, colors, and typography throughout the application
• Maintain visual hierarchy with proper heading sizes and weights
• Use consistent border radius and shadow patterns
• Follow accessibility guidelines for color contrast and focus states

## Custom Styling Guidelines

• Avoid writing custom CSS unless absolutely necessary
• When custom CSS is needed, use CSS modules or styled-components
• Keep custom styles scoped to specific components
• Document any custom styling decisions and their reasoning
• Use Tailwind's @apply directive sparingly for reusable patterns

## Responsive Design

• Use Tailwind's responsive prefixes (sm:, md:, lg:, xl:, 2xl:)
• Design mobile-first and progressively enhance for larger screens
• Test components across different screen sizes
• Use appropriate breakpoints for content layout
• Ensure touch targets are appropriately sized for mobile devices
