/**
 * CSS Validator Utility
 * Validates CSS syntax to catch common errors before export
 */

interface CSSValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates CSS for common syntax errors
 * Checks:
 * - Matching brackets { }
 * - Proper selector formatting
 * - Property:value syntax
 */
export function validateCSS(css: string): CSSValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!css || css.trim().length === 0) {
    errors.push("CSS content is empty")
    return { isValid: false, errors, warnings }
  }

  // Check bracket matching
  const bracketResult = validateBrackets(css)
  if (!bracketResult.isValid) {
    errors.push(...bracketResult.errors)
  }

  // Check for unclosed rules
  const ruleResult = validateRules(css)
  if (!ruleResult.isValid) {
    errors.push(...ruleResult.errors)
  }
  warnings.push(...ruleResult.warnings)

  // Check for basic syntax issues
  const syntaxResult = validateSyntax(css)
  if (!syntaxResult.isValid) {
    errors.push(...syntaxResult.errors)
  }
  warnings.push(...syntaxResult.warnings)

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates bracket matching
 */
function validateBrackets(css: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  let openCount = 0
  let closeCount = 0
  const stack = []

  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      openCount++
      stack.push(i)
    } else if (css[i] === "}") {
      closeCount++
      if (stack.length > 0) {
        stack.pop()
      } else {
        errors.push(`Closing bracket } at position ${i} has no matching opening bracket {`)
      }
    }
  }

  if (stack.length > 0) {
    const positions = stack.map(pos => `position ${pos}`).join(", ")
    errors.push(`Found ${stack.length} unclosed opening bracket(s) at ${positions}`)
  }

  if (openCount !== closeCount) {
    errors.push(
      `Bracket mismatch: ${openCount} opening brackets { but ${closeCount} closing brackets }`
    )
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates CSS rules structure
 */
function validateRules(css: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Split by rules and check each
  const rulePattern = /([^{]*){([^}]*)}/g
  let match
  let ruleCount = 0

  while ((match = rulePattern.exec(css)) !== null) {
    ruleCount++
    const selector = match[1].trim()
    const content = match[2].trim()

    // Warn about empty selectors
    if (!selector || selector.length === 0) {
      warnings.push(`Rule ${ruleCount}: Empty selector found`)
    }

    // Warn about empty content
    if (!content || content.length === 0) {
      warnings.push(`Rule ${ruleCount}: Empty rule content for selector "${selector}"`)
    }

    // Check for property:value syntax
    const properties = content.split(";").filter(p => p.trim().length > 0)
    properties.forEach((prop, index) => {
      if (!prop.includes(":")) {
        errors.push(
          `Rule ${ruleCount}: Property #${index + 1} is missing colon: "${prop.trim()}"`
        )
      }
    })
  }

  // Check if there are any rules at all
  if (ruleCount === 0 && css.trim().includes("{") && css.trim().includes("}")) {
    warnings.push("No properly formatted rules found in CSS")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates basic CSS syntax
 */
function validateSyntax(css: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for common placeholder issues
  const unreplacedPlaceholders = css.match(/\$\{[\w]+\}/g)
  if (unreplacedPlaceholders && unreplacedPlaceholders.length > 0) {
    warnings.push(
      `Found ${unreplacedPlaceholders.length} unreplaced template placeholder(s): ${unreplacedPlaceholders.join(", ")}`
    )
  }

  // Check for malformed selectors
  const badSelectorPattern = /^\s*[\s,]*$/gm
  const lines = css.split("\n")
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    // Check lines that appear to be selectors (before {)
    if (trimmedLine.includes("{") && !trimmedLine.includes("}")) {
      const selector = trimmedLine.substring(0, trimmedLine.indexOf("{")).trim()
      if (!selector || selector.length === 0) {
        errors.push(`Line ${index + 1}: Empty selector before {`)
      }
    }
  })

  // Warn about double semicolons
  if (css.includes(";;")) {
    const count = (css.match(/;;/g) || []).length
    warnings.push(`Found ${count} double semicolon(s) ;; (may cause parsing issues)`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Format validation results for display
 */
export function formatValidationResults(result: CSSValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return "✓ CSS is valid with no issues"
  }

  let message = ""

  if (result.errors.length > 0) {
    message += `❌ CSS Errors (${result.errors.length}):\n`
    result.errors.forEach(error => {
      message += `  • ${error}\n`
    })
  }

  if (result.warnings.length > 0) {
    message += `⚠️  CSS Warnings (${result.warnings.length}):\n`
    result.warnings.forEach(warning => {
      message += `  • ${warning}\n`
    })
  }

  return message
}
