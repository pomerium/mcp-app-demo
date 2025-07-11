// @vitest-environment jsdom
import {
  getByRole,
  getByTestId,
  getByText,
  render,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BotError } from './BotError'

describe('BotError', () => {
  it('renders a simple error message', () => {
    const { container } = render(
      <BotError message="Something went wrong. Please try again." />,
    )

    expect(getByText(container, 'Error')).toBeInTheDocument()
    expect(
      getByText(container, 'Something went wrong. Please try again.'),
    ).toBeInTheDocument()
  })

  it('renders a long error message with HTML', () => {
    const longMessage = (
      <div data-testid="error-message">
        <strong>Request failed:</strong> The server returned a 500 error.
        <br />
        Please check your network connection or try again later.
        <br />
        <code>Error: Internal Server Error</code>
      </div>
    )
    const { container } = render(<BotError message={longMessage} />)

    expect(getByText(container, 'Error')).toBeInTheDocument()
    expect(getByTestId(container, 'error-message')).toBeInTheDocument()
  })
})
