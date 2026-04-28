export interface ColorDefinition {
  id: string
  name: string
  hex: string
}

export interface StyleDefinition {
  id: string
  name: string
  description: string
  background: string
  textColor: string
  headingColor: string
  buttonBg: string
  buttonText: string
  buttonBgHover?: string
  buttonTextHover?: string
  linkColor: string
  h1Font: string
  h2Font: string
  h3Font: string
  h4Font: string
  bodyFont: string
  buttonFont: string
  h1Size: string
  h1LineHeight: string
  h1Weight: string
  h2Size: string
  h2LineHeight: string
  h2Weight: string
  h3Size: string
  h3LineHeight: string
  h3Weight: string
  h4Size: string
  h4LineHeight: string
  h4Weight: string
  bodySize: string
  bodyLineHeight: string
  bodyWeight: string
  buttonSize: string
  buttonLineHeight: string
  buttonWeight: string
  noPadding?: boolean
  iconStyle?: string
  iconColor?: string
  iconSize?: string
  buttonBorderWidth?: string
  buttonBorderColor?: string
  buttonBorderColorHover?: string
  buttonPaddingTop?: string
  buttonPaddingRight?: string
  buttonPaddingBottom?: string
  buttonPaddingLeft?: string
  buttonBorderRadius?: string
}

export interface GoogleFont {
  family: string
  variants: string[]
}
