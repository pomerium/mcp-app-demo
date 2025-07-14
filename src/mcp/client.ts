/**
 * Generates a unique ID for messages
 */
export function generateMessageId(): string {
  return Math.random().toString(36).substring(2, 15)
}
