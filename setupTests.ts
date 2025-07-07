/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest'
<<<<<<< HEAD
import { vi } from 'vitest'

// Mock Intl.DateTimeFormat globally to use UTC timezone for consistent test snapshots
// This ensures that timestamp formatting is consistent across all test environments
const originalDateTimeFormat = Intl.DateTimeFormat

vi.stubGlobal('Intl', {
  ...Intl,
  DateTimeFormat: vi.fn().mockImplementation((locale, options) => {
    return new originalDateTimeFormat(locale, { ...options, timeZone: 'UTC' })
  }),
})
=======
>>>>>>> b0fb437 (test: added test for markdown table rendering in BotMessage component)
