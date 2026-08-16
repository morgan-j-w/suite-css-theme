/**
 * Builds the share-icon markup included in the exported theme HTML.
 *
 * The hrefs are merge tags of the form `{!TOKEN!}`. Those braces must survive
 * into the export as literal characters — percent-encoding them to `%7B`/`%7D`
 * breaks the tag, since the platform matches on the literal form. Nothing here
 * may URL-encode, HTML-escape or round-trip the markup through the DOM, and
 * lib/icon-templates.test.mts guards that.
 */

export interface ShareIcon {
  /** Label used for the title and alt attributes. */
  name: string
  /** icons8 asset id, also the basis of the CSS class. */
  id: string
  /** Merge-tag token, wrapped as {!TOKEN!} in the href. */
  variable: string
}

export const SHARE_ICONS: ShareIcon[] = [
  { name: 'Facebook', id: 'facebook', variable: 'FACEBOOK_SHARE_DOC' },
  { name: 'X', id: 'twitterx--v1', variable: 'TWITTER_SHARE_DOC' },
  { name: 'LinkedIn', id: 'linkedin', variable: 'LINKEDIN_SHARE_DOC' },
  { name: 'Print', id: 'print', variable: 'PRINT_SHARE_DOC' },
  { name: 'Email', id: 'new-post', variable: 'FORWARD_SHARE_DOC' },
]

const ICON_STYLE_MAP: Record<string, string> = {
  'material-rounded': 'material-rounded',
  'material-outlined': 'material-outlined',
  'material-sharp': 'material-sharp',
}

/** The X asset's rounded and sharp variants are swapped in icons8's naming. */
const X_ICON_STYLE_MAP: Record<string, string> = {
  'material-rounded': 'material-sharp',
  'material-outlined': 'material-outlined',
  'material-sharp': 'material-rounded',
}

/** The CSS class differs from the asset id for two of the icons. */
const cssClassFor = (id: string): string =>
  id === 'twitterx--v1' ? 'twitter' : id === 'new-post' ? 'forward' : id

export const mergeTag = (variable: string): string => `{!${variable}!}`

export const buildIconTemplates = (
  styles: Array<{ iconColor?: string }>,
  options: { iconStyle?: string; iconSize?: string } = {},
): string => {
  const iconStyle = options.iconStyle || 'material-sharp'
  const iconSize = options.iconSize || '18'

  let markup = ''
  styles.forEach((style, index) => {
    const iconColor = (style.iconColor || '#000000').replace('#', '')
    markup += `    <div class="text-style-${index + 1}"><br>\n`
    SHARE_ICONS.forEach((icon) => {
      const mappedStyle =
        (icon.id === 'twitterx--v1' ? X_ICON_STYLE_MAP : ICON_STYLE_MAP)[iconStyle]
      markup += `        <a title="${icon.name}" class="sd-${cssClassFor(icon.id)}" style="text-decoration: none;" href="${mergeTag(icon.variable)}">\n`
      markup += `            <img alt="${icon.name}" src="https://img.icons8.com/${mappedStyle}/96/${iconColor}/${icon.id}.png" width="${iconSize}">\n`
      markup += `        </a>\n`
    })
    markup += `    </div>\n`
  })
  return markup
}
