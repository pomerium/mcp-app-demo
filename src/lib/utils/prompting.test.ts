import { describe, it, expect } from 'vitest'
import { isCodeInterpreterSupported } from './prompting'

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
