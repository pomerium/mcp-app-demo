import type { Meta, StoryObj } from '@storybook/react'
import { ServerToggle } from './ServerToggle'
import type { Server } from '@/lib/schemas'

const POMERIUM_LOGO = '/pomerium-favicon.svg'

const mockServer: Server = {
  id: '1',
  name: 'Test Server',
  status: 'connected',
  connected: true,
  url: 'https://example.com',
}

const meta: Meta<typeof ServerToggle> = {
  title: 'UI/ServerToggle',
  component: ServerToggle,
  tags: ['autodocs'],
  argTypes: {
    server: { control: 'object' },
    isSelected: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}
export default meta

type Story = StoryObj<typeof ServerToggle>

export const Disconnected: Story = {
  args: {
    server: {
      ...mockServer,
      needs_oauth: false,
      status: 'disconnected',
    },
    isSelected: false,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
export const Disconnected_with_Logo: Story = {
  args: {
    server: {
      ...mockServer,
      needs_oauth: false,
      status: 'disconnected',
      logo_url: POMERIUM_LOGO,
    },
    isSelected: false,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
export const Connecting: Story = {
  args: {
    server: {
      ...mockServer,
      needs_oauth: false,
      status: 'connecting',
      logo_url: undefined,
    },
    isSelected: false,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
export const Connecting_Logo: Story = {
  name: 'Connecting with Logo',
  args: {
    server: {
      ...mockServer,
      needs_oauth: false,
      status: 'connecting',
      logo_url: POMERIUM_LOGO,
    },
    isSelected: false,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
export const Connected: Story = {
  name: 'Connected',
  args: {
    server: {
      ...mockServer,
      needs_oauth: false,
      status: 'connected',
      logo_url: undefined,
    },
    isSelected: true,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
export const Connected_Logo: Story = {
  name: 'Connected with Logo',
  args: {
    server: {
      ...mockServer,
      status: 'connected',
      logo_url: POMERIUM_LOGO,
    },
    isSelected: true,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
export const Connected_Logo_OAuth: Story = {
  name: 'Connected with Logo & OAuth',
  args: {
    server: {
      ...mockServer,
      needs_oauth: true,
      status: 'connected',
      logo_url: POMERIUM_LOGO,
    },
    isSelected: true,
    onToggle: () => alert('Toggled!'),
    onDisconnect: () => alert('Disconnected!'),
    disabled: false,
  },
}
