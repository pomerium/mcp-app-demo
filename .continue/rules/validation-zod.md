---
title: 'Validation with Zod'
filePattern: '**/*.{ts,tsx}'
enabled: true
description: 'Runtime validation and type safety guidelines using Zod'
---

You are an expert in Zod validation and TypeScript integration.

## Schema Organization

• Define all Zod schemas in `src/lib/schemas.ts` for centralized management
• Reuse schemas across the application to maintain consistency
• Use descriptive names for schemas that clearly indicate their purpose
• Group related schemas together with appropriate comments

## TypeScript Integration

• Leverage Zod's TypeScript integration with `z.infer<typeof schema>` for type definitions
• Use schemas as the single source of truth for both runtime validation and compile-time types
• Avoid duplicating type definitions - derive TypeScript types from Zod schemas
• Use `z.input<typeof schema>` and `z.output<typeof schema>` when dealing with transformations

## Validation Patterns

• Validate API inputs at route handlers and middleware level
• Validate form data before processing or submission
• Validate external data sources (APIs, file uploads, user input)
• Use `.safeParse()` for validation with error handling
• Use `.parse()` only when you're certain the data is valid

## Error Handling

• Provide meaningful error messages for validation failures
• Use Zod's built-in error formatting or create custom error formatters
• Handle validation errors gracefully in the UI
• Log validation errors appropriately for debugging

## Schema Best Practices

• Use appropriate Zod validators for each data type
• Add `.describe()` to schemas for better error messages and documentation
• Use `.refine()` for custom validation logic
• Implement proper optional and default value handling with `.optional()` and `.default()`
