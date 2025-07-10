// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ServerToggle } from './ServerToggle'
import type { Server } from '@/lib/schemas'

const baseServer: Server = {
  id: 'server-1',
  name: 'Test Server',
  url: 'https://test.example.com',
  status: 'disconnected',
  connected: false,
  needs_oauth: false,
}

describe('ServerToggle', () => {
  it('renders server name and status indicator', () => {
    render(
      <ServerToggle
        server={baseServer}
        isSelected={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('Test Server')).toBeInTheDocument()
    // Status indicator should be present
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(
      <ServerToggle
        server={baseServer}
        isSelected={false}
        onToggle={onToggle}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith('server-1')
  })

  it('disables toggle when disabled or connecting', () => {
    const { rerender } = render(
      <ServerToggle
        server={baseServer}
        isSelected={false}
        onToggle={() => {}}
        disabled
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
    rerender(
      <ServerToggle
        server={{ ...baseServer, status: 'connecting' }}
        isSelected={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows disconnect button when connected and needs_oauth', () => {
    const onDisconnect = vi.fn()
    render(
      <ServerToggle
        server={{
          ...baseServer,
          status: 'connected',
          connected: true,
          needs_oauth: true,
        }}
        isSelected={true}
        onToggle={() => {}}
        onDisconnect={onDisconnect}
      />,
    )
    const disconnectBtn = screen.getByLabelText('Disconnect from Test Server')
    expect(disconnectBtn).toBeInTheDocument()
    fireEvent.click(disconnectBtn)
    expect(onDisconnect).toHaveBeenCalledWith('server-1')
  })

  it('does not show disconnect button if not connected or needs_oauth is false', () => {
    render(
      <ServerToggle
        server={{
          ...baseServer,
          status: 'connected',
          connected: true,
          needs_oauth: false,
        }}
        isSelected={true}
        onToggle={() => {}}
      />,
    )
    expect(screen.queryByLabelText('Disconnect from Test Server')).toBeNull()
  })

  it('renders logo if logo_url is provided', () => {
    render(
      <ServerToggle
        server={{
          ...baseServer,
          logo_url: 'https://logo.example.com/logo.png',
        }}
        isSelected={false}
        onToggle={() => {}}
      />,
    )
    const img = screen.getByAltText('')
    expect(img).toHaveAttribute('src', 'https://logo.example.com/logo.png')
  })
})
