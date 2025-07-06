/**
 * Checks if the given model supports code interpreter functionality
 */
export function isCodeInterpreterSupported(model: string): boolean {
  const normalizedModel = model.toLowerCase()

  return (
    // GPT-4o family
    normalizedModel.includes('gpt-4o') ||
    // GPT-4.1 family
    normalizedModel.includes('gpt-4.1') ||
    // o-series models (o3, o4-mini, etc.)
    !!normalizedModel.match(/^o[3-9]/) ||
    normalizedModel.includes('o3') ||
    normalizedModel.includes('o4')
  )
}
