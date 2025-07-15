import { createServerFileRoute } from '@tanstack/react-start/server'
import { OpenAI } from 'openai'
import mime from 'mime'
import { createEtag } from '@/lib/utils/net'
import { containerFileQuerySchema } from '@/lib/schemas'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function getFilenameFromMetadata(fileId: string): Promise<string> {
  try {
    const fileInfo = await openai.files.retrieve(fileId)
    const filename = fileInfo.filename || fileId
    return filename
  } catch (error) {
    console.warn('Could not retrieve file metadata:', error)
    return fileId
  }
}

export const ServerRoute = createServerFileRoute('/api/container-file').methods(
  {
    async GET({ request }) {
      try {
        const url = new URL(request.url)
        const queryParams = {
          containerId: url.searchParams.get('containerId'),
          fileId: url.searchParams.get('fileId'),
          filename: url.searchParams.get('filename'),
        }

        const validationResult = containerFileQuerySchema.safeParse(queryParams)
        if (!validationResult.success) {
          return Response.json(
            {
              error: 'Invalid query parameters',
              details: validationResult.error.format(),
            },
            { status: 400 },
          )
        }

        const { containerId, fileId } = validationResult.data

        // Download file content from OpenAI using Container Files API
        // This API returns the actual file content (bytes) from within code interpreter containers
        // Use URL constructor for secure path encoding
        const apiUrl = new URL(
          `/v1/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(fileId)}/content`,
          'https://api.openai.com',
        )

        const fileResponse = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        })

        if (!fileResponse.ok) {
          throw new Error(
            `Container Files API error: ${fileResponse.status} ${fileResponse.statusText}`,
          )
        }

        const arrayBuffer = await fileResponse.arrayBuffer()

        // Generate ETag and check for cached version as we know the file exists
        const etag = createEtag(`${containerId}-${fileId}`)
        const ifNoneMatch = request.headers.get('If-None-Match')

        if (ifNoneMatch === `"${etag}"`) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: `"${etag}"`,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        }

        // Try to get file metadata using the regular Files API
        // This API returns metadata only (filename, size, etc.) - NOT the file content
        // Note: Container files may not be accessible via this API, so we fallback gracefully
        const filename =
          queryParams.filename ?? (await getFilenameFromMetadata(fileId))
        const contentType = mime.getType(filename) || 'application/octet-stream'

        return new Response(arrayBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': arrayBuffer.byteLength.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year, immutable
            ETag: `"${etag}"`,
            'Access-Control-Allow-Origin': '*',
            Vary: 'Accept-Encoding', // Vary on encoding for better caching
          },
        })
      } catch (error) {
        console.error('Error downloading file:', error)

        if (error instanceof OpenAI.APIError) {
          return Response.json(
            {
              error: 'Failed to download file from OpenAI',
              message: error.message,
            },
            { status: error.status || 500 },
          )
        }

        return Response.json(
          {
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 },
        )
      }
    },
  },
)
