// Utility to copy text to clipboard, with iOS fallback
// Returns a boolean indicating success
export async function copyToClipboard(text: string): Promise<boolean> {
  let copied = false
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
