import { createServerFileRoute } from '@tanstack/react-start/server'
import { OpenAI } from 'openai'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Temporary cache directory for proactive downloads
const TEMP_CACHE_DIR = path.join(process.cwd(), 'cache', 'temp-files')

// Check for proactively cached files
async function getFromTempCache(
  containerId: string,
  fileId: string,
): Promise<{
  buffer: Buffer
  metadata: { filename: string; contentType: string; timestamp: number }
} | null> {
  try {
    const filePath = path.join(TEMP_CACHE_DIR, `${containerId}_${fileId}`)
    const metadataPath = path.join(
      TEMP_CACHE_DIR,
      `${containerId}_${fileId}.meta.json`,
    )

    // Check if both file and metadata exist
    const [buffer, metadataContent] = await Promise.all([
      fs.readFile(filePath),
      fs.readFile(metadataPath, 'utf-8'),
    ])

    const metadata = JSON.parse(metadataContent)
    console.log(`[TEMP CACHE] Serving file ${fileId} from proactive cache`)

    return { buffer, metadata }
  } catch (error) {
    // File not in cache or error reading
    return null
  }
}

// Determine content type based on filename
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'pdf':
      return 'application/pdf'
    case 'csv':
      return 'text/csv'
    case 'txt':
      return 'text/plain'
    case 'json':
      return 'application/json'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

export const ServerRoute = createServerFileRoute('/api/container-file').methods(
  {
    async GET({ request }) {
      console.log('[CONTAINER-FILE] API route hit:', request.url)
      try {
        const url = new URL(request.url)
        const containerId = url.searchParams.get('containerId')
        const fileId = url.searchParams.get('fileId')

        console.log('[CONTAINER-FILE] Extracted params:', {
          containerId,
          fileId,
        })

        if (!containerId || !fileId) {
          return new Response(
            JSON.stringify({
              error:
                'Container ID and File ID are required as query parameters',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        // Generate ETag based on containerId and fileId
        const etag = createHash('md5')
          .update(`${containerId}-${fileId}`)
          .digest('hex')

        // Check if client has cached version
        const ifNoneMatch = request.headers.get('If-None-Match')
        if (ifNoneMatch === `"${etag}"`) {
          console.log(
            '[CONTAINER-FILE] Client has cached version, returning 304',
          )
          return new Response(null, {
            status: 304,
            headers: {
              ETag: `"${etag}"`,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        }

        // First, check if we have a proactively cached version
        const cachedFile = await getFromTempCache(containerId, fileId)
        if (cachedFile) {
          return new Response(cachedFile.buffer, {
            headers: {
              'Content-Type': cachedFile.metadata.contentType,
              'Content-Disposition': `inline; filename="${cachedFile.metadata.filename}"`,
              'Cache-Control': 'public, max-age=31536000, immutable',
              ETag: `"${etag}"`,
              'Access-Control-Allow-Origin': '*',
              Vary: 'Accept-Encoding',
              'X-Served-From': 'proactive-cache',
            },
          })
        }

        console.log(
          `[CONTAINER FILE] Downloading file ${fileId} from container ${containerId}`,
        )

        // Download file content from OpenAI using Container Files API
        console.log('[CONTAINER-FILE] Calling Container Files API...')
        const fileResponse = await fetch(
          `https://api.openai.com/v1/containers/${containerId}/files/${fileId}/content`,
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          },
        )

        if (!fileResponse.ok) {
          throw new Error(
            `Container Files API error: ${fileResponse.status} ${fileResponse.statusText}`,
          )
        }

        console.log(
          '[CONTAINER-FILE] File response received:',
          fileResponse.status,
        )

        const arrayBuffer = await fileResponse.arrayBuffer()
        console.log(
          '[CONTAINER-FILE] Array buffer size:',
          arrayBuffer.byteLength,
        )

        // Get file info to determine content type (fallback to fileId if not available)
        console.log('[CONTAINER-FILE] Getting file info...')
        let filename = fileId
        try {
          const fileInfo = await openai.files.retrieve(fileId)
          filename = fileInfo.filename || fileId
          console.log('[CONTAINER-FILE] File info:', fileInfo)
        } catch (error) {
          console.warn(
            `[CONTAINER-FILE] Could not retrieve file info for ${fileId}, using fileId as filename`,
          )
        }

        const contentType = getContentType(filename)

        // Return the file content with strong caching headers
        return new Response(arrayBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${filename}"`,
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year, immutable
            ETag: `"${etag}"`,
            'Access-Control-Allow-Origin': '*',
            Vary: 'Accept-Encoding', // Vary on encoding for better caching
          },
        })
      } catch (error) {
        console.error('[CONTAINER FILE] Error downloading file:', error)

        // Handle specific OpenAI API errors
        if (error instanceof OpenAI.APIError) {
          return new Response(
            JSON.stringify({
              error: 'Failed to download file from OpenAI',
              message: error.message,
            }),
            {
              status: error.status || 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    },
  },
)
