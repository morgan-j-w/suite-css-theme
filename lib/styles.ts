import { ColorDefinition } from "./types"
import { getContrastRatio } from "./wcag"


export const getColorHex = (colorName: string, colors: ColorDefinition[]): string => {
  const color = colors.find((c) => c.name.toLowerCase() === colorName.toLowerCase())
  return color?.hex || "#000000"
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

/**
 * Re-exported from the WCAG module. This file used to carry its own identical
 * copy of the luminance and contrast maths; two implementations of the same
 * rule is exactly the drift issue #78 warned about, so there is now one.
 */
export { getContrastRatio }

export const findAccessibleAlternatives = (
  failingColorHex: string,
  bgColorHex: string,
  palette: ColorDefinition[],
  minRatio = 4.5
): Array<ColorDefinition & { ratio: number }> => {
  const passing = palette
    .filter((c) => c.name.trim() !== "")
    .map((c) => ({ ...c, ratio: Math.round(getContrastRatio(c.hex, bgColorHex) * 100) / 100 }))
    .filter((c) => c.ratio >= minRatio)

  const failRgb = hexToRgb(failingColorHex)
  if (!failRgb) return passing.slice(0, 3)

  return passing
    .sort((a, b) => {
      const rgbA = hexToRgb(a.hex)
      const rgbB = hexToRgb(b.hex)
      if (!rgbA || !rgbB) return 0
      const distA = Math.sqrt(
        Math.pow(rgbA.r - failRgb.r, 2) +
        Math.pow(rgbA.g - failRgb.g, 2) +
        Math.pow(rgbA.b - failRgb.b, 2)
      )
      const distB = Math.sqrt(
        Math.pow(rgbB.r - failRgb.r, 2) +
        Math.pow(rgbB.g - failRgb.g, 2) +
        Math.pow(rgbB.b - failRgb.b, 2)
      )
      return distA - distB
    })
    .slice(0, 3)
}
