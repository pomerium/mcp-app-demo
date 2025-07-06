import { describe, it, expect } from 'vitest'
import {
  COLOR_PALETTES,
  getTextColor,
  getContrastRatio,
  validatePaletteAccessibility,
  selectColorPalette,
  isChartRequest,
  enhanceChartRequest,
  getColorPalette,
  generateColorsForItems,
  getDataVisualizationRecommendations,
  generateColorCodeSuggestions,
  getChartLabelingRequirements,
  detectLabelingIssues,
  generateLabeledChartCode,
} from './chart-enhancement'

describe('Chart Enhancement Accessibility', () => {
  describe('Color Palette Accessibility', () => {
    it('should ensure all color palettes meet WCAG AA standards (4.5:1 contrast)', () => {
      Object.entries(COLOR_PALETTES).forEach(([paletteName, colors]) => {
        colors.forEach((color) => {
          const textColor = getTextColor(color)
          const contrastRatio = getContrastRatio(color, textColor)

          expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio).toBeLessThanOrEqual(21) // Maximum possible contrast ratio
        })
      })
    })

    it('should have high contrast palette with highest contrast ratios', () => {
      const highContrastColors = COLOR_PALETTES.highContrast
      const modernColors = COLOR_PALETTES.modern

      // High contrast palette should generally have higher contrast ratios
      const highContrastAvg =
        highContrastColors.reduce((sum, color) => {
          const textColor = getTextColor(color)
          return sum + getContrastRatio(color, textColor)
        }, 0) / highContrastColors.length

      const modernAvg =
        modernColors.reduce((sum, color) => {
          const textColor = getTextColor(color)
          return sum + getContrastRatio(color, textColor)
        }, 0) / modernColors.length

      expect(highContrastAvg).toBeGreaterThan(modernAvg)
    })

    it('should validate that all colors are valid hex codes', () => {
      Object.values(COLOR_PALETTES).forEach((colors) => {
        colors.forEach((color) => {
          // Should be valid hex color format
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)

          // Should be parseable as hex
          const hex = color.replace('#', '')
          expect(parseInt(hex, 16)).not.toBeNaN()
        })
      })
    })

    it('should return appropriate text colors for backgrounds', () => {
      // Test with known light and dark colors
      const lightColor = '#FFFFFF' // White
      const darkColor = '#000000' // Black

      expect(getTextColor(lightColor)).toBe('#1F2937') // Should return dark text
      expect(getTextColor(darkColor)).toBe('#FFFFFF') // Should return white text
    })

    it('should calculate contrast ratios correctly', () => {
      // Test with known contrast ratios
      const whiteOnBlack = getContrastRatio('#FFFFFF', '#000000')
      const blackOnWhite = getContrastRatio('#000000', '#FFFFFF')

      expect(whiteOnBlack).toBe(21) // Maximum contrast
      expect(blackOnWhite).toBe(21) // Should be symmetric

      // Same color should have ratio of 1
      const sameColor = getContrastRatio('#FF0000', '#FF0000')
      expect(sameColor).toBe(1)
    })

    it('should validate palette accessibility correctly', () => {
      const testColors = ['#000000', '#FFFFFF', '#FF0000']
      const results = validatePaletteAccessibility(testColors, '#FFFFFF')

      expect(results).toHaveLength(3)
      results.forEach((result) => {
        expect(result).toHaveProperty('color')
        expect(result).toHaveProperty('ratio')
        expect(result).toHaveProperty('passes')
        expect(typeof result.ratio).toBe('number')
        expect(typeof result.passes).toBe('boolean')
      })
    })
  })

  describe('Chart Request Detection', () => {
    it('should detect chart requests correctly', () => {
      const chartRequests = [
        'Create a bar chart',
        'Show me a graph of sales',
        'Plot the data',
        'Generate a visualization',
        'Make a pie chart',
        'Draw a histogram',
        'Display trends',
        'Create a matplotlib chart',
      ]

      chartRequests.forEach((request) => {
        expect(isChartRequest(request)).toBe(true)
      })
    })

    it('should not detect non-chart requests', () => {
      const nonChartRequests = [
        'Hello world',
        'Calculate the sum',
        'Write a function',
        'Explain the algorithm',
        'Fix the bug',
      ]

      nonChartRequests.forEach((request) => {
        expect(isChartRequest(request)).toBe(false)
      })
    })
  })

  describe('Palette Selection', () => {
    it('should select appropriate palettes based on context', () => {
      expect(selectColorPalette('accessible chart')).toBe('highContrast')
      expect(selectColorPalette('colorblind friendly')).toBe('colorblindSafe')
      expect(selectColorPalette('business sales chart')).toBe('modern')
      expect(selectColorPalette('marketing visualization')).toBe('vibrant')
      expect(selectColorPalette('financial analysis')).toBe('cool')
      expect(selectColorPalette('gentle pastel chart')).toBe('pastelAccessible')
      expect(selectColorPalette('warm friendly chart')).toBe('warm')
      expect(selectColorPalette('simple chart')).toBe('modern') // default
    })

    it('should return valid palette colors', () => {
      Object.keys(COLOR_PALETTES).forEach((paletteName) => {
        const colors = getColorPalette(
          paletteName as keyof typeof COLOR_PALETTES,
        )
        expect(colors).toBeInstanceOf(Array)
        expect(colors.length).toBeGreaterThan(0)
        colors.forEach((color) => {
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        })
      })
    })
  })

  describe('Chart Enhancement', () => {
    it('should enhance chart requests with color information', () => {
      const originalMessage = 'Create a bar chart'
      const enhanced = enhanceChartRequest(originalMessage)

      expect(enhanced).toContain(originalMessage)
      expect(enhanced).toContain('ACCESSIBLE COLORS')
      expect(enhanced).toContain('WCAG AA COMPLIANCE')
      expect(enhanced).toContain('USE PROPER LABELING')
      expect(enhanced).toContain('BAR CHART:')
    })

    it('should not enhance non-chart requests', () => {
      const originalMessage = 'Hello world'
      const enhanced = enhanceChartRequest(originalMessage)

      expect(enhanced).toBe(originalMessage)
    })
  })

  describe('Regression Tests', () => {
    it('should prevent accessibility regressions when colors are changed', () => {
      // This test will fail if someone changes colors to inaccessible ones
      const criticalPalettes = ['highContrast', 'colorblindSafe', 'modern']

      criticalPalettes.forEach((paletteName) => {
        const colors =
          COLOR_PALETTES[paletteName as keyof typeof COLOR_PALETTES]

        // Test each color with its appropriate text color
        colors.forEach((color) => {
          const textColor = getTextColor(color)
          const contrastRatio = getContrastRatio(color, textColor)

          expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
        })
      })
    })

    it('should maintain minimum palette sizes', () => {
      Object.entries(COLOR_PALETTES).forEach(([paletteName, colors]) => {
        // Each palette should have at least 4 colors for variety
        expect(colors.length).toBeGreaterThanOrEqual(4)
        // But not too many to avoid overwhelming visualizations
        expect(colors.length).toBeLessThanOrEqual(12)
      })
    })
  })

  describe('Large Dataset Handling', () => {
    it('should generate colors for any number of items', () => {
      const result = generateColorsForItems(12, 'modern')

      expect(result).toHaveLength(12)
      expect(result[0].pattern).toBe('solid') // First 8 should be solid
      expect(result[7].pattern).toBe('solid')
      expect(result[8].pattern).toBe('diagonal-lines') // 9th should have pattern
      expect(result[11].pattern).toBe('diagonal-lines') // 12th item pattern index is 1

      // Each item should have color and text color
      result.forEach((item) => {
        expect(item.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(item.textColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(typeof item.pattern).toBe('string')
      })
    })

    it('should provide appropriate recommendations for different dataset sizes', () => {
      // Small dataset
      const smallRec = getDataVisualizationRecommendations(5)
      expect(smallRec.recommendation).toContain('optimal visualization')
      expect(smallRec.alternativeApproaches).toHaveLength(0)

      // Medium dataset
      const mediumRec = getDataVisualizationRecommendations(12)
      expect(mediumRec.recommendation).toContain('patterns')
      expect(mediumRec.alternativeApproaches.length).toBeGreaterThan(0)

      // Large dataset
      const largeRec = getDataVisualizationRecommendations(25)
      expect(largeRec.recommendation).toContain('alternative visualization')
      expect(largeRec.alternativeApproaches).toContain(
        'Use heatmaps for large datasets',
      )
    })

    it('should generate appropriate code suggestions', () => {
      // Small dataset
      const smallCode = generateColorCodeSuggestions(5, 'modern')
      expect(smallCode).toContain('Use colors directly')
      expect(smallCode).toContain('[:5]')

      // Large dataset
      const largeCode = generateColorCodeSuggestions(15, 'modern')
      expect(largeCode).toContain('cycle through palette')
      expect(largeCode).toContain('itertools')
      expect(largeCode).toContain('hatch=bar_patterns')
    })

    it('should cycle through patterns correctly', () => {
      const result = generateColorsForItems(20, 'modern')

      // Check that patterns repeat correctly
      expect(result[0].pattern).toBe('solid')
      expect(result[8].pattern).toBe('diagonal-lines')
      expect(result[16].pattern).toBe('dots') // Pattern index 2 for items 16-23

      // Check that colors cycle correctly
      expect(result[0].color).toBe(result[8].color)
      expect(result[1].color).toBe(result[9].color)
    })
  })

  describe('Chart Labeling Requirements', () => {
    it('should provide labeling requirements for different chart types', () => {
      const pieRequirements = getChartLabelingRequirements('pie chart')
      expect(pieRequirements).toContain('✅ PIE CHART REQUIREMENTS:')
      expect(pieRequirements.some((req) => req.includes('every slice'))).toBe(
        true,
      )

      const barRequirements = getChartLabelingRequirements('bar chart')
      expect(barRequirements).toContain('✅ BAR CHART REQUIREMENTS:')
      expect(barRequirements.some((req) => req.includes('axis labels'))).toBe(
        true,
      )
    })

    it('should detect labeling issues in chart descriptions', () => {
      const issuesWithMissingLabels = detectLabelingIssues('create a pie chart')
      expect(issuesWithMissingLabels.length).toBeGreaterThan(0)
      expect(
        issuesWithMissingLabels.some((issue) =>
          issue.includes('MISSING LABELS'),
        ),
      ).toBe(true)

      const goodDescription = detectLabelingIssues(
        'create a pie chart with labels and percentages and title',
      )
      expect(goodDescription.length).toBeLessThan(
        issuesWithMissingLabels.length,
      )
    })

    it('should generate proper code templates with labels', () => {
      const pieCode = generateLabeledChartCode('pie chart')
      expect(pieCode).toContain('plt.pie(')
      expect(pieCode).toContain('labels=labels')
      expect(pieCode).toContain('autopct=')
      expect(pieCode).toContain('plt.title(')

      const barCode = generateLabeledChartCode('bar chart')
      expect(barCode).toContain('plt.bar(')
      expect(barCode).toContain('plt.xlabel(')
      expect(barCode).toContain('plt.ylabel(')
      expect(barCode).toContain('plt.title(')
    })

    it('should include labeling requirements in enhanced chart requests', () => {
      const enhanced = enhanceChartRequest('Create a pie chart')
      expect(enhanced).toContain('USE PROPER LABELING')
      expect(enhanced).toContain('PIE CHART:')
      expect(enhanced).toContain('labels=categories')
      expect(enhanced).toContain('autopct=')
    })
  })
})
