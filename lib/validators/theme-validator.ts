import { ColorDefinition, StyleDefinition } from "@/lib/types"

/**
 * Validation for the Advanced Theme Designer wizard.
 *
 * Every guard on the next/save path lives here so the same rule is not written
 * once per call site. All of them trim before testing, so a whitespace-only
 * value counts as empty.
 */

/** Messages are supplied verbatim by QA — do not reword. */
export const VALIDATION_MESSAGES = {
  colourNameRequired: "Colour name is required before adding another colour.",
  colourRowIncomplete:
    "Complete all colour details before adding another colour. Each colour needs a name and a valid hex colour (for example, #ffffff).",
  coloursIncomplete:
    "Complete all colour details before continuing. Each colour needs a name and a valid hex colour (for example, #ffffff).",
  hexFormat: "Enter a valid hex colour in the format #RRGGBB (for example, #ffffff).",
  duplicateColours: "Duplicate colour names or hex values found. Each colour must be unique.",
  emptyPalette: "Add at least one colour before continuing.",
  themeNameRequired: "Theme name is required before you can save.",
  // Not yet reachable: checking a name against the account's other themes needs
  // the themes list/API, which lives in the suite. Kept here so the wording is
  // settled for whoever wires up that check. See issue #8.
  themeNameDuplicate: "Theme with this name already exists. Please choose a different name.",
  themeStyleRequired: "Theme style is required before you can save.",
  typographyIncompleteContinue:
    "Complete all font, font size, and line height typography styles before continuing.",
  typographyIncompleteSave:
    "Complete all font, font size, and line height typography styles before saving.",
} as const

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

const blank = (value: string | undefined): boolean => (value ?? "").trim() === ""

/** A hex is valid only as #RRGGBB. Whitespace-only counts as empty, not invalid. */
export const isValidHex = (value: string | undefined): boolean =>
  HEX_PATTERN.test((value ?? "").trim())

/**
 * Guards the "+ Add colour" button. Returns null when a new row may be added.
 *
 * The two messages differ by how much is missing: a row with nothing in it gets
 * the "complete all colour details" wording, a row that only lacks a name gets
 * the shorter name-specific one.
 */
export const validateBeforeAddingColour = (colors: ColorDefinition[]): string | null => {
  if (colors.length === 0) return null
  const last = colors[colors.length - 1]
  const nameMissing = blank(last.name)
  const hexUsable = isValidHex(last.hex)

  if (nameMissing && !hexUsable) return VALIDATION_MESSAGES.colourRowIncomplete
  if (nameMissing) return VALIDATION_MESSAGES.colourNameRequired
  if (!hexUsable) return VALIDATION_MESSAGES.hexFormat
  return null
}

/**
 * Guards leaving Step 1. Returns null when the palette is good.
 *
 * Order matters and is deliberate: an empty palette is reported before missing
 * fields, missing fields before malformed ones, and duplicates last, so the
 * user is always shown the most fundamental problem first.
 */
/**
 * The palette the wizard seeds itself with. These are supplied by the tool, not
 * chosen by the user, so a palette consisting only of these counts as "no
 * colour palette entered" for issue #9.
 */
const SEEDED_DEFAULTS = [
  { name: "white", hex: "#ffffff" },
  { name: "black", hex: "#000000" },
]

const isSeededDefault = (colour: ColorDefinition): boolean => {
  const name = (colour.name ?? "").trim().toLowerCase()
  const hex = (colour.hex ?? "").trim().toLowerCase()
  return SEEDED_DEFAULTS.some((d) => d.name === name && d.hex === hex)
}

export const validatePalette = (colors: ColorDefinition[]): string | null => {
  if (colors.length === 0) return VALIDATION_MESSAGES.emptyPalette

  // Nothing but the seeded White/Black still means the user has not entered a
  // palette. Covers both defaults remaining and only one of them remaining.
  if (colors.every(isSeededDefault)) return VALIDATION_MESSAGES.emptyPalette

  const anythingMissing = colors.some((c) => blank(c.name) || blank(c.hex))
  if (anythingMissing) return VALIDATION_MESSAGES.coloursIncomplete

  const anyMalformedHex = colors.some((c) => !isValidHex(c.hex))
  if (anyMalformedHex) return VALIDATION_MESSAGES.hexFormat

  // Names and hexes are both compared case-insensitively, so "#FFFFFF" and
  // "#ffffff" are the same colour, as are "White" and "white".
  const names = colors.map((c) => c.name.trim().toLowerCase())
  const hexes = colors.map((c) => c.hex.trim().toLowerCase())
  if (new Set(names).size !== names.length || new Set(hexes).size !== hexes.length) {
    return VALIDATION_MESSAGES.duplicateColours
  }

  return null
}

export interface TypographyValues {
  h1Font: string
  h1Size: string
  h1LineHeight: string
  h2Font: string
  h2Size: string
  h2LineHeight: string
  h3Font: string
  h3Size: string
  h3LineHeight: string
  h4Font: string
  h4Size: string
  h4LineHeight: string
  bodyFont: string
  bodySize: string
  bodyLineHeight: string
  buttonFont: string
  buttonSize: string
  buttonLineHeight: string
}

const typographyComplete = (values: TypographyValues): boolean =>
  Object.values(values).every((v) => !blank(v))

/** Guards leaving Step 3. */
export const validateTypographyForStep = (values: TypographyValues): string | null =>
  typographyComplete(values) ? null : VALIDATION_MESSAGES.typographyIncompleteContinue

/**
 * Guards saving from Step 4. Checks the global typography and then each style's
 * effective values, since an override that is present but blank would otherwise
 * slip through against a complete global set.
 */
export const validateTypographyForSave = (
  globals: TypographyValues,
  styles: StyleDefinition[],
): string | null => {
  if (!typographyComplete(globals)) return VALIDATION_MESSAGES.typographyIncompleteSave

  const overrideBlank = styles.some((style) =>
    (Object.keys(globals) as Array<keyof TypographyValues>).some((key) => {
      const override = style[key as keyof StyleDefinition]
      // undefined means "inherit", which is fine; a present-but-blank value is not.
      return typeof override === "string" && blank(override)
    }),
  )

  return overrideBlank ? VALIDATION_MESSAGES.typographyIncompleteSave : null
}

/**
 * The name the wizard starts with. Saving without touching it is what produces
 * the silently untitled themes in issue #7 — the name input itself already
 * refuses an empty value, so an untouched default is the reachable case.
 */
export const DEFAULT_THEME_NAME = "Untitled Theme"

export const isThemeNameMissing = (themeName: string): boolean => {
  const trimmed = (themeName ?? "").trim()
  return trimmed === "" || trimmed.toLowerCase() === DEFAULT_THEME_NAME.toLowerCase()
}

/** Guards every save entry point. */
export const validateThemeForSave = (params: {
  themeName: string
  colors: ColorDefinition[]
  styles: StyleDefinition[]
  typography: TypographyValues
}): string | null => {
  if (isThemeNameMissing(params.themeName)) return VALIDATION_MESSAGES.themeNameRequired

  const paletteError = validatePalette(params.colors)
  if (paletteError) return paletteError

  if (params.styles.length === 0) return VALIDATION_MESSAGES.themeStyleRequired

  return validateTypographyForSave(params.typography, params.styles)
}
