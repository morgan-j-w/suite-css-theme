// Type-only and relative, so Node's type stripping can run this file directly.
import type { StyleDefinition } from "./types"

/**
 * Styles refer to palette colours by name, not by hex, and the lookup falls
 * back to black when a name is not found. Renaming a colour therefore has to
 * rewrite every style that referred to the old name, or those styles silently
 * turn black.
 */
export const STYLE_COLOUR_FIELDS = [
  "background",
  "textColor",
  "headingColor",
  "buttonBg",
  "buttonText",
  "buttonBgHover",
  "buttonTextHover",
  "linkColor",
  "buttonBorderColor",
  "buttonBorderColorHover",
] as const satisfies ReadonlyArray<keyof StyleDefinition>

export type StyleColourField = (typeof STYLE_COLOUR_FIELDS)[number]

/** buttonBorderColor uses this sentinel for "no border colour chosen". */
const NO_COLOUR = "none"

const capitaliseFirst = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

/**
 * The description the wizard generates for a style. Kept here so the value used
 * when a style is created, the fallback used when generating CSS, and the
 * staleness check below cannot drift apart.
 */
export const buildStyleDescription = (style: {
  background?: string
  headingColor?: string
  buttonBg?: string
}): string => {
  const background = style.background ?? ""
  const heading = style.headingColor ?? ""
  const button = style.buttonBg ?? ""
  return heading === button
    ? `${capitaliseFirst(background)} background with ${heading.toLowerCase()} headings and buttons`
    : `${capitaliseFirst(background)} background with ${heading.toLowerCase()} headings and ${button.toLowerCase()} buttons`
}

const NO_PADDING_PREFIX = "No padding - "

/**
 * True when the description still reads exactly as the wizard would have
 * written it, so it can be regenerated. A hand-edited description is left
 * alone.
 */
const isGeneratedDescription = (style: StyleDefinition): boolean => {
  const current = style.description ?? ""
  const generated = buildStyleDescription(style)
  return current === generated || current === `${NO_PADDING_PREFIX}${generated}`
}

/**
 * Rewrites every reference to `previousName` across the given styles, and
 * refreshes any description that was generated rather than hand-written.
 *
 * Matching is case-insensitive, since the name-to-hex lookup is too.
 */
export const renameColourInStyles = (
  styles: StyleDefinition[],
  previousName: string,
  nextName: string,
): StyleDefinition[] => {
  const from = previousName.trim().toLowerCase()
  const to = nextName.trim()
  if (from === "" || to === "" || from === to.toLowerCase()) return styles

  return styles.map((style) => {
    const hadGeneratedDescription = isGeneratedDescription(style)

    let changed = false
    const updated: StyleDefinition = { ...style }
    for (const field of STYLE_COLOUR_FIELDS) {
      const value = style[field]
      if (typeof value !== "string" || value === NO_COLOUR) continue
      if (value.trim().toLowerCase() === from) {
        updated[field] = to
        changed = true
      }
    }
    if (!changed) return style

    if (hadGeneratedDescription) {
      const prefix = (style.description ?? "").startsWith(NO_PADDING_PREFIX)
        ? NO_PADDING_PREFIX
        : ""
      updated.description = `${prefix}${buildStyleDescription(updated)}`
    }
    return updated
  })
}
