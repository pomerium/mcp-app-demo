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
• See the standards rule (`mcp-app-demo-standards.md`) for requirements on colocated Storybook stories for all new components.

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

## Accessibility and ARIA Best Practices

• Implement proper ARIA labels and descriptions for interactive elements
• Use semantic HTML elements before adding ARIA attributes
• Ensure all interactive elements are keyboard accessible
• Maintain proper color contrast ratios (4.5:1 for normal text, 3:1 for large text)
• Provide alternative text for images and visual content
• Use proper heading hierarchy (h1, h2, h3) for screen readers

### Accessibility Implementation Examples

```typescript
// ✅ Good: Accessible button with proper ARIA
<Button
  onClick={handleSubmit}
  disabled={isLoading}
  aria-label="Submit user registration form"
  aria-describedby="submit-help"
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>
<div id="submit-help" className="sr-only">
  This will create your account and send a confirmation email
</div>

// ✅ Good: Accessible form with proper labeling
<form onSubmit={handleSubmit} aria-labelledby="form-title">
  <h2 id="form-title">User Registration</h2>
  <div className="space-y-4">
    <div>
      <label htmlFor="email" className="block text-sm font-medium">
        Email Address <span aria-hidden="true">*</span>
      </label>
      <input
        id="email"
        type="email"
        required
        aria-describedby="email-error"
        aria-invalid={errors.email ? 'true' : 'false'}
        className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
      />
      {errors.email && (
        <div id="email-error" role="alert" className="text-red-600 text-sm">
          {errors.email}
        </div>
      )}
    </div>
  </div>
</form>

// ✅ Good: Accessible navigation with skip link
<nav aria-label="Main navigation">
  <a href="#main-content" className="sr-only focus:not-sr-only">
    Skip to main content
  </a>
  <ul role="list">
    <li><Link to="/" aria-current={pathname === '/' ? 'page' : undefined}>Home</Link></li>
    <li><Link to="/about">About</Link></li>
  </ul>
</nav>
```

### Focus Management and Keyboard Navigation

• Ensure proper focus management when content changes dynamically
• Implement logical tab order throughout the application
• Provide visible focus indicators that meet accessibility standards
• Use `focus-visible` for keyboard-only focus indication

```typescript
// ✅ Good: Accessible modal with focus management
function AccessibleModal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={modalRef}
        tabIndex={-1}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <DialogHeader>
          <DialogTitle id="modal-title">Confirm Action</DialogTitle>
          <DialogDescription id="modal-description">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

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
