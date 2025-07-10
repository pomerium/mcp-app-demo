import { enhanceChartRequest } from './chart-enhancement'

const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant that communicates using properly formatted markdown. Follow these strict formatting rules:

MARKDOWN FORMATTING REQUIREMENTS:
1. **Lists**: Always keep list items on the same line as the marker
   - ✅ CORRECT: "1. Lorem ipsum dolor sit amet..."
   - ❌ WRONG: "1.  \\nLorem ipsum dolor sit amet..."

2. **No line breaks after list markers**: Never put a line break immediately after numbered lists (1. 2. 3.) or bullet lists (- * +)

3. **Proper list syntax**:
   - Numbered lists: "1. Content here"
   - Bullet lists: "- Content here" or "* Content here"
   - No extra spaces or line breaks between marker and content

4. **Other markdown**: Use standard markdown for headers, emphasis, links, tables, and code blocks

5. **Consistency**: Maintain consistent formatting throughout your response

Remember: Keep list content on the same line as the list marker to ensure proper rendering.`

const CODE_INTERPRETER_INSTRUCTIONS = `

CODE INTERPRETER USAGE:
When calculations, data analysis, or code execution is required, use the code interpreter tool for:
- Mathematical calculations and computations
- Data analysis and visualization
- Code execution and testing
- Statistical analysis
- Graph generation and plotting

Only use the code interpreter tool when it's actually needed for calculations or code execution, not for simple explanations or text-based responses.`

/**
 * Checks if the given model supports code interpreter functionality
 * Updated: Only allow models that are officially supported by OpenAI for code interpreter.
 * See: https://platform.openai.com/docs/guides/tools-code-interpreter
 */
const CODE_INTERPRETER_SUPPORTED_MODELS = Object.freeze(
  new Set([
    // Official OpenAI models with code interpreter support (as of June 2024)
    'gpt-4o',
    'gpt-4.1',
    'gpt-4',
    'o4-mini',
    'o3',
  ]),
)

export function isCodeInterpreterSupported(model: string): boolean {
  if (!model) return false
  const normalizedModel = model.toLowerCase().replace(/\s+/g, '')

  return CODE_INTERPRETER_SUPPORTED_MODELS.has(normalizedModel)
}

/**
 * Enhances the system prompt with chart creation instructions if the latest user message is a chart request
 */
function enhanceSystemPromptForCharts(
  baseSystemPrompt: string,
  latestUserMessage: string,
): string {
  const enhancedMessage = enhanceChartRequest(latestUserMessage)

  if (enhancedMessage !== latestUserMessage) {
    // Extract just the enhancement part (everything after the original message)
    const enhancement = enhancedMessage.substring(latestUserMessage.length)
    return `${baseSystemPrompt}\n\nCHART CREATION INSTRUCTIONS (for chart requests only):${enhancement}\n\nIMPORTANT: Follow these instructions when creating charts, but DO NOT mention accessibility features, color guidelines, or technical requirements in your response unless specifically asked. Just create the chart following these standards silently.`
  }

  return baseSystemPrompt
}

/**
 * Generates the system prompt, conditionally including code interpreter instructions
 * based on user toggle and chart enhancement for chart requests
 */
export function getSystemPrompt(
  codeInterpreter: boolean,
  latestUserMessage?: string,
): string {
  const basePrompt = BASE_SYSTEM_PROMPT

  let systemPrompt = basePrompt
  if (codeInterpreter) {
    systemPrompt += CODE_INTERPRETER_INSTRUCTIONS
  }

  // Enhance with chart instructions if applicable
  if (latestUserMessage) {
    systemPrompt = enhanceSystemPromptForCharts(systemPrompt, latestUserMessage)
  }

  return systemPrompt
}

// For backwards compatibility
export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT
