import { describe, it, expect } from 'vitest'
import { stopStreamProcessing } from './utils/streaming'
import { streamText } from './streaming'

function iterableFromArray<T>(arr: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        next: async () =>
          i < arr.length
            ? { value: arr[i++], done: false }
            : { value: undefined, done: true },
      }
    },
  }
}

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

describe('streamText', () => {
  it('emits stream_done when the stream ends', async () => {
    // Simulate a normal completion (not timing out)
    const chunks = [
      { type: 'response.output_text.delta', delta: "I'm glad you asked!" },
      {
        type: 'response.output_text.delta',
        delta: ' Here are a few universally nice things that',
      },
      {
        type: 'response.output_text.delta',
        delta: ' could have happened today:\n\n',
      },
      {
        type: 'response.output_text.delta',
        delta: '- Someone smiled at a stranger, brightening',
      },
      { type: 'response.output_text.delta', delta: ' their day\n' },
      {
        type: 'response.output_text.delta',
        delta: '- A teacher helped a student understand a',
      },
      { type: 'response.output_text.delta', delta: ' difficult concept\n' },
      {
        type: 'response.output_text.delta',
        delta: '- A kind person paid for someone’s coffee',
      },
      { type: 'response.output_text.delta', delta: ' in line\n' },
      {
        type: 'response.output_text.delta',
        delta: '- A pet reunited with its owner at a local',
      },
      { type: 'response.output_text.delta', delta: ' animal shelter\n' },
      {
        type: 'response.output_text.delta',
        delta: '- A friend reached out just to say hello\n\n',
      },
      {
        type: 'response.output_text.delta',
        delta: 'Would you like to hear some real, uplifting',
      },
      { type: 'response.output_text.delta', delta: ' news from today?' },
      { type: 'response.output_text.delta', delta: ' Just let me know!' },
      {
        type: 'response.tool_call_completed',
        response: {
          /* ...omitted... */
        },
      },
      {
        type: 'response.completed',
        response: {
          /* ...omitted... */
        },
      },
    ]
    const response = streamText(iterableFromArray(chunks))
    const reader = response.body!.getReader()
    let result = ''
    let done = false
    while (!done) {
      const { value, done: d } = await reader.read()
      if (value) result += new TextDecoder().decode(value)
      done = d
    }
    // Should include t:{...stream_done...}
    expect(result).toMatch(/t:{\"type\":\"stream_done\"}/)
  })
})
