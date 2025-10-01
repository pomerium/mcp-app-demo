import type { Meta, StoryObj } from '@storybook/react'
import { ContentRenderer } from './ContentRenderer'
import type { Content } from '@/types/mcp'

const meta = {
  title: 'Components/ContentRenderer',
  component: ContentRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ContentRenderer>

export default meta
type Story = StoryObj<typeof meta>

const textContent: Content = {
  type: 'text',
  text: '# Hello World\n\nThis is a **markdown** example with:\n\n- Lists\n- Code blocks\n\n```javascript\nconst hello = "world";\n```',
}

const imageContent: Content = {
  type: 'image',
  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  mimeType: 'image/png',
}

const uiResourceContent: Content = {
  type: 'resource',
  resource: {
    uri: 'ui://example/test',
    text: '<!DOCTYPE html><html><body><h1>Interactive UI Component</h1><button onclick="alert(\'Clicked!\')">Click Me</button></body></html>',
    uiMetadata: {
      'preferred-frame-size': ['300px', '200px'],
    },
  },
}

export const TextContent: Story = {
  args: {
    content: textContent,
  },
}

export const ImageContent: Story = {
  args: {
    content: imageContent,
  },
}

export const UIResource: Story = {
  args: {
    content: uiResourceContent,
    onUIAction: (action) => {
      console.log('UI Action triggered:', action)
      alert(`Tool: ${action.payload.toolName}\nParams: ${JSON.stringify(action.payload.params)}`)
    },
  },
}

export const UnsupportedContent: Story = {
  args: {
    content: {
      type: 'unknown',
    } as any,
  },
}
