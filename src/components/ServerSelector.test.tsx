// @vitest-environment jsdom
import { screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { Mock } from 'vitest'
import { ServerSelector } from './ServerSelector'
import type { Servers } from '@/lib/schemas'
import { renderWithQueryClient } from '@/test/utils/react-query-test-utils'
import userEvent from '@testing-library/user-event'
import { mockMobile, mockDesktop } from '@/test/utils/mocks'

global.fetch = vi.fn() as Mock

describe('ServerSelector', () => {
  // Default mock for window.matchMedia (desktop)
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })
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
    vi.restoreAllMocks()
    mockDesktop()
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'Test Server',
            description: 'A test server',
            url: 'https://test.example.com',
            connected: true,
            needs_oauth: true,
          },
        ],
      }),
    })
  })

  it('renders and fetches servers, updating the UI on mount', async () => {
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{}}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(global.fetch).toHaveBeenCalledWith('/.pomerium/mcp/routes')
    expect(mockOnServersChange).toHaveBeenCalled()
  })

  it('calls onServerToggle when a connected server button is clicked', async () => {
    const servers: Servers = {
      'test-server': { ...baseServer, needs_oauth: false },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    await userEvent.click(screen.getByText('Test Server'))
    expect(mockOnServerToggle).toHaveBeenCalledWith('test-server')
  })

  it('disables all interactions when disabled is true', async () => {
    const servers: Servers = {
      'test-server': { ...baseServer, needs_oauth: true },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          disabled
          toolToggles={[]}
        />,
      )
    })
    expect(screen.getByText('Test Server').closest('button')).toBeDisabled()
    expect(screen.getByLabelText('Disconnect from Test Server')).toBeDisabled()
  })

  it('renders mobile drawer UI when matchMedia returns true', async () => {
    mockMobile()
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{ 'test-server': { ...baseServer, needs_oauth: true } }}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(
      screen.getByRole('button', { name: /Servers & Tools/i }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: /Servers & Tools/i }),
    )
    expect(screen.getByText('Test Server')).toBeInTheDocument()
  })

  it('renders empty state when no servers are present', async () => {
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{}}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(screen.getByText(/No MCP servers/i)).toBeInTheDocument()
  })

  it('renders loading indicator when loading', async () => {
    ;(global.fetch as Mock).mockImplementation(() => new Promise(() => {}))
    renderWithQueryClient(
      <ServerSelector
        servers={{}}
        onServersChange={mockOnServersChange}
        selectedServers={[]}
        onServerToggle={mockOnServerToggle}
        toolToggles={[]}
      />,
    )
    expect(await screen.findByRole('status')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Test Server')).not.toBeInTheDocument()
    })
  })

  it('renders toolToggles children when passed', async () => {
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{}}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[
            {
              key: 'hello',
              isActive: true,
              component: <button aria-label="Hello">Hello</button>,
            },
          ]}
        />,
      )
    })
    expect(screen.getByRole('button', { name: 'Hello' })).toBeInTheDocument()
  })

  it('renders fallback UI on fetch error', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    ;(global.fetch as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    })
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{}}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(
      screen.queryByText(/error|failed|unavailable|could not/i),
    ).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch servers:',
      expect.objectContaining({ message: 'Failed to fetch servers: 500' }),
    )
    consoleErrorSpy.mockRestore()
  })

  it('renders fallback UI when fetch throws an exception', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    ;(global.fetch as Mock).mockImplementation(() => {
      throw new Error('Network down')
    })
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{}}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(screen.getByText(/error|network/i)).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch servers:',
      expect.objectContaining({ message: 'Network down' }),
    )
    consoleErrorSpy.mockRestore()
  })

  it('renders multiple servers in correct order', async () => {
    const servers: Servers = {
      a: { ...baseServer, id: 'a', name: 'Alpha', needs_oauth: false },
      b: { ...baseServer, id: 'b', name: 'Bravo', needs_oauth: false },
      c: { ...baseServer, id: 'c', name: 'Charlie', needs_oauth: false },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    const serverNames = ['Alpha', 'Bravo', 'Charlie']
    const rendered = serverNames.map((name) => screen.getByText(name))
    expect(rendered[0].textContent).toContain('Alpha')
    expect(rendered[1].textContent).toContain('Bravo')
    expect(rendered[2].textContent).toContain('Charlie')
  })

  it('renders correct accessibility attributes for server button', async () => {
    const servers: Servers = {
      'test-server': { ...baseServer, needs_oauth: true },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    const serverButton = screen.getByText('Test Server').closest('button')
    expect(serverButton).toBeInTheDocument()
  })

  it.each([
    { desc: 'without disconnect', needs_oauth: false },
    { desc: 'with disconnect', needs_oauth: true },
  ])('renders server $desc', async ({ needs_oauth }) => {
    const servers: Servers = {
      'test-server': { ...baseServer, needs_oauth },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(screen.getByText('Test Server')).toBeInTheDocument()
  })

  it('does not show disconnect button for disconnected servers even if can_disconnect is true', async () => {
    const disconnectedServer: Servers = {
      'test-server': {
        ...baseServer,
        status: 'disconnected',
        connected: false,
        needs_oauth: true,
      },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={disconnectedServer}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    expect(screen.getByText('Test Server')).toBeInTheDocument()
  })

  it('calls POST request to disconnect endpoint when disconnect button is clicked', async () => {
    const serversWithDisconnect: Servers = {
      'test-server': {
        ...baseServer,
        needs_oauth: true,
      },
    }

    // Set up the custom fetch mock after beforeEach
    const disconnectFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'Test Server',
            description: 'A test server',
            url: 'https://test.example.com',
            connected: false,
            needs_oauth: true,
          },
        ],
      }),
    })

    ;(global.fetch as Mock).mockImplementation((url: string, options?: any) => {
      if (
        url === '/.pomerium/mcp/routes/disconnect' &&
        options?.method === 'POST'
      ) {
        return disconnectFetch(url, options)
      }
      // Default mock for other requests
      return Promise.resolve({
        ok: true,
        json: async () => ({
          servers: [
            {
              name: 'Test Server',
              description: 'A test server',
              url: 'https://test.example.com',
              connected: true,
              needs_oauth: true,
            },
          ],
        }),
      })
    })

    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={serversWithDisconnect}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })

    const disconnectButton = screen.getByLabelText(
      'Disconnect from Test Server',
    )

    await act(async () => {
      await userEvent.click(disconnectButton)
    })

    expect(disconnectFetch).toHaveBeenCalledWith(
      '/.pomerium/mcp/routes/disconnect',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routes: ['https://test.example.com'],
        }),
      },
    )
  })

  it('prevents server selection when disconnect button is clicked', async () => {
    const serversWithDisconnect: Servers = {
      'test-server': {
        ...baseServer,
        needs_oauth: true,
      },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={serversWithDisconnect}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[]}
        />,
      )
    })
    const disconnectButton = screen.getByLabelText(
      'Disconnect from Test Server',
    )
    await act(async () => {
      userEvent.click(disconnectButton)
    })
    expect(mockOnServerToggle).not.toHaveBeenCalled()
  })

  it('renders correct count for one server and one tool', async () => {
    mockMobile()
    const servers: Servers = {
      'test-server': {
        id: 'test-server',
        name: 'Test Server',
        url: 'https://test.example.com',
        status: 'connected',
        connected: true,
        needs_oauth: false,
      },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={['test-server']}
          onServerToggle={mockOnServerToggle}
          toolToggles={[
            {
              key: 'codeInterpreter',
              isActive: true,
              component: <button>Code Interpreter</button>,
            },
          ]}
        />,
      )
    })
    expect(
      screen.getByRole('button', { name: /Servers & Tools \(2\/2\)/i }),
    ).toBeInTheDocument()
  })

  it('renders correct count for one server and two tools', async () => {
    mockMobile()
    const servers: Servers = {
      'test-server': {
        id: 'test-server',
        name: 'Test Server',
        url: 'https://test.example.com',
        status: 'connected',
        connected: true,
        needs_oauth: false,
      },
    }
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={servers}
          onServersChange={mockOnServersChange}
          selectedServers={['test-server']}
          onServerToggle={mockOnServerToggle}
          toolToggles={[
            {
              key: 'codeInterpreter',
              isActive: true,
              component: <button>Code Interpreter</button>,
            },
            {
              key: 'webSearch',
              isActive: true,
              component: <button>Web Search</button>,
            },
          ]}
        />,
      )
    })
    expect(
      screen.getByRole('button', { name: /Servers & Tools \(3\/3\)/i }),
    ).toBeInTheDocument()
  })

  it('renders correct count for no servers and two tools', async () => {
    mockMobile()
    await act(async () => {
      renderWithQueryClient(
        <ServerSelector
          servers={{}}
          onServersChange={mockOnServersChange}
          selectedServers={[]}
          onServerToggle={mockOnServerToggle}
          toolToggles={[
            {
              key: 'codeInterpreter',
              isActive: true,
              component: <button>Code Interpreter</button>,
            },
            {
              key: 'webSearch',
              isActive: true,
              component: <button>Web Search</button>,
            },
          ]}
        />,
      )
    })
    expect(
      screen.getByRole('button', { name: /Servers & Tools \(2\/2\)/i }),
    ).toBeInTheDocument()
  })
})
