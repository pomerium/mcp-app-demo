import type { Meta, StoryObj } from '@storybook/react'
import { UIResourceError } from './UIResourceError'
import type { UIResource } from '@/types/mcp'

const meta = {
  title: 'Components/UIResourceError',
  component: UIResourceError,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof UIResourceError>

export default meta
type Story = StoryObj<typeof meta>

const mockResource: UIResource = {
  uri: 'ui://chess_board/invalid',
  text: '<!DOCTYPE html><html><body>Invalid chess board</body></html>',
  uiMetadata: {
    'preferred-frame-size': ['400px', '400px'],
  },
}

export const NetworkError: Story = {
  args: {
    error: new Error('Failed to load resource: Network error'),
    resource: mockResource,
  },
}

export const InvalidResource: Story = {
  args: {
    error: new Error('Invalid UI resource format'),
    resource: {
      uri: 'ui://invalid',
      text: 'malformed content',
    },
  },
}

export const TimeoutError: Story = {
  args: {
    error: new Error('Request timeout after 30 seconds'),
    resource: mockResource,
  },
}
