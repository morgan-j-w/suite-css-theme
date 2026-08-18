// WCAG Contrast Ratio Calculator
// Based on WCAG 2.1 guidelines

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const { r, g, b } = rgb
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text, 3:1 for large text)
 */
export function meetsWCAG_AA(ratio: number, largeText: boolean = false): boolean {
  return largeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Check if contrast ratio meets WCAG AAA standard (7:1 for normal text, 4.5:1 for large text)
 */
export function meetsWCAG_AAA(ratio: number, largeText: boolean = false): boolean {
  return largeText ? ratio >= 4.5 : ratio >= 7
}

/**
 * WCAG large-text threshold: 24px at normal weight, or 18.66px at bold (700+).
 * Lives here so the generator and the checker cannot apply different rules.
 */
export function isLargeTextForWCAG(sizePx: number, fontWeight: number): boolean {
  return fontWeight >= 700 ? sizePx >= 18.66 : sizePx >= 24
}

export interface TextEvaluationConfig {
  headingLargeText?: boolean
  bodyLargeText?: boolean
  linkLargeText?: boolean
  buttonLargeText?: boolean
  iconLargeText?: boolean
}

interface ContrastCheck {
  ratio: number
  aa: boolean
  aaa: boolean
  largeText: boolean
  requiredAa: number
  requiredAaa: number
}

/**
 * Check all color combinations for a style
 */
export interface ContrastResults {
  headingOnBg: ContrastCheck
  bodyTextOnBg: ContrastCheck
  linkOnBg: ContrastCheck
  buttonTextOnButtonBg: ContrastCheck
  buttonBgOnBg: ContrastCheck
  iconOnBg: ContrastCheck
}

export function checkAllContrasts(
  bgColor: string,
  headingColor: string,
  bodyTextColor: string,
  linkColor: string,
  buttonBg: string,
  buttonText: string,
  iconColor: string = "#000000",
  config: TextEvaluationConfig = {},
  /**
   * The colour that actually delineates the button against the page. For a
   * filled button that is the fill, but a bordered button is identified by its
   * border, which is what WCAG 1.4.11 measures. Defaults to the fill.
   */
  buttonBoundaryColor?: string,
): ContrastResults {
  const headingLargeText = config.headingLargeText ?? false
  const bodyLargeText = config.bodyLargeText ?? false
  const linkLargeText = config.linkLargeText ?? false
  const buttonLargeText = config.buttonLargeText ?? true
  const iconLargeText = config.iconLargeText ?? false

  const headingRatio = getContrastRatio(bgColor, headingColor)
  const bodyRatio = getContrastRatio(bgColor, bodyTextColor)
  const linkRatio = getContrastRatio(bgColor, linkColor)
  const buttonRatio = getContrastRatio(buttonBg, buttonText)
  const buttonBgRatio = getContrastRatio(bgColor, buttonBoundaryColor || buttonBg)
  const iconRatio = getContrastRatio(bgColor, iconColor)

  return {
    headingOnBg: {
      ratio: parseFloat(headingRatio.toFixed(2)),
      aa: meetsWCAG_AA(headingRatio, headingLargeText),
      aaa: meetsWCAG_AAA(headingRatio, headingLargeText),
      largeText: headingLargeText,
      requiredAa: headingLargeText ? 3 : 4.5,
      requiredAaa: headingLargeText ? 4.5 : 7,
    },
    bodyTextOnBg: {
      ratio: parseFloat(bodyRatio.toFixed(2)),
      aa: meetsWCAG_AA(bodyRatio, bodyLargeText),
      aaa: meetsWCAG_AAA(bodyRatio, bodyLargeText),
      largeText: bodyLargeText,
      requiredAa: bodyLargeText ? 3 : 4.5,
      requiredAaa: bodyLargeText ? 4.5 : 7,
    },
    linkOnBg: {
      ratio: parseFloat(linkRatio.toFixed(2)),
      aa: meetsWCAG_AA(linkRatio, linkLargeText),
      aaa: meetsWCAG_AAA(linkRatio, linkLargeText),
      largeText: linkLargeText,
      requiredAa: linkLargeText ? 3 : 4.5,
      requiredAaa: linkLargeText ? 4.5 : 7,
    },
    buttonTextOnButtonBg: {
      ratio: parseFloat(buttonRatio.toFixed(2)),
      aa: meetsWCAG_AA(buttonRatio, buttonLargeText),
      aaa: meetsWCAG_AAA(buttonRatio, buttonLargeText),
      largeText: buttonLargeText,
      requiredAa: buttonLargeText ? 3 : 4.5,
      requiredAaa: buttonLargeText ? 4.5 : 7,
    },
    // WCAG 1.4.11 (non-text contrast): component boundaries require at least
    // 3:1. Measured against the border when the button has one, since that is
    // the visual information identifying the component.
    buttonBgOnBg: {
      ratio: parseFloat(buttonBgRatio.toFixed(2)),
      aa: buttonBgRatio >= 3,
      aaa: buttonBgRatio >= 3,
      largeText: false,
      requiredAa: 3,
      requiredAaa: 3,
    },
    iconOnBg: {
      ratio: parseFloat(iconRatio.toFixed(2)),
      aa: meetsWCAG_AA(iconRatio, iconLargeText),
      aaa: meetsWCAG_AAA(iconRatio, iconLargeText),
      largeText: iconLargeText,
      requiredAa: iconLargeText ? 3 : 4.5,
      requiredAaa: iconLargeText ? 4.5 : 7,
    },
  }
}

/**
 * Get overall compliance level
 */
export function getComplianceLevel(results: ContrastResults): "AAA" | "AA" | "FAIL" {
  const allCombinations = [
    results.headingOnBg,
    results.bodyTextOnBg,
    results.linkOnBg,
    results.buttonTextOnButtonBg,
    results.buttonBgOnBg,
    results.iconOnBg,
  ]

  const allAAA = allCombinations.every((c) => c.aaa)
  const allAA = allCombinations.every((c) => c.aa)

  if (allAAA) return "AAA"
  if (allAA) return "AA"
  return "FAIL"
}
