// Type-only and relative, so Node's type stripping can run this file directly.
import type { GoogleFont } from "../types"

/**
 * Escapes a value for use inside a single-quoted CSS string.
 *
 * An unescaped apostrophe closes the string early, which invalidates the
 * declaration and, because of how the browser resyncs after a parse error, can
 * take the following rule down with it. Newlines are folded to spaces since a
 * literal newline is not legal inside a CSS string either.
 */
export const escapeCssString = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\r\n]+/g, " ")

export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Normalises a length that may or may not already carry its unit.
 *
 * Step 2 stores button padding unitless ("10") while the Step 4 overrides store
 * it with the unit ("10px"), so a call site that appended "px" unconditionally
 * produced "10pxpx" and the declaration was dropped. See issue #67.
 */
export const toCssPx = (value: string | undefined, fallback: string): string => {
  const raw = (value ?? "").trim()
  const chosen = raw === "" ? fallback : raw
  return /^-?\d*\.?\d+$/.test(chosen) ? `${chosen}px` : chosen
}

/**
 * What a draft field should push up when it loses focus, or null for "nothing
 * to commit".
 *
 * The three cases are distinct and were previously collapsed into two:
 *
 *   null  - focused but never typed in. Nothing to commit; the value stands.
 *   ""    - typed in and cleared. The fallback applies.
 *   text  - edited. That is what commits.
 *
 * Treating the first case as the second is what made an edited field revert:
 * set the padding to 44, click into it again, click away without typing, and
 * the blur committed the fallback, putting 25 back.
 */
export const commitOnBlur = (draft: string | null, fallback: string): string | null => {
  if (draft === null) return null
  return draft.trim() === "" ? fallback : draft
}

export const cleanFontValue = (fontValue: string | undefined): string => {
  if (!fontValue) return ""
  return fontValue.trim().replace(/;$/, "")
}

/**
 * Reverses escapeCssString. FontField stores the formatter's own output, which
 * then goes through the formatter again when the CSS is generated, so without
 * this a name containing an apostrophe would gain a backslash on every pass.
 */
const unescapeCssString = (value: string): string => value.replace(/\\(.)/g, "$1")

/**
 * A family may only go unquoted if it is a single CSS identifier.
 *
 * Generic families must stay unquoted to keep their meaning: 'sans-serif' in
 * quotes asks for a font actually named "sans-serif" rather than the keyword.
 */
const isBareFamilyIdentifier = (name: string): boolean => /^-?[A-Za-z_][A-Za-z0-9_-]*$/.test(name)

/**
 * Renders a font stack safe to drop into a declaration.
 *
 * The field behind this is free text, so the value can be anything a user
 * pasted. Previously it only added quotes around multi-word names, which meant
 * it could emit CSS that does not parse:
 *
 *   "Inter, sans-serif; Montserrat, sans-serif"
 *     -> font-family: Inter, 'sans-serif; Montserrat', sans-serif;
 *
 * The semicolon ended the declaration mid-value and the rest of the rule was
 * discarded by the email client. Two related cases failed the same way: an
 * apostrophe ("Jo's Font") closed its own quote early, and a brace escaped the
 * rule altogether.
 *
 * Each part is now reduced to a bare family name - delimiting quotes stripped,
 * however unbalanced - and then re-quoted and escaped only if it needs it. That
 * also repairs a value already stored in the broken form, since the stray
 * semicolon truncates and the orphaned quote is stripped.
 *
 * Truncating at the first semicolon matches how a browser reads the original:
 * everything after it is a separate declaration, not a fallback in this stack.
 * Because FontField reformats on blur, the field visibly corrects itself as the
 * user leaves it rather than silently dropping the remainder at export time.
 *
 * Known limit: splitting on commas would also split a family name containing
 * one. No real font is named that way, and the previous version split the same.
 */
export const formatFontForCSS = (fontValue: string | undefined): string => {
  if (!fontValue) return "'Arial', sans-serif"

  // Drop a pasted "font-family:" prefix.
  let cleaned = fontValue.trim().replace(/^font-family\s*:\s*/i, "")

  // Nothing after the first semicolon belongs to this stack.
  cleaned = cleaned.split(";")[0]

  // A brace would close the rule and let what follows be read as a selector.
  cleaned = cleaned.replace(/[{}]/g, " ")

  const families = cleaned
    .split(",")
    .map((part) => {
      const name = unescapeCssString(
        part.trim().replace(/^["']+/, "").replace(/["']+$/, ""),
      ).trim()
      if (name === "") return ""
      return isBareFamilyIdentifier(name) ? name : `'${escapeCssString(name)}'`
    })
    .filter((name) => name !== "")

  // Everything was punctuation or empty; fall back rather than emit nothing.
  return families.length > 0 ? families.join(", ") : "'Arial', sans-serif"
}

export const getAvailableFonts = (webfontImports: string): string[] => {
  const fonts: Set<string> = new Set()

  const familyMatches = webfontImports.match(/family=([^&;:]+)/g)
  if (familyMatches) {
    familyMatches.forEach((match) => {
      const fontName = match.replace("family=", "").replace(/\+/g, " ")
      fonts.add(fontName)
    })
  }

  return Array.from(fonts).sort()
}

export const fetchGoogleFonts = async (): Promise<GoogleFont[]> => {
  try {
    const response = await fetch(
      "https://www.googleapis.com/webfonts/v1/webfonts?key=" + process.env.NEXT_PUBLIC_GOOGLE_FONTS_API,
    )
    const data = await response.json()
    return data.items.map(
      (font: { family: string; variants: string[] }) => ({
        family: font.family,
        variants: font.variants,
      }),
    ) as GoogleFont[]
  } catch (error) {
    console.error("Error fetching Google Fonts:", error)
    return []
  }
}

export const generateMediaQueries = (styles: { name: string }[]): string => {
  let mediaQuery = ""

  styles.forEach((style, index) => {
    const styleNum = index + 1
    const className = `.text-style-${styleNum}`
    const mediaSyntax = `/* Style ${styleNum}: ${style.name}*/
@media (max-width: 600px) {
  ${className} .header1 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  ${className} .header2 {
    font-size: 16px;
    margin-bottom: 8px;
  }
  ${className} {
    padding: 15px !important;
  }
}

`
    mediaQuery += mediaSyntax
  })

  return mediaQuery
}
