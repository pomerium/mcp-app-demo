// Utility functions for file handling (shared between components)

export interface AnnotatedFile {
  type: string
  container_id: string
  file_id: string
  filename: string
  start_index?: number
  end_index?: number
}

const reImageFileExtension = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i

export function isImageFile(filename: string): boolean {
  return reImageFileExtension.test(filename)
}

export function createAnnotatedFileUrl(file: AnnotatedFile): string {
  const url = new URL('/api/container-file', location.origin)
  url.searchParams.set('containerId', file.container_id)
  url.searchParams.set('fileId', file.file_id)
  return url.toString()
}
