const BACKGROUND_SUPPORTED_MODELS = [
  'gpt-4o',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'o3',
  'o4-mini',
]

export function isBackgroundSupported(model: string): boolean {
  return BACKGROUND_SUPPORTED_MODELS.some((m) =>
    model.toLowerCase().startsWith(m.toLowerCase()),
  )
}
