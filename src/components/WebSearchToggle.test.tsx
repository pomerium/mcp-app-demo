// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WebSearchToggle } from './WebSearchToggle'

const supportedModel = 'gpt-4o'
const unsupportedModel = 'not-a-model'

describe('WebSearchToggle', () => {
  it('renders with label and icon', () => {
    render(
      <WebSearchToggle
        useWebSearch={false}
        onToggle={() => {}}
        selectedModel={supportedModel}
      />,
    )
    expect(screen.getByText('Web Search')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onToggle with correct value when clicked', () => {
    const onToggle = vi.fn()
    render(
      <WebSearchToggle
        useWebSearch={false}
        onToggle={onToggle}
        selectedModel={supportedModel}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('toggles off when already enabled', () => {
    const onToggle = vi.fn()
    render(
      <WebSearchToggle
        useWebSearch={true}
        onToggle={onToggle}
        selectedModel={supportedModel}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('is disabled if disabled prop is true', () => {
    render(
      <WebSearchToggle
        useWebSearch={false}
        onToggle={() => {}}
        selectedModel={supportedModel}
        disabled
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled if model does not support web search', () => {
    render(
      <WebSearchToggle
        useWebSearch={false}
        onToggle={() => {}}
        selectedModel={unsupportedModel}
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button').className).toContain('opacity-50')
  })

  it('shows correct title for supported and unsupported models', () => {
    render(
      <>
        <WebSearchToggle
          useWebSearch={false}
          onToggle={() => {}}
          selectedModel={supportedModel}
        />
        <WebSearchToggle
          useWebSearch={false}
          onToggle={() => {}}
          selectedModel={unsupportedModel}
        />
      </>,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0].title).toContain('Enable web search')
    expect(buttons[1].title).toContain('Not supported by')
  })
})
