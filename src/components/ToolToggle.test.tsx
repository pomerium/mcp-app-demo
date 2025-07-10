import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToolToggle } from './ToolToggle'

function MockIcon() {
  return <svg data-testid="mock-icon" />
}

describe('ToolToggle', () => {
  const baseProps = {
    isSelected: false,
    onToggle: vi.fn(),
    selectedModel: 'gpt-4',
    isSupported: true,
    icon: <MockIcon />,
    label: 'Test Tool',
    tooltip: 'Test tooltip',
    disabled: false,
  }

  it('renders the label and icon', () => {
    render(<ToolToggle {...baseProps} />)
    expect(screen.getByText('Test Tool')).toBeInTheDocument()
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ToolToggle {...baseProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('shows as disabled if disabled=true', () => {
    render(<ToolToggle {...baseProps} disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows as disabled if isSupported=false', () => {
    render(<ToolToggle {...baseProps} isSupported={false} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows the tooltip', () => {
    render(<ToolToggle {...baseProps} />)
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Test tooltip')
  })

  it('shows correct selected state', () => {
    render(<ToolToggle {...baseProps} isSelected={true} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
