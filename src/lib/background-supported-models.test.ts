import { describe, expect, it } from 'vitest'
import { isBackgroundSupported } from './background-supported-models'

describe('isBackgroundSupported', () => {
  it('returns true for exact model matches', () => {
    expect(isBackgroundSupported('gpt-4o')).toBe(true)
    expect(isBackgroundSupported('gpt-4.1')).toBe(true)
    expect(isBackgroundSupported('o3')).toBe(true)
  })

  it('returns true for models that start with supported prefixes', () => {
    expect(isBackgroundSupported('gpt-4o-2024-05-13')).toBe(true)
    expect(isBackgroundSupported('gpt-4.1-preview')).toBe(true)
    expect(isBackgroundSupported('o3-mini')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isBackgroundSupported('GPT-4O')).toBe(true)
    expect(isBackgroundSupported('Gpt-4.1')).toBe(true)
    expect(isBackgroundSupported('O3')).toBe(true)
  })

  it('returns false for unsupported models', () => {
    expect(isBackgroundSupported('gpt-3.5-turbo')).toBe(false)
    expect(isBackgroundSupported('claude-3-sonnet')).toBe(false)
    expect(isBackgroundSupported('llama-2')).toBe(false)
    expect(isBackgroundSupported('random-model')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isBackgroundSupported('')).toBe(false)
  })

  it('handles partial matches correctly', () => {
    expect(isBackgroundSupported('gpt-4')).toBe(false)
    expect(isBackgroundSupported('gpt')).toBe(false)
    expect(isBackgroundSupported('o')).toBe(false)
  })
})
