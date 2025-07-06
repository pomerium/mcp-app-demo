import { describe, it, expect } from 'vitest'
import { createEtag } from './net'

describe('createEtag', () => {
  it('should return a string', () => {
    const result = createEtag('test')
    expect(typeof result).toBe('string')
  })

  it('should return consistent results for the same input', () => {
    const key = 'test-key'
    const result1 = createEtag(key)
    const result2 = createEtag(key)

    expect(result1).toBe(result2)
  })

  it('should return different results for different inputs', () => {
    const key1 = 'test-key-1'
    const key2 = 'test-key-2'

    const result1 = createEtag(key1)
    const result2 = createEtag(key2)

    expect(result1).not.toBe(result2)
  })

  it('should return a 32-character hex string (MD5 hash)', () => {
    const result = createEtag('test')

    // MD5 hash should be 32 characters long
    expect(result).toHaveLength(32)

    // Should only contain hexadecimal characters
    expect(result).toMatch(/^[a-f0-9]{32}$/)
  })

  it('should handle empty string input', () => {
    const result = createEtag('')

    expect(typeof result).toBe('string')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[a-f0-9]{32}$/)
  })

  it('should handle special characters and unicode', () => {
    const specialKey = 'test-🚀-key-with-特殊字符'
    const result = createEtag(specialKey)

    expect(typeof result).toBe('string')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[a-f0-9]{32}$/)
  })

  it('should handle very long strings', () => {
    const longKey = 'a'.repeat(10000)
    const result = createEtag(longKey)

    expect(typeof result).toBe('string')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[a-f0-9]{32}$/)
  })

  it('should produce expected MD5 hash for known input', () => {
    // Known MD5 hash for "test" is "098f6bcd4621d373cade4e832627b4f6"
    const result = createEtag('test')
    expect(result).toBe('098f6bcd4621d373cade4e832627b4f6')
  })

  it('should be case sensitive', () => {
    const lowerCase = createEtag('test')
    const upperCase = createEtag('TEST')

    expect(lowerCase).not.toBe(upperCase)
  })

  it('should be whitespace sensitive', () => {
    const withoutSpace = createEtag('test')
    const withSpace = createEtag('test ')
    const withLeadingSpace = createEtag(' test')

    expect(withoutSpace).not.toBe(withSpace)
    expect(withoutSpace).not.toBe(withLeadingSpace)
    expect(withSpace).not.toBe(withLeadingSpace)
  })

  it('should work with containerId-fileId pattern', () => {
    // Test the actual use case from container-file.ts
    const containerId = 'container-123'
    const fileId = 'file-456'
    const key = `${containerId}-${fileId}`

    const result = createEtag(key)

    expect(typeof result).toBe('string')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[a-f0-9]{32}$/)

    // Should be consistent for the same container-file combination
    const result2 = createEtag(key)
    expect(result).toBe(result2)
  })
})
