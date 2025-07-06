import { createHash } from 'crypto'

/**
 * Create an ETag for a given key
 *
 * This is a simple MD5-based ETag generator for key-based caching.
 * Suitable for ephemeral content like OpenAI container files where
 * we generate ETags from metadata (containerId-fileId) rather than
 * actual file content.
 *
 * For RFC 7232 compliant ETags or content-based hashing, consider
 * using the `etag` npm package instead.
 *
 * @param key - The key to create an ETag for
 * @returns The ETag (without quotes - add quotes when setting HTTP headers)
 */
export function createEtag(key: string) {
  // MD5 is fine for ephemeral containers and key-based ETags
  return createHash('md5').update(key).digest('hex')
}
