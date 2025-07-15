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
  url.searchParams.set('filename', file.filename)
  return url.toString()
}

/**
 * Replaces sandbox URLs in markdown content with /api/container-file URLs using file annotations.
 * Sandbox URLs are only valid within the code interpreter container, so they need to be converted
 * to accessible URLs for the frontend.
 */
export function replaceSandboxUrls(
  markdownContent: string,
  fileAnnotations: Array<AnnotatedFile> = [],
): string {
  if (!fileAnnotations.length) return markdownContent

  const fileMap = new Map<string, AnnotatedFile>()
  fileAnnotations.forEach((annotation) => {
    if (annotation.type === 'container_file_citation') {
      fileMap.set(annotation.filename, annotation)
    }
  })

  return markdownContent.replace(
    /sandbox:\/mnt\/data\/([^\s)\]]+)/g,
    (match, filename) => {
      const annotation = fileMap.get(filename)
      if (annotation) {
        return createAnnotatedFileUrl(annotation)
      }
      return match
    },
  )
}
