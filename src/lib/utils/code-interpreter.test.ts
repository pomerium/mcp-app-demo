import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createAnnotatedFileUrl,
  isImageFile,
  replaceSandboxUrls,
} from './code-interpreter'
import type { AnnotatedFile } from './code-interpreter'

const originalLocation = global.location
beforeEach(() => {
  Object.defineProperty(global, 'location', {
    value: { origin: 'http://localhost:3000' },
    writable: true,
  })
})

afterEach(() => {
  Object.defineProperty(global, 'location', {
    value: originalLocation,
    writable: true,
  })
})

describe('isImageFile', () => {
  it('returns true for supported image extensions', () => {
    expect(isImageFile('photo.jpg')).toBe(true)
    expect(isImageFile('pic.JPEG')).toBe(true)
    expect(isImageFile('img.PNG')).toBe(true)
    expect(isImageFile('banner.gif')).toBe(true)
    expect(isImageFile('icon.bmp')).toBe(true)
    expect(isImageFile('art.webp')).toBe(true)
    expect(isImageFile('vector.svg')).toBe(true)
  })

  it('returns false for non-image extensions', () => {
    expect(isImageFile('document.pdf')).toBe(false)
    expect(isImageFile('archive.zip')).toBe(false)
    expect(isImageFile('script.js')).toBe(false)
  })
})

describe('createAnnotatedFileUrl', () => {
  const file: AnnotatedFile = {
    type: 'image',
    container_id: 'c1',
    file_id: 'f1',
    filename: 'test.png',
  }

  it('returns absolute URL with correct params including filename (browser)', () => {
    const url = createAnnotatedFileUrl(file)
    expect(url).toBe(
      'http://localhost:3000/api/container-file?containerId=c1&fileId=f1&filename=test.png',
    )
  })

  it('handles filenames with special characters', () => {
    const fileWithSpecialChars: AnnotatedFile = {
      type: 'container_file_citation',
      container_id: 'c2',
      file_id: 'f2',
      filename: 'my file with spaces.py',
    }
    const url = createAnnotatedFileUrl(fileWithSpecialChars)
    expect(url).toBe(
      'http://localhost:3000/api/container-file?containerId=c2&fileId=f2&filename=my+file+with+spaces.py',
    )
  })

  it('handles filenames with special URL characters', () => {
    const fileWithUrlChars: AnnotatedFile = {
      type: 'container_file_citation',
      container_id: 'c3',
      file_id: 'f3',
      filename: 'file&with=special?chars.txt',
    }
    const url = createAnnotatedFileUrl(fileWithUrlChars)
    expect(url).toBe(
      'http://localhost:3000/api/container-file?containerId=c3&fileId=f3&filename=file%26with%3Dspecial%3Fchars.txt',
    )
  })
})

describe('replaceSandboxUrls', () => {
  const mockAnnotations: Array<AnnotatedFile> = [
    {
      type: 'container_file_citation',
      container_id: 'container-123',
      file_id: 'file-456',
      filename: 'example.py',
    },
    {
      type: 'container_file_citation',
      container_id: 'container-789',
      file_id: 'file-101',
      filename: 'data.csv',
    },
    {
      type: 'other_type',
      container_id: 'container-999',
      file_id: 'file-999',
      filename: 'ignored.txt',
    },
  ]

  it('should return original content when no file annotations are provided', () => {
    const content = 'Check out sandbox:/mnt/data/example.py for details'
    const result = replaceSandboxUrls(content, [])
    expect(result).toBe(content)
  })

  it('should replace sandbox URLs with container-file URLs', () => {
    const content = 'Check out sandbox:/mnt/data/example.py for details'
    const result = replaceSandboxUrls(content, mockAnnotations)

    const expectedUrl = createAnnotatedFileUrl(mockAnnotations[0])
    expect(result).toBe(`Check out ${expectedUrl} for details`)
  })

  it('should handle multiple sandbox URLs in the same content', () => {
    const content =
      'Files: sandbox:/mnt/data/example.py and sandbox:/mnt/data/data.csv'
    const result = replaceSandboxUrls(content, mockAnnotations)

    const expectedUrl1 = createAnnotatedFileUrl(mockAnnotations[0])
    const expectedUrl2 = createAnnotatedFileUrl(mockAnnotations[1])
    expect(result).toBe(`Files: ${expectedUrl1} and ${expectedUrl2}`)
  })

  it('should preserve sandbox URLs that do not have matching annotations', () => {
    const content = 'Check out sandbox:/mnt/data/unknown.py'
    const result = replaceSandboxUrls(content, mockAnnotations)
    expect(result).toBe(content)
  })

  it('should handle mixed content with some matching and some non-matching URLs', () => {
    const content =
      'Files: sandbox:/mnt/data/example.py and sandbox:/mnt/data/unknown.py'
    const result = replaceSandboxUrls(content, mockAnnotations)

    const expectedUrl = createAnnotatedFileUrl(mockAnnotations[0])
    expect(result).toBe(
      `Files: ${expectedUrl} and sandbox:/mnt/data/unknown.py`,
    )
  })

  it('should ignore annotations that are not container_file_citation type', () => {
    const content = 'Check out sandbox:/mnt/data/ignored.txt'
    const result = replaceSandboxUrls(content, mockAnnotations)
    expect(result).toBe(content)
  })

  it('should handle URLs with different formats (parentheses, brackets)', () => {
    const content =
      'See (sandbox:/mnt/data/example.py) and [sandbox:/mnt/data/data.csv]'
    const result = replaceSandboxUrls(content, mockAnnotations)

    const expectedUrl1 = createAnnotatedFileUrl(mockAnnotations[0])
    const expectedUrl2 = createAnnotatedFileUrl(mockAnnotations[1])
    expect(result).toBe(`See (${expectedUrl1}) and [${expectedUrl2}]`)
  })

  it('should handle URLs with whitespace after them', () => {
    const content =
      'Check sandbox:/mnt/data/example.py and sandbox:/mnt/data/data.csv '
    const result = replaceSandboxUrls(content, mockAnnotations)

    const expectedUrl1 = createAnnotatedFileUrl(mockAnnotations[0])
    const expectedUrl2 = createAnnotatedFileUrl(mockAnnotations[1])
    expect(result).toBe(`Check ${expectedUrl1} and ${expectedUrl2} `)
  })

  it('should handle empty content', () => {
    const result = replaceSandboxUrls('', mockAnnotations)
    expect(result).toBe('')
  })

  it('should handle content with no sandbox URLs', () => {
    const content = 'This is just regular text with no URLs'
    const result = replaceSandboxUrls(content, mockAnnotations)
    expect(result).toBe(content)
  })

  it('should handle malformed sandbox URLs gracefully', () => {
    const content = 'Check sandbox:/mnt/data/ and sandbox:/invalid'
    const result = replaceSandboxUrls(content, mockAnnotations)
    expect(result).toBe(content)
  })
})
