// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerSelector } from './ServerSelector'
import type { Servers } from '@/lib/schemas'

// Mock fetch
global.fetch = vi.fn()

// Mock useMediaQuery hook
vi.mock('../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false), // Default to desktop
}))

describe('ServerSelector', () => {
  const mockOnServersChange = vi.fn()
  const mockOnServerToggle = vi.fn()

  const baseServer = {
    id: 'test-server',
    name: 'Test Server',
    description: 'A test server',
    url: 'https://test.example.com',
    status: 'connected' as const,
    connected: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful fetch response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'Test Server',
            description: 'A test server',
            url: 'https://test.example.com',
            connected: true,
            can_disconnect: true,
          },
        ],
      }),
    })
  })

  it('should render server without disconnect button when can_disconnect is false', async () => {
    const serversWithoutDisconnect: Servers = {
      'test-server': {
        ...baseServer,
        needs_oauth: false,
      },
    }

    await act(async () => {
      render(
        <ServerSelector
          servers={serversWithoutDisconnect}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
        />,
      )
    })

    expect(screen.getByText('Test Server')).toBeDefined()
    expect(screen.queryByLabelText('Disconnect from Test Server')).toBeNull()
  })

  it('should render server with disconnect button when can_disconnect is true', async () => {
    const serversWithDisconnect: Servers = {
      'test-server': {
        ...baseServer,
        needs_oauth: true,
      },
    }

    await act(async () => {
      render(
        <ServerSelector
          servers={serversWithDisconnect}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
        />,
      )
    })

    expect(screen.getByText('Test Server')).toBeDefined()
    expect(screen.getByLabelText('Disconnect from Test Server')).toBeDefined()
  })

  it('should not show disconnect button for disconnected servers even if can_disconnect is true', async () => {
    const disconnectedServer: Servers = {
      'test-server': {
        ...baseServer,
        status: 'disconnected',
        connected: false,
        needs_oauth: true,
      },
    }

    await act(async () => {
      render(
        <ServerSelector
          servers={disconnectedServer}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
        />,
      )
    })

    expect(screen.getByText('Test Server')).toBeDefined()
    expect(screen.queryByLabelText('Disconnect from Test Server')).toBeNull()
  })

  it('should call DELETE request when disconnect button is clicked', async () => {
    const serversWithDisconnect: Servers = {
      'test-server': {
        ...baseServer,
        needs_oauth: true,
      },
    }

    // Mock DELETE request
    const deleteFetch = vi.fn().mockResolvedValue({ ok: true })
    ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return deleteFetch(url, options)
      }
      // Return the default mock for other requests
      return Promise.resolve({
        ok: true,
        json: async () => ({
          servers: [
            {
              name: 'Test Server',
              description: 'A test server',
              url: 'https://test.example.com',
              connected: true,
              can_disconnect: true,
            },
          ],
        }),
      })
    })

    await act(async () => {
      render(
        <ServerSelector
          servers={serversWithDisconnect}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
        />,
      )
    })

    const disconnectButton = screen.getByLabelText(
      'Disconnect from Test Server',
    )

    await act(async () => {
      fireEvent.click(disconnectButton)
    })

    expect(deleteFetch).toHaveBeenCalledWith(
      'https://test.example.com/.pomerium/mcp/connect',
      { method: 'DELETE' },
    )
  })

  it('should prevent server selection when disconnect button is clicked', async () => {
    const serversWithDisconnect: Servers = {
      'test-server': {
        ...baseServer,
        needs_oauth: true,
      },
    }

    await act(async () => {
      render(
        <ServerSelector
          servers={serversWithDisconnect}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
        />,
      )
    })

    const disconnectButton = screen.getByLabelText(
      'Disconnect from Test Server',
    )

    await act(async () => {
      fireEvent.click(disconnectButton)
    })

    // onServerToggle should not be called when clicking disconnect button
    expect(mockOnServerToggle).not.toHaveBeenCalled()
  })
})
