import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useDisconnectServer } from './useDisconnectServer'
import type { Servers } from '@/lib/schemas'
import { createQueryClientTestWrapper } from '@/test/utils/react-query-test-utils'

describe('useDisconnectServer', () => {
  const serverId = 'https://test.example.com'
  const servers: Servers = {
    [serverId]: {
      id: serverId,
      name: 'Test Server',
      description: 'A test server',
      logo_url: '',
      url: serverId,
      status: 'connected',
      connected: true,
      needs_oauth: true,
    },
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('calls onServersChange with updated servers on success', async () => {
    const mockResponse = {
      servers: [
        {
          url: serverId,
          name: 'Test Server',
          description: 'A test server',
          logo_url: '',
          connected: false,
          needs_oauth: true,
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      ) as any,
    )

    const onServersChange = vi.fn()
    const { result } = renderHook(
      () => useDisconnectServer(servers, onServersChange),
      {
        wrapper: createQueryClientTestWrapper(),
      },
    )

    await act(() => {
      result.current.mutate(serverId)
    })

    expect(onServersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        [serverId]: expect.objectContaining({
          connected: false,
          status: 'disconnected',
        }),
      }),
    )
  })

  it('throws error if server is missing or does not need oauth', async () => {
    const onServersChange = vi.fn()
    const { result } = renderHook(
      () => useDisconnectServer({}, onServersChange),
      {
        wrapper: createQueryClientTestWrapper(),
      },
    )

    let error: unknown
    try {
      await act(async () => {
        await result.current.mutateAsync('missing-server')
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/Invalid server/)
    expect(onServersChange).not.toHaveBeenCalled()
  })

  it('throws error if server does not need oauth', async () => {
    const noOauthServers: Servers = {
      [serverId]: { ...servers[serverId], needs_oauth: false },
    }
    const onServersChange = vi.fn()
    const { result } = renderHook(
      () => useDisconnectServer(noOauthServers, onServersChange),
      {
        wrapper: createQueryClientTestWrapper(),
      },
    )
    let error: unknown
    try {
      await act(async () => {
        await result.current.mutateAsync(serverId)
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/Invalid server/)
    expect(onServersChange).not.toHaveBeenCalled()
  })

  it('handles fetch/network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 } as any)),
    )
    const onServersChange = vi.fn()
    const { result } = renderHook(
      () => useDisconnectServer(servers, onServersChange),
      {
        wrapper: createQueryClientTestWrapper(),
      },
    )
    let error: unknown
    try {
      await act(async () => {
        await result.current.mutateAsync(serverId)
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/Failed to disconnect/)
    expect(onServersChange).not.toHaveBeenCalled()
  })

  it('handles invalid response schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: 'data' }),
        }),
      ) as any,
    )
    const onServersChange = vi.fn()
    const { result } = renderHook(
      () => useDisconnectServer(servers, onServersChange),
      {
        wrapper: createQueryClientTestWrapper(),
      },
    )
    let error: unknown
    try {
      await act(async () => {
        await result.current.mutateAsync(serverId)
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect(onServersChange).not.toHaveBeenCalled()
  })

  it('does not mutate the original servers object', async () => {
    const mockResponse = {
      servers: [
        {
          url: serverId,
          name: 'Test Server',
          description: 'A test server',
          logo_url: '',
          connected: false,
          needs_oauth: true,
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      ) as any,
    )
    const onServersChange = vi.fn()
    const originalServers = {
      [serverId]: { ...servers[serverId] },
    }
    const { result } = renderHook(
      () => useDisconnectServer(originalServers, onServersChange),
      {
        wrapper: createQueryClientTestWrapper(),
      },
    )
    await act(() => {
      result.current.mutate(serverId)
    })
    // The original object should not be mutated
    expect(originalServers[serverId].connected).toBe(true)
    expect(originalServers[serverId].status).toBe('connected')
  })
})
