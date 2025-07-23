import type { Meta, StoryObj } from '@storybook/react'
import { BackgroundJobItem } from './BackgroundJobItem'
import type { BackgroundJob } from '@/lib/schemas'

const meta: Meta<typeof BackgroundJobItem> = {
  title: 'Components/BackgroundJobItem',
  component: BackgroundJobItem,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onLoadResponse: { action: 'loadResponse' },
    onCancelJob: { action: 'cancelJob' },
    updateJob: { action: 'updateJob' },
    removeJob: { action: 'removeJob' },
  },
}

export default meta
type Story = StoryObj<typeof BackgroundJobItem>

const baseJob: BackgroundJob = {
  id: 'job-1',
  status: 'running',
  createdAt: '2024-01-15T10:30:00Z',
  title: 'Analyzing code repository structure',
}

export const Running: Story = {
  args: {
    job: baseJob,
  },
}

export const Completed: Story = {
  args: {
    job: {
      ...baseJob,
      status: 'completed',
      completedAt: '2024-01-15T10:35:00Z',
      response:
        'Analysis complete. Found 15 components, 8 hooks, and 12 utility functions.',
    },
  },
}

export const Failed: Story = {
  args: {
    job: {
      ...baseJob,
      status: 'failed',
      completedAt: '2024-01-15T10:32:00Z',
    },
  },
}

export const FailedWithResponse: Story = {
  args: {
    job: {
      ...baseJob,
      status: 'failed',
      completedAt: '2024-01-15T10:32:00Z',
      response: 'Partial analysis completed before error occurred.',
      error: 'Network timeout during file analysis.',
    },
  },
}

export const LongTitle: Story = {
  args: {
    job: {
      ...baseJob,
      title:
        'Performing comprehensive security audit of the entire application including all dependencies and configuration files',
    },
  },
}

export const NoCallbacks: Story = {
  args: {
    job: baseJob,
    onLoadResponse: undefined,
    onCancelJob: undefined,
  },
}
