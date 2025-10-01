import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContentRenderer } from './ContentRenderer'
import type { Content } from '@/types/mcp'

describe('ContentRenderer', () => {
  it('renders text content as markdown', () => {
    const content: Content = {
      type: 'text',
      text: '# Hello World',
    }

    render(<ContentRenderer content={content} />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders image content', () => {
    const content: Content = {
      type: 'image',
      data: 'base64data',
      mimeType: 'image/png',
    }

    render(<ContentRenderer content={content} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,base64data')
  })

  it('renders UI resource with ui:// URI', () => {
    const content: Content = {
      type: 'resource',
      resource: {
        uri: 'ui://test/resource',
        text: '<html><body>Test</body></html>',
      },
    }

    const onUIAction = vi.fn()
    render(<ContentRenderer content={content} onUIAction={onUIAction} />)

    // UI resource should render in a styled container
    const container = document.querySelector('.mcp-ui-resource')
    expect(container).toBeInTheDocument()
  })

  it('shows unsupported content message for unknown types', () => {
    const content = {
      type: 'unknown',
    } as any

    render(<ContentRenderer content={content} />)
    expect(screen.getByText(/Unsupported content type/)).toBeInTheDocument()
  })

  it('does not render resource without ui:// URI as UI component', () => {
    const content: Content = {
      type: 'resource',
      resource: {
        uri: 'http://example.com/resource',
        text: 'Some content',
      },
    }

    render(<ContentRenderer content={content} />)
    expect(screen.getByText(/Unsupported content type/)).toBeInTheDocument()
  })
})
