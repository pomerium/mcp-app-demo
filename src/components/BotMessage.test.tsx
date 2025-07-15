// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BotMessage } from './BotMessage'
import type { Message } from './BotMessage'

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
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }
    const { container } = render(<BotMessage message={message} />)
    expect(container).toMatchSnapshot()
  })

  it('renders container_file_citation annotations as downloadable files', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is a chart showing the data.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const fileAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'data.csv',
        start_index: 0,
        end_index: 0,
      },
    ]

    const { getByRole, getByText } = render(
      <BotMessage message={message} fileAnnotations={fileAnnotations} />,
    )

    expect(getByText('Attachments:')).toBeInTheDocument()

    const downloadLink = getByRole('link', { name: /download data\.csv/i })
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink).toHaveAttribute('download', 'data.csv')
  })

  it('renders image files with proper alt text and download functionality', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is a visualization of the data.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const imageAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'sales_chart.png',
        start_index: 0,
        end_index: 0,
      },
    ]

    const { getByAltText, getByRole } = render(
      <BotMessage message={message} fileAnnotations={imageAnnotations} />,
    )

    const image = getByAltText('Generated visualization: sales chart')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src')

    const downloadLink = getByRole('link', { name: /download image/i })
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink).toHaveAttribute('download', 'sales_chart.png')
  })

  it('handles multiple file types correctly - images and non-images', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here are the results and visualizations.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const mixedAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'chart.png',
        start_index: 0,
        end_index: 0,
      },
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_789',
        filename: 'data.csv',
        start_index: 0,
        end_index: 0,
      },
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_101',
        filename: 'report.pdf',
        start_index: 0,
        end_index: 0,
      },
    ]

    const { getByAltText, getByRole, getByText } = render(
      <BotMessage message={message} fileAnnotations={mixedAnnotations} />,
    )

    expect(getByAltText('Generated visualization: chart')).toBeInTheDocument()
    expect(getByText('Attachments:')).toBeInTheDocument()

    const csvDownloadLink = getByRole('link', { name: /download data\.csv/i })
    const pdfDownloadLink = getByRole('link', { name: /download report\.pdf/i })

    expect(csvDownloadLink).toBeInTheDocument()
    expect(pdfDownloadLink).toBeInTheDocument()
  })

  it('filters out non-container_file_citation annotations', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is some data.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const mixedAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'data.csv',
        start_index: 0,
        end_index: 0,
      },
      {
        type: 'some_other_type' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_789',
        filename: 'ignored.txt',
        start_index: 0,
        end_index: 0,
      },
    ] as any

    const { getByRole, queryByRole } = render(
      <BotMessage message={message} fileAnnotations={mixedAnnotations} />,
    )

    expect(
      getByRole('link', { name: /download data\.csv/i }),
    ).toBeInTheDocument()
    expect(
      queryByRole('link', { name: /download ignored\.txt/i }),
    ).not.toBeInTheDocument()
  })

  it('handles empty fileAnnotations array', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is some data.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const { queryByText } = render(
      <BotMessage message={message} fileAnnotations={[]} />,
    )

    expect(queryByText('Attachments:')).not.toBeInTheDocument()
  })

  it('handles undefined fileAnnotations prop', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is some data.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const { queryByText } = render(<BotMessage message={message} />)

    expect(queryByText('Attachments:')).not.toBeInTheDocument()
  })

  it('supports various image file extensions', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here are various image formats.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
    const imageAnnotations = imageExtensions.map((ext, index) => ({
      type: 'container_file_citation' as const,
      container_id: 'cntr_123',
      file_id: `cfile_${index}`,
      filename: `image.${ext}`,
      start_index: 0,
      end_index: 0,
    }))

    const { getAllByAltText } = render(
      <BotMessage message={message} fileAnnotations={imageAnnotations} />,
    )

    const images = getAllByAltText(/Generated visualization:/)
    expect(images).toHaveLength(imageExtensions.length)
  })

  it('handles filenames with underscores and special characters in alt text', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is a complex filename.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const imageAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'complex_file_name_with_underscores.png',
        start_index: 0,
        end_index: 0,
      },
    ]

    const { getByAltText } = render(
      <BotMessage message={message} fileAnnotations={imageAnnotations} />,
    )

    expect(
      getByAltText(
        'Generated visualization: complex file name with underscores',
      ),
    ).toBeInTheDocument()
  })

  it('provides accessible copy button functionality', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is some content to copy.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const { getByRole } = render(<BotMessage message={message} />)

    const copyButton = getByRole('button', {
      name: /copy message to clipboard/i,
    })
    expect(copyButton).toBeInTheDocument()
  })

  it('renders list items for file attachments', () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here are some files.',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const fileAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'document.pdf',
        start_index: 0,
        end_index: 0,
      },
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_789',
        filename: 'spreadsheet.xlsx',
        start_index: 0,
        end_index: 0,
      },
    ]

    const { getByRole, getAllByRole } = render(
      <BotMessage message={message} fileAnnotations={fileAnnotations} />,
    )

    const list = getByRole('list', { name: 'File attachments' })
    expect(list).toBeInTheDocument()

    const listItems = getAllByRole('listitem')
    expect(listItems).toHaveLength(2)
  })

  it('copies markdown content with sandbox URLs replaced by container-file URLs', async () => {
    const message: Message = {
      id: 'msg-1',
      content:
        'Here is a chart: ![chart](sandbox:/mnt/data/sales_chart.png) and some data: [data.csv](sandbox:/mnt/data/data.csv)',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const fileAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'sales_chart.png',
        start_index: 0,
        end_index: 0,
      },
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_789',
        filename: 'data.csv',
        start_index: 0,
        end_index: 0,
      },
    ]

    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const mockExecCommand = vi.fn().mockReturnValue(true)
    Object.assign(document, { execCommand: mockExecCommand })

    const { getByRole } = render(
      <BotMessage message={message} fileAnnotations={fileAnnotations} />,
    )

    const copyButton = getByRole('button', {
      name: /copy message to clipboard/i,
    })

    await copyButton.click()

    const expectedContent =
      'Here is a chart: ![chart](/api/container-file?containerId=cntr_123&fileId=cfile_456&filename=sales_chart.png) and some data: [data.csv](/api/container-file?containerId=cntr_123&fileId=cfile_789&filename=data.csv)'

    if (mockClipboard.writeText.mock.calls.length > 0) {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedContent)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.not.stringContaining('sandbox:/mnt/data/'),
      )
    } else {
      expect(mockExecCommand).toHaveBeenCalledWith('copy')
    }
  })

  it('copies markdown content without sandbox URLs when no file annotations are provided', async () => {
    const message: Message = {
      id: 'msg-1',
      content: 'Here is a chart: ![chart](sandbox:/mnt/data/sales_chart.png)',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const mockExecCommand = vi.fn().mockReturnValue(true)
    Object.assign(document, { execCommand: mockExecCommand })

    const { getByRole } = render(<BotMessage message={message} />)

    const copyButton = getByRole('button', {
      name: /copy message to clipboard/i,
    })

    await copyButton.click()

    const expectedContent =
      'Here is a chart: ![chart](sandbox:/mnt/data/sales_chart.png)'

    if (mockClipboard.writeText.mock.calls.length > 0) {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedContent)
    } else {
      expect(mockExecCommand).toHaveBeenCalledWith('copy')
    }
  })

  it('copies markdown content with regular URLs unchanged', async () => {
    const message: Message = {
      id: 'msg-1',
      content:
        'Here is a chart: ![chart](https://example.com/chart.png) and some data: [data.csv](https://example.com/data.csv)',
      timestamp: '2025-07-06T12:00:00Z',
      status: 'sent',
    }

    const fileAnnotations = [
      {
        type: 'container_file_citation' as const,
        container_id: 'cntr_123',
        file_id: 'cfile_456',
        filename: 'sales_chart.png',
        start_index: 0,
        end_index: 0,
      },
    ]

    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const mockExecCommand = vi.fn().mockReturnValue(true)
    Object.assign(document, { execCommand: mockExecCommand })

    const { getByRole } = render(
      <BotMessage message={message} fileAnnotations={fileAnnotations} />,
    )

    const copyButton = getByRole('button', {
      name: /copy message to clipboard/i,
    })

    await copyButton.click()

    const expectedContent =
      'Here is a chart: ![chart](https://example.com/chart.png) and some data: [data.csv](https://example.com/data.csv)'

    if (mockClipboard.writeText.mock.calls.length > 0) {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedContent)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/chart.png'),
      )
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/data.csv'),
      )
    } else {
      expect(mockExecCommand).toHaveBeenCalledWith('copy')
    }
  })
})
