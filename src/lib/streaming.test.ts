import { describe, it, expect } from 'vitest'
import { stopStreamProcessing } from './utils/streaming'

describe('stopStreamProcessing', () => {
  it('replaces response body with an empty closed stream', async () => {
    // Create a mock response with a readable stream
    const originalStream = new ReadableStream({
      start(controller) {
        controller.enqueue('some data')
        controller.close()
      },
    })

    const response = new Response(originalStream, {
      headers: { 'Content-Type': 'text/plain' },
    })

    expect(response.body).toBe(originalStream)
    stopStreamProcessing(response)

    // Verify the body has been replaced
    expect(response.body).not.toBe(originalStream)
    expect(response.body).toBeInstanceOf(ReadableStream)

    // Test that the response stream is closed
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()

    if (reader) {
      const result = await reader.read()
      expect(result.done).toBe(true)
      expect(result.value).toBeUndefined()
    }
  })

  it('preserves other response properties', () => {
    const originalHeaders = new Headers({ 'Content-Type': 'application/json' })
    const response = new Response('content', {
      status: 200,
      statusText: 'OK',
      headers: originalHeaders,
    })

    stopStreamProcessing(response)

    // All other properties should remain unchanged
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    // Headers content should be preserved even if reference changes
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('works with responses that have no initial body', () => {
    const response = new Response(null)

    expect(() => stopStreamProcessing(response)).not.toThrow()

    // Should still have a body (the empty stream)
    expect(response.body).toBeInstanceOf(ReadableStream)
  })
})
