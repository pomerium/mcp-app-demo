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

/**
 * Generates the system prompt, conditionally including code interpreter instructions
 * based on model support
 */
export function getSystemPrompt(model: string): string {
  const basePrompt = BASE_SYSTEM_PROMPT

  if (isCodeInterpreterSupported(model)) {
    return basePrompt + CODE_INTERPRETER_INSTRUCTIONS
  }

  return basePrompt
}

// For backwards compatibility
export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT
