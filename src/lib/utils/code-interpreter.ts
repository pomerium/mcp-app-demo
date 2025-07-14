// Utility functions for file handling (shared between components)

export interface AnnotatedFile {
  type: string
  container_id: string
  file_id: string
  filename: string
  start_index?: number
  end_index?: number
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
  ]
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return imageExtensions.includes(extension)
}

export function createAnnotatedFileUrl(file: AnnotatedFile): string | null {
  // Validate required fields
  if (!file.container_id || !file.file_id) {
    console.warn('Missing required fields for file annotation:', {
      container_id: file.container_id,
      file_id: file.file_id,
      filename: file.filename,
      type: file.type,
    })
    return null
  }

  try {
    const url = new URL('/api/container-file', location.origin)
    url.searchParams.set('containerId', file.container_id)
    url.searchParams.set('fileId', file.file_id)
    return url.toString()
  } catch (error) {
    console.error('Failed to create file URL:', error, file)
    return null
  }
}
