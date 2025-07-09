import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import type { VariantProps } from 'class-variance-authority'
import { ArrowRight } from 'lucide-react'

const VARIANT_OPTIONS = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const
const SIZE_OPTIONS = ['default', 'sm', 'lg', 'icon'] as const

type ButtonVariant = (typeof VARIANT_OPTIONS)[number]
type ButtonSize = (typeof SIZE_OPTIONS)[number]

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: VARIANT_OPTIONS,
    },
    size: {
      control: 'select',
      options: SIZE_OPTIONS,
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
    asChild: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible button component using Shadcn/ui and Tailwind. Use `variant` and `size` for style, and always provide accessible labels for icon-only buttons.',
      },
    },
  },
}

export default meta

// Story type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Default Button',
    variant: 'default',
    size: 'default',
    disabled: false,
  },
}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-4">
      {VARIANT_OPTIONS.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-4 items-end">
      {SIZE_OPTIONS.map((size) => (
        <Button key={size} size={size}>
          {size.charAt(0).toUpperCase() + size.slice(1)}
        </Button>
      ))}
    </div>
  ),
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        Next <ArrowRight />
      </>
    ),
    variant: 'default',
    size: 'default',
  },
}

export const IconOnly: Story = {
  args: {
    children: <ArrowRight aria-label="Arrow right" />,
    variant: 'ghost',
    size: 'icon',
    'aria-label': 'Arrow right',
  },
  parameters: {
    docs: {
      description: {
        story:
          'For icon-only buttons, always provide an accessible label using `aria-label`.',
      },
    },
  },
}
