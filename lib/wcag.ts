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
 * Check all color combinations for a style
 */
export interface ContrastResults {
  headingOnBg: {
    ratio: number
    aa: boolean
    aaa: boolean
  }
  bodyTextOnBg: {
    ratio: number
    aa: boolean
    aaa: boolean
  }
  linkOnBg: {
    ratio: number
    aa: boolean
    aaa: boolean
  }
  buttonTextOnButtonBg: {
    ratio: number
    aa: boolean
    aaa: boolean
  }
  iconOnBg: {
    ratio: number
    aa: boolean
    aaa: boolean
  }
}

export function checkAllContrasts(
  bgColor: string,
  headingColor: string,
  bodyTextColor: string,
  linkColor: string,
  buttonBg: string,
  buttonText: string,
  iconColor: string = "#000000"
): ContrastResults {
  const headingRatio = getContrastRatio(bgColor, headingColor)
  const bodyRatio = getContrastRatio(bgColor, bodyTextColor)
  const linkRatio = getContrastRatio(bgColor, linkColor)
  const buttonRatio = getContrastRatio(buttonBg, buttonText)
  const iconRatio = getContrastRatio(bgColor, iconColor)

  return {
    headingOnBg: {
      ratio: parseFloat(headingRatio.toFixed(2)),
      aa: meetsWCAG_AA(headingRatio, false),
      aaa: meetsWCAG_AAA(headingRatio, false),
    },
    bodyTextOnBg: {
      ratio: parseFloat(bodyRatio.toFixed(2)),
      aa: meetsWCAG_AA(bodyRatio, false),
      aaa: meetsWCAG_AAA(bodyRatio, false),
    },
    linkOnBg: {
      ratio: parseFloat(linkRatio.toFixed(2)),
      aa: meetsWCAG_AA(linkRatio, false),
      aaa: meetsWCAG_AAA(linkRatio, false),
    },
    buttonTextOnButtonBg: {
      ratio: parseFloat(buttonRatio.toFixed(2)),
      aa: meetsWCAG_AA(buttonRatio, true), // buttons are considered large
      aaa: meetsWCAG_AAA(buttonRatio, true),
    },
    iconOnBg: {
      ratio: parseFloat(iconRatio.toFixed(2)),
      aa: meetsWCAG_AA(iconRatio, false),
      aaa: meetsWCAG_AAA(iconRatio, false),
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
    results.iconOnBg,
  ]

  const allAAA = allCombinations.every((c) => c.aaa)
  const allAA = allCombinations.every((c) => c.aa)

  if (allAAA) return "AAA"
  if (allAA) return "AA"
  return "FAIL"
}
