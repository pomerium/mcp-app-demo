// Utility to copy text to clipboard, with iOS fallback
// Returns a boolean indicating success
export async function copyToClipboard(text: string): Promise<boolean> {
  let copied = false

  // The conditional check for navigator.clipboard and window.isSecureContext is necessary to ensure your code works safely across all browsers and environments.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      copied = true
    } catch {}
  }
  if (!copied) {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    el.setSelectionRange(0, el.value.length)
    try {
      document.execCommand('copy')
      copied = true
    } catch {}
    document.body.removeChild(el)
  }
  return copied
}
