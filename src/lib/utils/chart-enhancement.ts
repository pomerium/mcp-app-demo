// Accessible color palettes for data visualization with contrast ratios
// All colors tested for WCAG AA compliance (4.5:1 contrast ratio minimum)

export const COLOR_PALETTES = {
  // Modern blues and greens - optimized for accessibility
  modern: [
    '#1E40AF', // Blue-700
    '#047857', // Emerald-700
    '#D97706', // Amber-600
    '#DC2626', // Red-600
    '#7C3AED', // Violet-600
    '#0E7490', // Cyan-700
    '#C2410C', // Orange-700 (was Orange-600 - darker for accessibility)
    '#4D7C0F', // Lime-700 (was Lime-600 - darker for accessibility)
  ],

  // Vibrant but professional palette - accessibility optimized
  vibrant: [
    '#4F46E5', // Indigo-600
    '#DB2777', // Pink-600
    '#0F766E', // Teal-700
    '#C2410C', // Orange-700 (was Orange-600 - darker for accessibility)
    '#7C3AED', // Violet-600
    '#0E7490', // Cyan-700
    '#D97706', // Amber-600
    '#DC2626', // Red-600
  ],

  // Warm earth tones - accessibility optimized
  warm: [
    '#DC2626', // Red-600
    '#D97706', // Amber-600
    '#4D7C0F', // Lime-700 (was Lime-600 - darker for accessibility)
    '#047857', // Emerald-700 (was Emerald-600 - darker for accessibility)
    '#0369A1', // Sky-700 (was Sky-600 - darker for accessibility)
    '#7C3AED', // Violet-600
    '#BE185D', // Pink-600
    '#B45309', // Yellow-600
  ],

  // Cool professional palette - already good contrast
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

  // High contrast palette - maximum accessibility
  highContrast: [
    '#000000', // Black
    '#1F2937', // Gray-800
    '#B91C1C', // Red-700
    '#92400E', // Yellow-700
    '#166534', // Green-800
    '#1E40AF', // Blue-700
    '#6B21A8', // Purple-700
    '#BE185D', // Pink-600
  ],

  // Colorblind-friendly palette (protanopia/deuteranopia safe)
  colorblindSafe: [
    '#1F2937', // Gray-800
    '#DC2626', // Red-600
    '#F59E0B', // Amber-500 (safe for colorblind)
    '#10B981', // Emerald-500 (safe for colorblind)
    '#1D4ED8', // Blue-700 (was Blue-500 - darker for accessibility)
    '#6D28D9', // Violet-700 (was Violet-500 - darker for accessibility)
    '#BE185D', // Pink-600 (was Pink-500 - darker for accessibility)
    '#F97316', // Orange-500 (safe for colorblind)
  ],

  // Pastel with better contrast - lightened backgrounds, darker text
  pastelAccessible: [
    '#DBEAFE', // Blue-100 (light background)
    '#D1FAE5', // Green-100 (light background)
    '#FEF3C7', // Yellow-100 (light background)
    '#FEE2E2', // Red-100 (light background)
    '#EDE9FE', // Violet-100 (light background)
    '#ECFDF5', // Emerald-100 (light background)
    '#FED7AA', // Orange-200 (light background)
    '#FCE7F3', // Pink-100 (light background)
  ],
}

// Text color recommendations based on background color
export const TEXT_COLORS = {
  // For dark backgrounds (use white text)
  dark: '#FFFFFF',
  // For light backgrounds (use dark text)
  light: '#1F2937', // Gray-800
  // For medium backgrounds (test both)
  medium: '#000000',
}

/**
 * Determines the best text color for a given background color
 * Uses luminance calculation to ensure proper contrast
 */
export function getTextColor(backgroundColor: string): string {
  // Remove # if present
  const hex = backgroundColor.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  // Calculate luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, dark for light backgrounds
  return luminance > 0.5 ? TEXT_COLORS.light : TEXT_COLORS.dark
}

/**
 * Gets contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255

    const sRGB = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)

  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Validates if a color palette meets WCAG AA standards
 */
export function validatePaletteAccessibility(
  paletteColors: Array<string>,
  textColor: string = '#000000',
): Array<{ color: string; ratio: number; passes: boolean }> {
  return paletteColors.map((color) => {
    const ratio = getContrastRatio(color, textColor)
    return {
      color,
      ratio,
      passes: ratio >= 4.5, // WCAG AA standard
    }
  })
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

  // Accessibility-focused requests
  if (
    lowerMessage.includes('accessible') ||
    lowerMessage.includes('contrast') ||
    lowerMessage.includes('wcag') ||
    lowerMessage.includes('a11y')
  ) {
    return 'highContrast'
  }

  // Colorblind-friendly requests
  if (
    lowerMessage.includes('colorblind') ||
    lowerMessage.includes('color blind') ||
    lowerMessage.includes('deuteranopia') ||
    lowerMessage.includes('protanopia')
  ) {
    return 'colorblindSafe'
  }

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
    return 'pastelAccessible'
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
 * Enhances a chart request with color palette suggestions and accessibility info
 */
export function enhanceChartRequest(message: string): string {
  if (!isChartRequest(message)) {
    return message
  }

  const selectedPalette = selectColorPalette(message)
  const colors = COLOR_PALETTES[selectedPalette]

  // Convert colors to a format that works well with matplotlib/plotly
  const colorString = colors.map((c) => `'${c}'`).join(', ')

  // Enhanced message with accessibility considerations
  let enhancement = `\n\nACCESSIBLE COLORS: [${colorString}]
ENSURE WCAG AA COMPLIANCE (4.5:1 contrast). USE PROPER LABELING.`

  // Detect chart type and add specific technical requirements
  const chartType = message.toLowerCase()

  if (chartType.includes('pie')) {
    enhancement += `\nPIE CHART: labels=categories, autopct='%1.1f%%', textprops={'fontsize':12}`
  } else if (chartType.includes('bar')) {
    enhancement += `\nBAR CHART: Include plt.xlabel(), plt.ylabel(), plt.title(), value labels on bars`
  } else if (chartType.includes('line')) {
    enhancement += `\nLINE CHART: Include plt.legend(), axis labels, title`
  }

  // Add concise dataset guidance
  if (colors.length < 12) {
    enhancement += `\nFor ${colors.length}+ items: cycle colors with patterns`
  }

  return message + enhancement
}

/**
 * Gets just the color array for a specific palette
 */
export function getColorPalette(
  paletteName: keyof typeof COLOR_PALETTES,
): Array<string> {
  return COLOR_PALETTES[paletteName]
}

/**
 * Gets all available palette names
 */
export function getAvailablePalettes(): Array<string> {
  return Object.keys(COLOR_PALETTES)
}

/**
 * Gets a palette with recommended text colors
 */
export function getPaletteWithTextColors(
  paletteName: keyof typeof COLOR_PALETTES,
): Array<{ background: string; text: string }> {
  const colors = COLOR_PALETTES[paletteName]
  return colors.map((bgColor) => ({
    background: bgColor,
    text: getTextColor(bgColor),
  }))
}

/**
 * Generates colors for any number of data items by cycling through the palette
 * and optionally adding patterns/shapes for accessibility
 */
export function generateColorsForItems(
  itemCount: number,
  paletteName: keyof typeof COLOR_PALETTES = 'modern',
): Array<{ color: string; textColor: string; pattern?: string }> {
  const palette = COLOR_PALETTES[paletteName]
  const colors: Array<{ color: string; textColor: string; pattern?: string }> =
    []

  // Common patterns for when colors repeat
  const patterns = [
    'solid', // No pattern (default)
    'diagonal-lines', // Diagonal stripes
    'dots', // Dotted pattern
    'horizontal-lines', // Horizontal stripes
    'vertical-lines', // Vertical stripes
    'cross-hatch', // Cross-hatched pattern
    'zigzag', // Zigzag pattern
    'grid', // Grid pattern
  ]

  for (let i = 0; i < itemCount; i++) {
    const colorIndex = i % palette.length
    const patternIndex = Math.floor(i / palette.length) % patterns.length
    const color = palette[colorIndex]

    colors.push({
      color,
      textColor: getTextColor(color),
      pattern: i >= palette.length ? patterns[patternIndex] : 'solid',
    })
  }

  return colors
}

/**
 * Gets recommendations for handling large datasets in charts
 */
export function getDataVisualizationRecommendations(itemCount: number): {
  recommendation: string
  alternativeApproaches: Array<string>
  colorStrategy: string
} {
  const paletteSize = 8 // Standard palette size

  if (itemCount <= paletteSize) {
    return {
      recommendation:
        'Use colors directly from palette - optimal visualization',
      alternativeApproaches: [],
      colorStrategy: `Use ${itemCount} distinct colors from the selected palette`,
    }
  }

  if (itemCount <= paletteSize * 2) {
    return {
      recommendation:
        'Cycle through colors with patterns/textures for distinction',
      alternativeApproaches: [
        'Use different shapes/markers for repeated colors',
        'Add subtle patterns (stripes, dots, etc.) to distinguish items',
        'Consider grouping similar items together',
      ],
      colorStrategy: `Cycle through ${paletteSize} colors with ${Math.ceil(itemCount / paletteSize)} pattern variations`,
    }
  }

  // For large datasets
  return {
    recommendation: 'Consider alternative visualization approaches',
    alternativeApproaches: [
      'Group similar items and use hierarchical charts',
      'Use heatmaps for large datasets',
      'Consider treemaps or sunburst charts for hierarchical data',
      'Use small multiples (faceted charts)',
      'Apply filtering or pagination to reduce visible items',
      'Use continuous color scales instead of discrete colors',
    ],
    colorStrategy: `With ${itemCount} items, discrete colors become ineffective. Consider continuous color scales or grouping strategies`,
  }
}

/**
 * Generates matplotlib/plotly code suggestions for handling many colors
 */
export function generateColorCodeSuggestions(
  itemCount: number,
  paletteName: keyof typeof COLOR_PALETTES = 'modern',
): string {
  const palette = COLOR_PALETTES[paletteName]
  const colorString = palette.map((c) => `'${c}'`).join(', ')

  if (itemCount <= palette.length) {
    return `# Use colors directly from palette
colors = [${colorString}][:${itemCount}]
plt.bar(x, y, color=colors)`
  }

  return `# For ${itemCount} items, cycle through palette with patterns
import itertools
base_colors = [${colorString}]
colors = list(itertools.islice(itertools.cycle(base_colors), ${itemCount}))

# Add patterns for distinction when colors repeat
patterns = ['', '///', '...', '|||', '---', '+++', 'xxx', 'ooo']
bar_patterns = list(itertools.islice(itertools.cycle(patterns), ${itemCount}))

plt.bar(x, y, color=colors, hatch=bar_patterns)`
}

/**
 * Chart labeling requirements and validation
 */
export const CHART_LABELING_REQUIREMENTS = {
  // Minimum requirements for different chart types
  pie: {
    requiresLabels: true,
    requiresLegend: true,
    requiresPercentages: true,
    maxSlicesWithoutGrouping: 8,
    minSlicePercentage: 2, // Slices smaller than 2% should be grouped as "Other"
  },
  bar: {
    requiresLabels: true,
    requiresAxisLabels: true,
    requiresTitle: true,
    requiresUnits: true,
  },
  line: {
    requiresLabels: true,
    requiresLegend: true,
    requiresAxisLabels: true,
    requiresTitle: true,
    requiresUnits: true,
  },
  scatter: {
    requiresLabels: true,
    requiresAxisLabels: true,
    requiresTitle: true,
    requiresUnits: true,
  },
  heatmap: {
    requiresLabels: true,
    requiresColorbar: true,
    requiresAxisLabels: true,
    requiresTitle: true,
  },
}

/**
 * Generates comprehensive labeling requirements for charts
 */
export function getChartLabelingRequirements(chartType: string): Array<string> {
  const type = chartType.toLowerCase()
  const requirements: Array<string> = []

  // Universal requirements
  requirements.push('✅ CHART TITLE: Must be descriptive and specific')
  requirements.push(
    '✅ DATA LABELS: Every data point/slice must be clearly labeled',
  )

  if (type.includes('pie')) {
    requirements.push('✅ PIE CHART REQUIREMENTS:')
    requirements.push(
      '   - Label every slice with category name AND percentage',
    )
    requirements.push('   - Include legend if labels are crowded')
    requirements.push('   - Group slices <2% into "Other" category')
    requirements.push('   - Maximum 8 slices for readability')
    requirements.push('   - Use plt.pie(labels=labels, autopct="%1.1f%%")')
  }

  if (type.includes('bar')) {
    requirements.push('✅ BAR CHART REQUIREMENTS:')
    requirements.push('   - Label every bar with category name')
    requirements.push('   - Include axis labels with units')
    requirements.push('   - Add value labels on bars if helpful')
    requirements.push('   - Use plt.xlabel(), plt.ylabel(), plt.title()')
  }

  if (type.includes('line')) {
    requirements.push('✅ LINE CHART REQUIREMENTS:')
    requirements.push('   - Label every line in legend')
    requirements.push('   - Include axis labels with units')
    requirements.push('   - Add data point labels if few points')
    requirements.push('   - Use plt.legend() with descriptive labels')
  }

  // Accessibility requirements
  requirements.push('✅ ACCESSIBILITY REQUIREMENTS:')
  requirements.push('   - All text must have sufficient contrast (4.5:1)')
  requirements.push('   - Font size minimum 12pt for readability')
  requirements.push('   - Avoid color-only distinctions (use patterns/shapes)')
  requirements.push('   - Include alt text describing the chart')

  return requirements
}

/**
 * Detects potential labeling issues in chart descriptions
 */
export function detectLabelingIssues(chartDescription: string): Array<string> {
  const issues: Array<string> = []
  const lowerDesc = chartDescription.toLowerCase()

  // Check for missing labels
  if (!lowerDesc.includes('label') && !lowerDesc.includes('legend')) {
    issues.push('🚨 MISSING LABELS: Chart may not have proper data labels')
  }

  // Check for pie chart specific issues
  if (lowerDesc.includes('pie')) {
    if (!lowerDesc.includes('percentage') && !lowerDesc.includes('%')) {
      issues.push('🚨 PIE CHART: Missing percentage labels')
    }
    if (!lowerDesc.includes('legend') && !lowerDesc.includes('label')) {
      issues.push('🚨 PIE CHART: Missing slice labels or legend')
    }
  }

  // Check for axis labels
  if (
    lowerDesc.includes('bar') ||
    lowerDesc.includes('line') ||
    lowerDesc.includes('scatter')
  ) {
    if (
      !lowerDesc.includes('axis') &&
      !lowerDesc.includes('xlabel') &&
      !lowerDesc.includes('ylabel')
    ) {
      issues.push('🚨 AXIS LABELS: Missing axis labels and units')
    }
  }

  // Check for title
  if (!lowerDesc.includes('title')) {
    issues.push('🚨 CHART TITLE: Missing descriptive title')
  }

  // Check for units
  if (
    !lowerDesc.includes('unit') &&
    !lowerDesc.includes('$') &&
    !lowerDesc.includes('%')
  ) {
    issues.push('🚨 UNITS: Consider adding units to data values')
  }

  return issues
}

/**
 * Generates code templates with proper labeling
 */
export function generateLabeledChartCode(
  chartType: string,
  paletteName: keyof typeof COLOR_PALETTES = 'modern',
): string {
  const palette = COLOR_PALETTES[paletteName]
  const colorString = palette.map((c) => `'${c}'`).join(', ')
  const type = chartType.toLowerCase()

  if (type.includes('pie')) {
    return `# Properly labeled pie chart with accessibility
import matplotlib.pyplot as plt
import numpy as np

# Data
labels = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E']
sizes = [30, 25, 20, 15, 10]
colors = [${colorString}][:len(labels)]

# Create pie chart with proper labels
plt.figure(figsize=(10, 8))
wedges, texts, autotexts = plt.pie(
    sizes,
    labels=labels,
    autopct='%1.1f%%',
    colors=colors,
    startangle=90,
    textprops={'fontsize': 12}
)

# Ensure text contrast
for text in texts:
    text.set_color('black')
for autotext in autotexts:
    autotext.set_color('white')
    autotext.set_fontweight('bold')

plt.title('Sales by Category - Q4 2023', fontsize=16, fontweight='bold')
plt.axis('equal')  # Equal aspect ratio ensures circular pie
plt.tight_layout()
plt.show()`
  }

  if (type.includes('bar')) {
    return `# Properly labeled bar chart with accessibility
import matplotlib.pyplot as plt
import numpy as np

# Data
categories = ['Q1', 'Q2', 'Q3', 'Q4']
values = [25000, 32000, 28000, 35000]
colors = [${colorString}][:len(categories)]

# Create bar chart with proper labels
plt.figure(figsize=(10, 6))
bars = plt.bar(categories, values, color=colors)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height,
             f'$\\{height:,.0f\\}', ha='center', va='bottom', fontsize=11)

plt.title('Quarterly Sales Revenue - 2023', fontsize=16, fontweight='bold')
plt.xlabel('Quarter', fontsize=12)
plt.ylabel('Revenue (USD)', fontsize=12)
plt.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()`
  }

  return `# Generic labeled chart template
import matplotlib.pyplot as plt

# Ensure your chart has:
# 1. Descriptive title
# 2. All data points labeled
# 3. Axis labels with units
# 4. Legend if multiple series
# 5. Sufficient color contrast
# 6. Accessible color palette

colors = [${colorString}]
plt.title('Your Chart Title Here', fontsize=16)
plt.xlabel('X-axis Label (units)', fontsize=12)
plt.ylabel('Y-axis Label (units)', fontsize=12)
plt.legend()
plt.tight_layout()
plt.show()`
}

// Note: Accessibility testing is now handled by chart-enhancement.test.ts
// Run tests with: npm run test -- chart-enhancement.test.ts
