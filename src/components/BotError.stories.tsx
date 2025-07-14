import { AlertTriangle } from 'lucide-react'
import { BotError } from './BotError'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta<typeof BotError> = {
  title: 'Bot/BotError',
  component: BotError,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'BotError displays an error message from the bot, using accessible Shadcn/ui and Tailwind styling. Use for error boundaries or bot error responses.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof BotError>

export const Default: Story = {
  args: {
    message: 'Something went wrong. Please try again.',
  },
}

export const LongError: Story = {
  args: {
    message: (
      <>
        <div>
          <strong>Request failed:</strong> The server returned a 500 error.
          <br />
          Please check your network connection or try again later.
          <br />
          <code>Error: Internal Server Error</code>
        </div>
      </>
    ),
  },
}
