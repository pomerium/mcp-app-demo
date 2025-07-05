// Modern, accessible color palettes for data visualization
export const COLOR_PALETTES = {
  // Modern blues and greens - great for business charts
  modern: [
    '#3B82F6', // Blue-500
    '#10B981', // Emerald-500
    '#F59E0B', // Amber-500
    '#EF4444', // Red-500
    '#8B5CF6', // Violet-500
    '#06B6D4', // Cyan-500
    '#F97316', // Orange-500
    '#84CC16', // Lime-500
  ],

  // Vibrant but professional palette
  vibrant: [
    '#6366F1', // Indigo-500
    '#EC4899', // Pink-500
    '#14B8A6', // Teal-500
    '#F97316', // Orange-500
    '#8B5CF6', // Violet-500
    '#06B6D4', // Cyan-500
    '#F59E0B', // Amber-500
    '#EF4444', // Red-500
  ],

  // Warm earth tones
  warm: [
    '#DC2626', // Red-600
    '#D97706', // Amber-600
    '#65A30D', // Lime-600
    '#059669', // Emerald-600
    '#0284C7', // Sky-600
    '#7C3AED', // Violet-600
    '#BE185D', // Pink-600
    '#B45309', // Yellow-600
  ],

  // Cool professional palette
  cool: [
    '#1E40AF', // Blue-700
    '#065F46', // Emerald-800
    '#374151', // Gray-700
    '#6B21A8', // Purple-700
    '#B91C1C', // Red-700
    '#92400E', // Yellow-700
    '#1F2937', // Gray-800
    '#047857', // Emerald-700
  ],

  // Pastel for softer visualizations
  pastel: [
    '#93C5FD', // Blue-300
    '#86EFAC', // Green-300
    '#FDE68A', // Yellow-300
    '#FECACA', // Red-300
    '#C4B5FD', // Violet-300
    '#A7F3D0', // Emerald-300
    '#FED7AA', // Orange-300
    '#F9A8D4', // Pink-300
  ],
}

// Keywords that indicate a chart/visualization request
const CHART_KEYWORDS = [
  'chart',
  'graph',
  'plot',
  'visualization',
  'visualize',
  'bar chart',
  'line chart',
  'pie chart',
  'scatter plot',
  'histogram',
  'boxplot',
  'heatmap',
  'dashboard',
  'show me',
  'create a',
  'generate',
  'make a',
  'draw',
  'display',
  'analyze',
  'trend',
  'comparison',
  'distribution',
  'correlation',
  'matplotlib',
  'plotly',
  'seaborn',
  'pandas',
  'numpy',
  'data viz',
  'infographic',
]

const CHART_TYPES = [
  'bar',
  'line',
  'pie',
  'scatter',
  'histogram',
  'box',
  'violin',
  'heatmap',
  'area',
  'donut',
  'radar',
  'bubble',
  'treemap',
  'sunburst',
  'sankey',
]

/**
 * Detects if a user message is requesting a chart or visualization
 */
export function isChartRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  // Check for direct chart keywords
  const hasChartKeyword = CHART_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword),
  )

  // Check for chart type mentions
  const hasChartType = CHART_TYPES.some((type) => lowerMessage.includes(type))

  // Check for data visualization patterns
  const hasVisualizationPattern =
    (lowerMessage.includes('show') &&
      (lowerMessage.includes('data') || lowerMessage.includes('trend'))) ||
    lowerMessage.includes('plot') ||
    lowerMessage.includes('visual') ||
    lowerMessage.includes('graph')

  return hasChartKeyword || hasChartType || hasVisualizationPattern
}

/**
 * Selects the best color palette based on the chart request
 */
export function selectColorPalette(
  message: string,
): keyof typeof COLOR_PALETTES {
  const lowerMessage = message.toLowerCase()

  // Business/professional contexts
  if (
    lowerMessage.includes('business') ||
    lowerMessage.includes('sales') ||
    lowerMessage.includes('revenue') ||
    lowerMessage.includes('profit')
  ) {
    return 'modern'
  }

  // Creative/marketing contexts
  if (
    lowerMessage.includes('marketing') ||
    lowerMessage.includes('creative') ||
    lowerMessage.includes('brand') ||
    lowerMessage.includes('campaign')
  ) {
    return 'vibrant'
  }

  // Financial/serious contexts
  if (
    lowerMessage.includes('financial') ||
    lowerMessage.includes('analysis') ||
    lowerMessage.includes('report') ||
    lowerMessage.includes('corporate')
  ) {
    return 'cool'
  }

  // Soft/gentle contexts
  if (
    lowerMessage.includes('gentle') ||
    lowerMessage.includes('soft') ||
    lowerMessage.includes('pastel') ||
    lowerMessage.includes('light')
  ) {
    return 'pastel'
  }

  // Warm contexts
  if (
    lowerMessage.includes('warm') ||
    lowerMessage.includes('friendly') ||
    lowerMessage.includes('inviting') ||
    lowerMessage.includes('cozy')
  ) {
    return 'warm'
  }

  // Default to modern for most cases
  return 'modern'
}

/**
 * Enhances a chart request with color palette suggestions
 */
export function enhanceChartRequest(message: string): string {
  if (!isChartRequest(message)) {
    return message
  }

  const selectedPalette = selectColorPalette(message)
  const colors = COLOR_PALETTES[selectedPalette]

  // Convert colors to a format that works well with matplotlib/plotly
  const colorString = colors.map((c) => `'${c}'`).join(', ')

  // Simple, subtle enhancement - just suggest colors without verbose explanations
  const enhancement = `\n\nPLEASE USE THESE ACCESSIBLE, VIBRANT COLORS: [${colorString}]. MAKE THE VISUALIZATION CLEAN AND PROFESSIONAL.`

  return message + enhancement
}

/**
 * Gets just the color array for a specific palette
 */
export function getColorPalette(
  paletteName: keyof typeof COLOR_PALETTES,
): string[] {
  return COLOR_PALETTES[paletteName]
}

/**
 * Gets all available palette names
 */
export function getAvailablePalettes(): string[] {
  return Object.keys(COLOR_PALETTES)
}
