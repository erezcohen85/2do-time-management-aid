import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeAll(() => {
  // jsdom lacks these browser APIs used by shadcn/radix
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
})

// the first-run tour is tested on its own; everything else starts "already onboarded"
beforeEach(() => localStorage.setItem('2do.onboarded', '1'))

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('dir')
})
