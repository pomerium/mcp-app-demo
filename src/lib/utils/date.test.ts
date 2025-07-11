import { describe, it, expect } from 'vitest'
import { getTimestamp } from './date'

// Helper to check if a string is a valid ISO date
function isValidISODate(str: string): boolean {
  const d = new Date(str)
  return !isNaN(d.getTime()) && str === d.toISOString()
}

describe('getTimestamp', () => {
  it('returns a valid ISO string', () => {
    const ts = getTimestamp()
    expect(isValidISODate(ts)).toBe(true)
  })

  it('returns a timestamp close to now', () => {
    const now = new Date()
    const ts = new Date(getTimestamp())
    // Should be within 1 second of now
    expect(Math.abs(ts.getTime() - now.getTime())).toBeLessThan(1000)
  })
})
