// Type-only and relative, so Node's type stripping can run this file directly.
import type { StyleDefinition } from "./types"

/**
 * The per-style fields that make up the Step 4 typography overrides.
 *
 * Both the "Reset to global settings" button and the Typography overrides
 * toggle clear this same set, so the list lives here rather than being spelled
 * out at each call site where the two could drift apart.
 */
export const TYPOGRAPHY_OVERRIDE_FIELDS = [
  "h1Font", "h2Font", "h3Font", "h4Font", "bodyFont", "buttonFont",
  "h1Size", "h1LineHeight", "h1Weight",
  "h2Size", "h2LineHeight", "h2Weight",
  "h3Size", "h3LineHeight", "h3Weight",
  "h4Size", "h4LineHeight", "h4Weight",
  "bodySize", "bodyLineHeight", "bodyWeight",
  "linkWeight",
  "buttonSize", "buttonLineHeight", "buttonWeight",
  "buttonBorderRadius",
  "buttonPaddingTop", "buttonPaddingRight", "buttonPaddingBottom", "buttonPaddingLeft",
] as const satisfies ReadonlyArray<keyof StyleDefinition>

export type TypographyOverrideField = (typeof TYPOGRAPHY_OVERRIDE_FIELDS)[number]

export type TypographyGlobals = Partial<Record<TypographyOverrideField, string | undefined>>

/** "10px" and "10" describe the same value; the two sides store it differently. */
const normalise = (value: unknown): string =>
  String(value ?? "").trim().replace(/px$/i, "")

/**
 * True when the style genuinely departs from the global typography.
 *
 * A new style is seeded with copies of the current global values, so the
 * presence of a value means nothing on its own — only a value that differs from
 * the global counts as an override.
 */
export const hasTypographyOverrides = (
  style: StyleDefinition,
  globals: TypographyGlobals = {},
): boolean =>
  TYPOGRAPHY_OVERRIDE_FIELDS.some((field) => {
    const value = style[field]
    if (value === undefined || String(value).trim() === "") return false
    const global = globals[field]
    if (global !== undefined && normalise(value) === normalise(global)) return false
    return true
  })

/**
 * Spread over a style to drop every override, so it inherits the Step 3
 * typography again.
 */
export const clearedTypographyOverrides = (): Record<TypographyOverrideField, undefined> =>
  Object.fromEntries(TYPOGRAPHY_OVERRIDE_FIELDS.map((field) => [field, undefined])) as Record<
    TypographyOverrideField,
    undefined
  >
