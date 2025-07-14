import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ChatInput } from './ChatInput'

const setup = (props = {}) => {
  const onSendMessage = vi.fn()
  render(<ChatInput onSendMessage={onSendMessage} {...props} />)

  const textarea = screen.getByRole('textbox', {
    name: 'Ask something...',
  })
  const { form } = textarea

  return { onSendMessage, textarea, form }
}

describe('ChatInput', () => {
  it('renders the input and button', () => {
    setup()
    expect(screen.getByPlaceholderText(/ask something/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('submits message on Enter', () => {
    const { onSendMessage, textarea } = setup()
    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(onSendMessage).toHaveBeenCalledWith('Hello world')
  })

  it('does not submit on Shift+Enter', () => {
    const { onSendMessage, textarea } = setup()
    fireEvent.change(textarea, { target: { value: 'Hello\nworld' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true })
    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled', () => {
    setup({ disabled: true })
    expect(screen.getByPlaceholderText(/ask something/i)).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('autofocuses', () => {
    const { textarea } = setup({ focusTimestamp: Date.now() })

    expect(document.activeElement).toBe(textarea)
  })

  it('clears after submit', () => {
    const { textarea } = setup()

    fireEvent.change(textarea, { target: { value: 'Clear me' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13 })

    expect(textarea).toHaveValue('')
  })
})
