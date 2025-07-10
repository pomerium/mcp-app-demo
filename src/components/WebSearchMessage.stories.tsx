import type { Meta, StoryObj } from '@storybook/react'
import { WebSearchMessage } from './WebSearchMessage'
import type { WebSearchMessageProps } from './WebSearchMessage'

const meta: Meta<typeof WebSearchMessage> = {
  title: 'UI/WebSearchMessage',
  component: WebSearchMessage,
  tags: ['autodocs'],
  argTypes: {
    event: { control: 'object' },
  },
}
export default meta

type Story = StoryObj<typeof WebSearchMessage>

const baseEvent: WebSearchMessageProps['event'] = {
  type: 'web_search',
  id: '1',
  status: 'in_progress',
}

export const InProgress: Story = {
  args: {
    event: {
      ...baseEvent,
      status: 'in_progress',
    },
  },
}

export const Searching: Story = {
  args: {
    event: {
      ...baseEvent,
      status: 'searching',
    },
  },
}

export const Completed: Story = {
  args: {
    event: {
      ...baseEvent,
      status: 'completed',
    },
  },
}

export const Result: Story = {
  args: {
    event: {
      ...baseEvent,
      status: 'result',
    },
  },
}

export const Failed: Story = {
  args: {
    event: {
      ...baseEvent,
      status: 'failed',
      error: 'Network error: Unable to fetch results',
    },
  },
}
