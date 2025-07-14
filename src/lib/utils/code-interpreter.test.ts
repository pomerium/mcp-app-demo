import { describe, expect, it } from 'vitest'
import { createAnnotatedFileUrl, isImageFile } from './code-interpreter'
import type { AnnotatedFile } from './code-interpreter'

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

  it('returns absolute URL with correct params (browser)', () => {
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    })

    const url = createAnnotatedFileUrl(file)
    expect(url).toBe(
      'https://example.com/api/container-file?containerId=c1&fileId=f1',
    )
  })
})
