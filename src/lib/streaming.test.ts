import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { stopStreamProcessing, getMessageId } from './utils/streaming'
import { streamText } from './streaming'

vi.mock('./utils/streaming', async () => {
  const actual = await vi.importActual('./utils/streaming')
  return {
    ...actual,
    getMessageId: vi.fn(),
  }
})

function iterableFromArray<T>(arr: Array<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        next: async () =>
          i < arr.length
            ? { value: arr[i++], done: false }
            : { value: undefined, done: true },
      }
    },
  }
}

async function readStreamToString(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  let result = ''
  let done = false
  while (!done) {
    const { value, done: d } = await reader.read()
    if (value) result += new TextDecoder().decode(value)
    done = d
  }
  return result
}

describe('stopStreamProcessing', () => {
  it('replaces response body with an empty closed stream', async () => {
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

    expect(response.body).not.toBe(originalStream)
    expect(response.body).toBeInstanceOf(ReadableStream)

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

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('works with responses that have no initial body', () => {
    const response = new Response(null)

    expect(() => stopStreamProcessing(response)).not.toThrow()

    expect(response.body).toBeInstanceOf(ReadableStream)
  })
})

describe('getMessageId', () => {
  it('returns a unique message ID with msg prefix', async () => {
    const actual = await vi.importActual('./utils/streaming') as { getMessageId: () => string }
    const id1 = actual.getMessageId()
    const id2 = actual.getMessageId()
    
    expect(id1).toMatch(/^msg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id2).toMatch(/^msg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id1).not.toBe(id2)
  })
})

describe('streamText', () => {
  let messageCounter = 0

  beforeEach(() => {
    vi.mocked(getMessageId).mockImplementation(() => {
      messageCounter++
      return `msg-${messageCounter}`
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('emits stream_done when the stream ends', async () => {
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
    const result = await readStreamToString(reader)
    expect(result).toMatchSnapshot()
  })

  it('emits stream_done when an error occurs', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const errorIterable = {
      [Symbol.asyncIterator]() {
        return {
          next: () => {
            throw new Error('Simulated streaming error')
          },
        }
      },
    }
    const response = streamText(errorIterable)
    const reader = response.body!.getReader()
    const result = await readStreamToString(reader)

    expect(result).toMatchSnapshot()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during streamed response:',
      expect.any(Error),
    )
    expect(consoleErrorSpy.mock.calls[0][1].message).toBe(
      'Simulated streaming error',
    )

    consoleErrorSpy.mockRestore()
  })

  it('passes through response.created events', async () => {
    const chunks = [
      {
        type: 'response.created',
        response: {
          id: 'resp_123',
          model: 'gpt-4',
          created: 1234567890,
        },
      },
    ]
    const response = streamText(iterableFromArray(chunks))
    const reader = response.body!.getReader()
    const result = await readStreamToString(reader)

    expect(result).toMatchSnapshot()
  })
})
