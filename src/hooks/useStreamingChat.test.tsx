import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStreamingChat } from './useStreamingChat'

const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const MOCK_MESSAGE_ID = 'mock-message-id'
const TEST_REQUEST_ID = 'test-request-id'
const GENERIC_ERROR_MESSAGE = 'An error occurred while sending your message'
const TEST_ERROR_MESSAGE = 'Test error message'
const INTERNAL_SERVER_ERROR = 'Internal Server Error'

function isTool(
  event: any,
): event is Extract<
  ReturnType<typeof useStreamingChat>['streamBuffer'][0],
  { type: 'tool' }
> {
  return event.type === 'tool'
}

function expectTimestamp(value: string) {
  expect(value).toEqual(expect.stringMatching(ISO_TIMESTAMP_REGEX))
}

function createMockResponse(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    headers: new Headers(),
    clone: vi.fn(),
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    bytes: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
    ...overrides,
  }
}

vi.mock('../mcp/client', () => ({
  generateMessageId: vi.fn(() => MOCK_MESSAGE_ID),
}))

vi.mock('@/lib/utils/streaming', () => ({
  stopStreamProcessing: vi.fn(),
}))

describe('useStreamingChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useStreamingChat())

      expect(result.current.streamBuffer).toEqual([])
      expect(result.current.streaming).toBe(false)
      expect(result.current.timedOut).toBe(false)
      expect(result.current.requestId).toBe(null)
    })
  })

  describe('addUserMessage', () => {
    it('should add a user message to the stream buffer', () => {
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('Hello, world!')
      })

      expect(result.current.streamBuffer).toHaveLength(1)
      expect(result.current.streamBuffer[0]).toEqual({
        type: 'user',
        id: MOCK_MESSAGE_ID,
        content: 'Hello, world!',
        timestamp: expect.any(String),
      })
      if (result.current.streamBuffer[0].type === 'user') {
        expectTimestamp(result.current.streamBuffer[0].timestamp)
      }
    })

    it('should add multiple user messages', () => {
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('First message')
        result.current.addUserMessage('Second message')
      })

      expect(result.current.streamBuffer).toHaveLength(2)
      expect(result.current.streamBuffer[0]).toEqual({
        type: 'user',
        id: MOCK_MESSAGE_ID,
        content: 'First message',
        timestamp: expect.any(String),
      })
      if (result.current.streamBuffer[0].type === 'user') {
        expectTimestamp(result.current.streamBuffer[0].timestamp)
      }
      expect(result.current.streamBuffer[1]).toEqual({
        type: 'user',
        id: MOCK_MESSAGE_ID,
        content: 'Second message',
        timestamp: expect.any(String),
      })
      if (result.current.streamBuffer[1].type === 'user') {
        expectTimestamp(result.current.streamBuffer[1].timestamp)
      }
    })

    it('should handle empty string input', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('')
      })

      expect(result.current.streamBuffer).toHaveLength(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'addUserMessage: Invalid content provided',
        '',
      )
    })

    it('should handle whitespace-only input', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('   ')
      })

      expect(result.current.streamBuffer).toHaveLength(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'addUserMessage: Empty content after trimming',
      )
    })

    it('should trim whitespace from input', () => {
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('  Hello, world!  ')
      })

      expect(result.current.streamBuffer).toHaveLength(1)
      expect(result.current.streamBuffer[0]).toEqual({
        type: 'user',
        id: MOCK_MESSAGE_ID,
        content: 'Hello, world!',
        timestamp: expect.any(String),
      })
      if (result.current.streamBuffer[0].type === 'user') {
        expectTimestamp(result.current.streamBuffer[0].timestamp)
      }
    })
  })

  describe('handleError', () => {
    it('should add error message to stream buffer', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())
      const error = new Error(TEST_ERROR_MESSAGE)

      act(() => {
        result.current.handleError(error)
      })

      expect(result.current.streamBuffer).toHaveLength(1)
      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: TEST_ERROR_MESSAGE,
      })
      expect(result.current.streaming).toBe(false)
      expect(result.current.timedOut).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Chat error:', error)
    })

    it('should handle error without message', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())
      const error = new Error()

      act(() => {
        result.current.handleError(error)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: GENERIC_ERROR_MESSAGE,
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith('Chat error:', error)
    })
  })

  describe('handleResponse', () => {
    it('should handle successful response and start streaming', () => {
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        headers: new Headers([['x-request-id', TEST_REQUEST_ID]]),
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      expect(result.current.requestId).toBe(TEST_REQUEST_ID)
      expect(result.current.streaming).toBe(true)
      expect(result.current.timedOut).toBe(false)
    })

    it('should handle failed response', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockResponse = createMockResponse({
        ok: false,
        status: 500,
        statusText: INTERNAL_SERVER_ERROR,
        clone: vi.fn(),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      expect(result.current.streamBuffer).toHaveLength(1)
      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: `Request failed with status 500: ${INTERNAL_SERVER_ERROR}`,
      })
      expect(result.current.streaming).toBe(false)
      expect(result.current.timedOut).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Chat response error:',
        500,
        'Internal Server Error',
      )
    })

    it('should handle response without reader', () => {
      const { result } = renderHook(() => useStreamingChat())

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(null) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      expect(result.current.streamBuffer).toHaveLength(1)
      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: 'Failed to get response stream reader',
      })
      expect(result.current.streaming).toBe(false)
    })
  })

  describe('streaming text processing', () => {
    it('should process text chunks and update assistant messages', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:"Hello"\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:" world"\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'assistant',
        id: MOCK_MESSAGE_ID,
        content: 'Hello world',
      })
    })

    it('should handle JSON response chunks', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const jsonChunk = JSON.stringify({
        type: 'response.content_part.done',
        item_id: 'msg_6873dc9520408191924aeae732658fca0521e25a4061226d',
        part: {
          text: 'Complete response',
          annotations: [],
        },
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(jsonChunk + '\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'assistant',
        id: 'msg_6873dc9520408191924aeae732658fca0521e25a4061226d',
        content: 'Complete response',
        fileAnnotations: [],
      })
    })
  })

  describe('tool event processing', () => {
    it('should process tool events', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const toolEvent = JSON.stringify({
        type: 'tool_call_in_progress',
        serverLabel: 'Test Server',
        itemId: 'tool-123',
        toolName: 'test_tool',
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${toolEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      const streamEvent = result.current.streamBuffer[0]
      expect(isTool(streamEvent)).toBe(true)
      if (isTool(streamEvent)) {
        expect(streamEvent.toolType).toBe('tool_call_in_progress')
        expect(streamEvent.serverLabel).toBe('Test Server')
        expect(streamEvent.itemId).toBe('tool-123')
        expect(streamEvent.toolName).toBe('test_tool')
        expect(streamEvent.status).toBe('in_progress')
      }
    })

    it('should handle tool events with delta and arguments', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const toolEvent = JSON.stringify({
        type: 'tool_call_arguments_delta',
        serverLabel: 'Test Server',
        itemId: 'tool-123',
        delta: '{"key": "value"}',
        arguments: '{"arg1": "value1"}',
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${toolEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'tool',
        toolType: 'tool_call_arguments_delta',
        serverLabel: 'Test Server',
        itemId: 'tool-123',
        delta: { key: 'value' },
        arguments: { arg1: 'value1' },
        status: 'arguments_delta',
      })
    })
  })

  describe('code interpreter events', () => {
    it('should process code interpreter events', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const codeEvent = JSON.stringify({
        type: 'code_interpreter_call_in_progress',
        itemId: 'code-123',
        code: 'print("Hello")',
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${codeEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'code_interpreter',
        itemId: 'code-123',
        eventType: 'code_interpreter_call_in_progress',
        code: 'print("Hello")',
      })
    })

    it('should handle code interpreter file annotations', async () => {
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('Test message')
      })

      const fileAnnotationEvent = JSON.stringify({
        type: 'code_interpreter_file_annotation',
        itemId: 'file-123',
        annotation: {
          type: 'container_file_citation',
          container_id: 'container-123',
          file_id: 'file-456',
          filename: 'test.py',
          start_index: 0,
          end_index: 10,
        },
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${fileAnnotationEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(2)
      })

      const assistantMessage = result.current.streamBuffer.find(
        (event) => event.type === 'assistant',
      )
      expect(assistantMessage?.type).toBe('assistant')
      expect(assistantMessage?.fileAnnotations).toHaveLength(1)
    })
  })

  describe('reasoning events', () => {
    it('should process reasoning summary delta events', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const reasoningEvent = JSON.stringify({
        type: 'reasoning_summary_delta',
        delta: 'This is a reasoning',
        effort: 'high',
        model: 'gpt-4',
        serviceTier: 'premium',
        temperature: 0.7,
        topP: 0.9,
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${reasoningEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'reasoning',
        summary: 'This is a reasoning',
        effort: 'high',
        model: 'gpt-4',
        serviceTier: 'premium',
        temperature: 0.7,
        topP: 0.9,
        done: false,
      })
    })

    it('should update existing reasoning events', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const firstEvent = JSON.stringify({
        type: 'reasoning_summary_delta',
        delta: 'Initial reasoning',
        effort: 'high',
      })

      const secondEvent = JSON.stringify({
        type: 'reasoning_summary_delta',
        delta: ' continued',
        effort: 'high',
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${firstEvent}\n`),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${secondEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'reasoning',
        summary: 'Initial reasoning continued',
        effort: 'high',
        done: false,
      })
    })
  })

  describe('web search events', () => {
    it('should process web search events', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const webSearchEvent = JSON.stringify({
        type: 'response.web_search_call.in_progress',
        item_id: 'search-123',
        query: 'test query',
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${webSearchEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'web_search',
        id: 'search-123',
        status: 'in_progress',
        query: 'test query',
        raw: JSON.parse(webSearchEvent),
      })
    })
  })

  describe('error event processing', () => {
    it('should process error events from stream', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const errorEvent = JSON.stringify({
        message: 'Stream error occurred',
        details: { code: 'STREAM_ERROR' },
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`e:${errorEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: 'Stream error occurred',
        details: { code: 'STREAM_ERROR' },
      })
    })

    it('should handle malformed error events', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('e:invalid json\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: 'An unknown error occurred during streaming',
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse error data:',
        expect.any(SyntaxError),
      )
    })

    it('should handle empty tool state strings', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('t:\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
      expect(consoleWarnSpy).toHaveBeenCalledWith('Empty tool state string')
    })

    it('should handle malformed text chunks', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:invalid json\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse text chunk:',
        expect.any(SyntaxError),
      )
    })

    it('should handle empty text chunks', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
      expect(consoleWarnSpy).toHaveBeenCalledWith('Empty text chunk')
    })

    it('should handle non-string text chunks', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:123\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Text chunk is not a string:',
        123,
      )
    })

    it('should handle invalid tool state objects', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('t:null\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid tool state object')
    })

    it('should handle malformed tool state', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('t:invalid json\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse tool state:',
        expect.any(SyntaxError),
      )
    })
  })

  describe('cancelStream', () => {
    it('should cancel ongoing stream', () => {
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi.fn().mockResolvedValue({
          done: false,
          value: new TextEncoder().encode('0:"test"\n'),
        }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      expect(result.current.streaming).toBe(true)

      act(() => {
        result.current.cancelStream()
      })

      expect(result.current.streaming).toBe(false)
      expect(result.current.timedOut).toBe(false)
    })
  })

  describe('clearBuffer', () => {
    it('should clear stream buffer and reset state', () => {
      const { result } = renderHook(() => useStreamingChat())

      act(() => {
        result.current.addUserMessage('Test message')
      })

      expect(result.current.streamBuffer).toHaveLength(1)

      act(() => {
        result.current.clearBuffer()
      })

      expect(result.current.streamBuffer).toHaveLength(0)
      expect(result.current.timedOut).toBe(false)
      expect(result.current.requestId).toBe(null)
    })
  })

  describe('timeout handling', () => {
    it('should set timeout when stream ends without completion', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:"test"\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.timedOut).toBe(true)
        expect(result.current.streaming).toBe(false)
      })
    })

    it('should not timeout when stream completes normally', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('t:{"type":"stream_done"}\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.timedOut).toBe(false)
        expect(result.current.streaming).toBe(false)
      })
    })
  })

  describe('stream reading errors', () => {
    it('should handle stream reading errors', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { result } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Read error')),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'error',
        message: 'Read error',
      })
      expect(result.current.streaming).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reading stream chunk:',
        expect.any(Error),
      )
    })
  })

  describe('response.created events', () => {
    it('should handle response.created with background: true option', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const responseCreatedEvent = JSON.stringify({
        type: 'response.created',
        response: {
          id: 'resp_1234567890abcdef1234567890abcdef12345678',
        },
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${responseCreatedEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse, {
          background: true,
          title: 'Test Background Job',
        })
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(1)
      })

      expect(result.current.streamBuffer[0]).toEqual({
        type: 'assistant',
        id: 'resp_1234567890abcdef1234567890abcdef12345678',
        content:
          "Background job started. Streaming the response in, but you can view it in the 'Background Jobs' if you leave.",
      })
    })

    it('should ignore response.created with background: false option', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const responseCreatedEvent = JSON.stringify({
        type: 'response.created',
        response: {
          id: 'regular-job-123',
        },
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${responseCreatedEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse, { background: false })
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
    })

    it('should ignore response.created with no options', async () => {
      const { result } = renderHook(() => useStreamingChat())

      const responseCreatedEvent = JSON.stringify({
        type: 'response.created',
        response: {
          id: 'no-options-job-123',
        },
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`t:${responseCreatedEvent}\n`),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })

      await waitFor(() => {
        expect(result.current.streamBuffer).toHaveLength(0)
      })
    })
  })

  describe('cleanup', () => {
    it('should cleanup timeouts on unmount', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { result, unmount } = renderHook(() => useStreamingChat())

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('0:"test"\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }
      const mockResponse = createMockResponse({
        clone: vi.fn().mockReturnValue({
          body: { getReader: vi.fn().mockReturnValue(mockReader) },
        }),
      })

      act(() => {
        result.current.handleResponse(mockResponse)
      })
      await waitFor(() => {
        expect(result.current.streaming).toBe(true)
      })

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})
