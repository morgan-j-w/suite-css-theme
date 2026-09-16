/**
 * Splits the user's title padding between the links block header and the text
 * sitting under it.
 *
 * The content beneath the header already carries its own top padding, so the
 * header only needs to contribute the remainder. Where the requested padding is
 * smaller than that built-in amount the header contributes nothing — padding
 * cannot go negative — and the text's own top padding is reduced instead.
 *
 * The two values always add up to the requested padding:
 *
 *   14 -> header 4px  + text 10px
 *    8 -> header 0px  + text  8px
 *   10 -> header 0px  + text 10px
 *
 * A links block can also carry an intro between the header and the links:
 *
 *   Heading
 *   Intro
 *   Quicklinks
 *
 * The intro needs the same gap above and below it, and it turns out to need
 * exactly the two numbers already computed here. On top it behaves like the
 * content under a header, so it takes linkTextPaddingTop; on the bottom it
 * behaves like a header above content, so it takes headerPaddingBottom. Each
 * gap is then a header-side value plus a content-side value, summing to the
 * requested padding just as the two-element case does:
 *
 *   44 -> heading 34px | intro 10px / 34px | links 10px   (gaps 44 and 44)
 *   20 -> heading 10px | intro 10px / 10px | links 10px   (gaps 20 and 20)
 *    8 -> heading  0px | intro  8px /  0px | links  8px   (gaps  8 and  8)
 *
 * The last row is why the intro's top padding is not simply 10: below the
 * built-in amount there is no room for it, and the clamp already handles that.
 *
 * No extra fields are returned for the intro, because they would be copies:
 * its top is linkTextPaddingTop and its bottom is headerPaddingBottom.
 */
export const CONTENT_TOP_PADDING = 10

/** Matches the default used elsewhere for an unset title padding. */
export const DEFAULT_TITLE_PADDING = 14

export interface TitlePaddingSplit {
  /** For #layout .block[data-sd-content="links"] ... .header */
  headerPaddingBottom: number
  /** For .link-text */
  linkTextPaddingTop: number
}

export const splitTitlePadding = (
  value: string | number | undefined,
  fallback: number = DEFAULT_TITLE_PADDING,
): TitlePaddingSplit => {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace("px", "").trim())

  // An unset or unparseable value falls back; a negative one is treated as zero
  // rather than as missing, so an out-of-range entry does not silently become 14.
  const requested = Number.isFinite(parsed) ? Math.max(0, parsed) : fallback

  return {
    headerPaddingBottom: Math.max(0, requested - CONTENT_TOP_PADDING),
    linkTextPaddingTop: Math.min(CONTENT_TOP_PADDING, requested),
  }
}
