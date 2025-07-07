// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BotMessage } from './BotMessage'
import type { Message } from '../mcp/client'

const markdownTable = `| Year | Total Sales        |
|------|-------------------|
| 2012 | $18,823,201.72    |
| 2013 | $38,633,120.01    |
| 2014 | $38,870,148.13    |
| 2015 | $41,423,456.72    |
| 2016 | $40,568,672.36    |
| 2017 | $40,209,904.23    |
| 2018 | $38,326,623.43    |
| 2019 | $38,516,963.86    |
| 2020 | $38,862,436.79    |
| 2021 | $41,355,549.74    |
| 2022 | $39,742,066.18    |
| 2023 | $33,054,490.00    |
\nHere is a summary table of total sales from every year. If you need additional detail, just let me know!`

describe('BotMessage', () => {
  it('renders a markdown table correctly', () => {
    const message: Message = {
      id: 'msg-1',
      content: markdownTable,
      sender: 'agent',
      timestamp: new Date('2025-07-06T12:00:00Z'),
      status: 'sent',
    }
    const { container } = render(<BotMessage message={message} />)
    // Table header and a few years should be present
    expect(container).toMatchSnapshot()
  })
})
