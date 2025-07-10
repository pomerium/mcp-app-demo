import { describe, it, expect, vi } from 'vitest'
import {
  isCodeInterpreterSupported,
  isWebSearchSupported,
  getSystemPrompt,
} from './prompting'

// These tests reflect the current allow-list logic: only exact matches to the supported model names are considered supported.
describe('isCodeInterpreterSupported', () => {
  // Supported models (should return true)
  const supported = ['gpt-4o', 'gpt-4.1', 'gpt-4', 'o4-mini', 'o3']
  supported.forEach((model) => {
    it(`returns true for supported model: ${model}`, () => {
      expect(isCodeInterpreterSupported(model)).toBe(true)
    })
  })

  // Unsupported models (should return false)
  const unsupported = [
    'gpt-4o-2024-05-13',
    'gpt-4.1-2024-06-01',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4-0613',
    'o4-mini-deep-research',
    'o3-pro',
    'o3-deep-research',
    'gpt-4-turbo',
    'gpt-4-turbo-2024-04-09',
    'o3-mini',
    'gpt-3.5',
    'gpt-3.5-turbo',
    'o2',
    'o1',
    'random-model',
    '',
    undefined as unknown as string,
    null as unknown as string,
  ]
  unsupported.forEach((model) => {
    it(`returns false for unsupported model: ${model}`, () => {
      expect(isCodeInterpreterSupported(model)).toBe(false)
    })
  })
})

describe('isWebSearchSupported', () => {
  // Supported models (should return true)
  const supported = [
    'gpt-4o',
    'gpt-4.1',
    'gpt-4',
    'gpt-3.5-turbo',
    'o4-mini',
    'o3',
  ]
  supported.forEach((model) => {
    it(`returns true for supported model: ${model}`, () => {
      expect(isWebSearchSupported(model)).toBe(true)
    })
  })

  // Unsupported models (should return false)
  const unsupported = [
    'gpt-4o-2024-05-13',
    'gpt-4.1-2024-06-01',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4-0613',
    'o4-mini-deep-research',
    'o3-pro',
    'o3-deep-research',
    'gpt-4-turbo',
    'gpt-4-turbo-2024-04-09',
    'o3-mini',
    'gpt-3.5',
    'o2',
    'o1',
    'random-model',
    '',
    undefined as unknown as string,
    null as unknown as string,
  ]
  unsupported.forEach((model) => {
    it(`returns false for unsupported model: ${model}`, () => {
      expect(isWebSearchSupported(model)).toBe(false)
    })
  })
})

describe('getSystemPrompt', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('returns the base system prompt when codeInterpreter is false and no user message', () => {
    expect(getSystemPrompt(false)).toMatchSnapshot()
  })

  it('includes code interpreter instructions when codeInterpreter is true', () => {
    expect(getSystemPrompt(true)).toMatchSnapshot()
  })

  it('returns base prompt if latestUserMessage is not a chart request', () => {
    const msg = 'Hello, how are you?'
    expect(getSystemPrompt(false, msg)).toMatchSnapshot()
  })

  it('appends chart instructions if latestUserMessage triggers chart enhancement', async () => {
    vi.doMock('./chart-enhancement', async () => {
      const actual = await vi.importActual<
        typeof import('./chart-enhancement')
      >('./chart-enhancement')
      return {
        ...actual,
        enhanceChartRequest: (msg: string) => msg + ' [ENHANCED]',
      }
    })
    // Re-import getSystemPrompt to use the mocked enhanceChartRequest
    const { getSystemPrompt: getSystemPromptMocked } = await import(
      './prompting'
    )
    const msg = 'Create a bar chart of sales.'
    const result = getSystemPromptMocked(false, msg)
    expect(result).toContain('CHART CREATION INSTRUCTIONS')
    expect(result).toContain('[ENHANCED]')
  })

  it('includes both code interpreter and chart instructions if both apply', async () => {
    vi.doMock('./chart-enhancement', async () => {
      const actual = await vi.importActual<
        typeof import('./chart-enhancement')
      >('./chart-enhancement')
      return {
        ...actual,
        enhanceChartRequest: (msg: string) => msg + ' [ENHANCED]',
      }
    })
    const { getSystemPrompt } = await import('./prompting')
    const msg = 'Create a pie chart.'
    const result = getSystemPrompt(true, msg)
    expect(result).toMatchSnapshot()
  })
})
