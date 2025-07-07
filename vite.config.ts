import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
  ],
  // Use PostCSS instead of Lightning CSS during tests to avoid native dependency issues
  // Lightning CSS is still used during build via @tailwindcss/vite plugin (default behavior)
  ...(process.env.NODE_ENV === 'test' || process.env.VITEST
    ? {
        css: {
          transformer: 'postcss',
        },
      }
    : undefined),
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    globals: true,
  },
})

export default config
