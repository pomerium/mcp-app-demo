import React from 'react'
import type { Preview } from '@storybook/react-vite'
import '../src/styles.css'
import { useEffect } from 'react'

const preview: Preview = {
  parameters: {
    darkMode: {
      classTarget: 'html',
      darkClass: 'dark',
      lightClass: '',
      stylePreview: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
}

export default preview

// Add Pomerium favicon to Storybook preview head
if (typeof window !== 'undefined') {
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  link.href = '/pomerium-favicon.svg'
  document.head.appendChild(link)
}
