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
