# OpenAI Code Interpreter File Download - Barebones Solution

## The Problem

OpenAI Code Interpreter generates files with `sandbox:/mnt/data/filename.png` URLs that don't work outside OpenAI's infrastructure. These are internal sandbox paths that only work within OpenAI's containers.

**Example of broken URLs:**

- `sandbox:/mnt/data/sales_chart.png` ❌
- `![Chart](sandbox:/mnt/data/analysis.png)` ❌
- `[Download](sandbox:/mnt/data/report.pdf)` ❌

## The Working Solution

### 1. Container Files API (This Actually Works!)

The correct API endpoint is:

```
GET https://api.openai.com/v1/containers/{containerId}/files/{fileId}/content
```

**Headers:**

```typescript
{
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'Content-Type': 'application/json'
}
```

### 2. Detect File Annotations in Stream

Watch for `container_file_citation` annotations in the streaming response:

```typescript
// In your stream processing
if (chunk.type === 'response.content_part.delta' && chunk.delta.annotations) {
  for (const annotation of chunk.delta.annotations) {
    if (annotation.type === 'container_file_citation') {
      // This is what you need:
      const containerId = annotation.container_id // e.g., "cntr_abc123"
      const fileId = annotation.file_id // e.g., "cfile_def456"
      const filename = annotation.filename // e.g., "chart.png"

      // Download immediately
      downloadFile(containerId, fileId, filename)
    }
  }
}
```

### 3. Download Function (Barebones Implementation)

```typescript
async function downloadFile(
  containerId: string,
  fileId: string,
  filename: string,
) {
  try {
    console.log(`Downloading ${filename} from container ${containerId}`)

    const response = await fetch(
      `https://api.openai.com/v1/containers/${containerId}/files/${fileId}/content`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save to local cache (example using fs)
    const cacheKey = `${containerId}_${fileId}`
    const cachePath = `./cache/${cacheKey}`

    await fs.writeFile(cachePath, buffer)
    await fs.writeFile(
      `${cachePath}.meta.json`,
      JSON.stringify({
        filename,
        containerId,
        fileId,
        contentType: getContentType(filename),
        timestamp: Date.now(),
      }),
    )

    console.log(`✅ Cached file: ${filename} (${buffer.length} bytes)`)
  } catch (error) {
    console.error('❌ Download failed:', error)
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    csv: 'text/csv',
    txt: 'text/plain',
    json: 'application/json',
  }
  return types[ext || ''] || 'application/octet-stream'
}
```

### 4. Serve Files via Your API

```typescript
// API route: /api/files/[containerId]/[fileId]
export async function GET(
  request: Request,
  { params }: { params: { containerId: string; fileId: string } },
) {
  const { containerId, fileId } = params

  try {
    // Check cache first
    const cacheKey = `${containerId}_${fileId}`
    const cachePath = `./cache/${cacheKey}`
    const metaPath = `${cachePath}.meta.json`

    if (await fileExists(cachePath)) {
      const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
      const fileBuffer = await fs.readFile(cachePath)

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': metadata.contentType,
          'Content-Disposition': `inline; filename="${metadata.filename}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // If not cached, download and serve
    const response = await fetch(
      `https://api.openai.com/v1/containers/${containerId}/files/${fileId}/content`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      },
    )

    if (!response.ok) {
      return new Response('File not found', { status: 404 })
    }

    const arrayBuffer = await response.arrayBuffer()
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

### 5. Replace Sandbox URLs in Frontend

```typescript
// Convert sandbox URLs to your API URLs
function replaceSandboxUrls(content: string, annotations: Array<{
  type: string,
  container_id: string,
  file_id: string,
  filename: string
}>) {
  return content.replace(
    /sandbox:\/mnt\/data\/([^)\s]+)/g,
    (match, filename) => {
      const annotation = annotations.find(a => a.filename === filename)
      if (annotation) {
        return `/api/files/${annotation.container_id}/${annotation.file_id}`
      }
      return match // Keep original if no annotation found
    }
  )
}

// Usage in React component
function ChatMessage({ content, fileAnnotations }) {
  const processedContent = replaceSandboxUrls(content, fileAnnotations)

  return (
    <div dangerouslySetInnerHTML={{ __html: processedContent }} />
  )
}
```

## What We Know Works (From Your Logs)

✅ **Container Files API Works:**

```
Successfully cached file on attempt 1:
cntr_686992c85e2c819192e9084e121636600ffad4c155567d45_cfile_686992d1ece88191a3bfdd81645430f1
(73619 bytes)
```

✅ **File Annotations Detected:**

```json
{
  "type": "container_file_citation",
  "container_id": "cntr_686992c85e2c819192e9084e121636600ffad4c155567d45",
  "file_id": "cfile_686992d1ece88191a3bfdd81645430f1",
  "filename": "sales_bar_chart.png"
}
```

✅ **Files Stay Available:**

```
✅ Container file cfile_686992d1ece88191a3bfdd81645430f1 is AVAILABLE after 496ms
```

## The Issue in Your Current Setup

Your implementation is actually working perfectly! The issue is just in the frontend URL conversion. The chat response shows:

- `sandbox:/mnt/data/sales_bar_chart.png` (broken)

But should show:

- `/api/files/cntr_686992c85e2c819192e9084e121636600ffad4c155567d45/cfile_686992d1ece88191a3bfdd81645430f1` (working)

## Simple Test Plan

1. **Generate a chart** with code interpreter
2. **Check browser console** for debug logs
3. **Verify file annotation** has correct `container_id` and `file_id`
4. **Test direct download** using the Container Files API URL
5. **Verify URL replacement** converts sandbox URLs to working URLs

## Minimal Implementation Strategy

### Phase 1: Core Functionality

1. **Stream Processing**: Detect `container_file_citation` annotations
2. **Immediate Download**: Download files when annotations are detected
3. **Local Cache**: Store files with `${containerId}_${fileId}` naming
4. **API Endpoint**: Serve cached files via `/api/files/[containerId]/[fileId]`

### Phase 2: Frontend Integration

1. **URL Replacement**: Convert sandbox URLs to API URLs
2. **Image Rendering**: Show images inline with proper fallbacks
3. **Download Links**: Provide download buttons for non-image files

### Phase 3: Error Handling (Optional)

1. **Cache Miss**: Fall back to direct API call if cache is empty
2. **Expired Files**: Show helpful error messages
3. **Network Issues**: Retry logic for failed downloads

## Key Insights

1. **Use Container Files API**: `containers/{containerId}/files/{fileId}/content` not regular Files API
2. **Download Immediately**: When annotation is detected, download right away
3. **Files Are Persistent**: Your logs show files staying available for 15+ seconds
4. **No Complex Retry Needed**: Works on first try with correct API endpoint

## Example API URLs

**Container Files API (OpenAI):**

```
GET https://api.openai.com/v1/containers/cntr_abc123/files/cfile_def456/content
Authorization: Bearer sk-...
```

**Your API Endpoint:**

```
GET https://yourdomain.com/api/files/cntr_abc123/cfile_def456
Content-Type: image/png
Content-Disposition: inline; filename="chart.png"
```

**Frontend URL Conversion:**

```
sandbox:/mnt/data/chart.png
    ↓
/api/files/cntr_abc123/cfile_def456
```

## Complete Workflow

1. **User asks for chart** → OpenAI Code Interpreter runs
2. **Stream contains annotation** → Your backend detects `container_file_citation`
3. **Download immediately** → Call Container Files API, cache locally
4. **Frontend renders** → Replace sandbox URLs with your API URLs
5. **User clicks image/link** → Serves from your cache

This approach is bulletproof because you're not fighting OpenAI's infrastructure - you're working with it correctly.
