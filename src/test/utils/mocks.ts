/**
 * Mocks window.matchMedia to simulate a mobile device (matches: true).
 * Call this at the start of a test to enable mobile view logic.
 */
export function mockMobile() {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: true,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/**
 * Mocks window.matchMedia to simulate a desktop/large screen device (matches: false).
 * Call this at the start of a test to enable desktop view logic.
 */
export function mockDesktop() {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
