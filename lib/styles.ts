import { StyleDefinition, ColorDefinition } from "./types"

export const generateCSS = (
  styles: StyleDefinition[],
  colors: ColorDefinition[],
  {
    bodyFont = "Arial, sans-serif",
    headingFont = "Arial, sans-serif",
    buttonFont = "Arial, sans-serif",
    bodySize = "15px",
    bodyLineHeight = "22px",
    bodyWeight = "400",
    h1Size = "22px",
    h1LineHeight = "30px",
    h1Weight = "400",
    h2Size = "20px",
    h2LineHeight = "28px",
    h2Weight = "400",
    h3Size = "18px",
    h3LineHeight = "26px",
    h3Weight = "400",
    h4Size = "16px",
    h4LineHeight = "24px",
    h4Weight = "400",
    themePadding = "25px",
    buttonPaddingTop = "10",
    buttonPaddingRight = "20",
    buttonPaddingBottom = "10",
    buttonPaddingLeft = "20",
    buttonBorderRadius = "4",
  } = {},
): string => {
  let css = ""

  const paddingValue = themePadding.replace("px", "") || "25"
  const buttonPaddingValue = `${buttonPaddingTop}px ${buttonPaddingRight}px ${buttonPaddingBottom}px ${buttonPaddingLeft}px`
  const buttonBorderRadiusValue = `${buttonBorderRadius || "4"}px`

  const baseCss = `.wrapper [class*="text-style-"] {padding: 5px !Important;}
.style-selector .info, .style-selector .header1 {font-size:14px !Important;line-height:24px !Important;}

#layout .block[data-sd-content=sd-feedback] td.intro {padding-bottom: 0px;}

/*gutter style*/
/*initial size of gutter and margin table*/
.grid .margintable{width:0px;height:22px;}

.grid .guttertable{width:0px;height:22px;}

/*end of gutter style*/
/* Defaults */

#layout table td {font-family: ${bodyFont}; }

#layout table, #layout label {font-family: ${bodyFont}; font-size:${bodySize};line-height:${bodyLineHeight}; font-weight: ${bodyWeight};}

#layout .block[data-sd-content=website]{padding:5px ${paddingValue}px}

#layout label.control-label.required:after, #layout .form-group.required .control-label:after {content: '*';}

#layout .form-control {font-size:${bodySize};line-height:${bodyLineHeight};}

#layout .form-control {height: 44px; border-radius: 0px;}

#layout label {font-weight: 400;}

#layout .allow [data-sd-content=website] td{/* Style of website link TDs*/
padding:0 8px;font-family: ${bodyFont}; text-align:center;border-left:1px solid #999999;border-right:1px solid #999999;}

#layout .allow [data-sd-content=website] td:first-child{border-left:none;}

#layout .allow [data-sd-content=website] td:last-child{border-right:none;}

.sd-article-share{/* Spacing between A's around share icons */
margin:8px 4px 0;}

.map-info-body{/* Spacing around the text in the Google Map block */
padding: 35px !Important;}

.choice-container table td{/* Vertical gap after poll buttons */
padding-bottom:10px;}

.intro{/* Vertical gap in introductory text for non-article blocks */
padding-bottom:18px;padding-top:0px;padding-left:0px;padding-right:0px;}

.figcaption{/* Applies to images, videos and articles with images*/
padding:10px ${paddingValue}px 10px ${paddingValue}px;font-size:12px; line-height: 19px; text-align: left; text-decoration: none; font-family: ${bodyFont}; }

.figcaption a { text-decoration: none;}

.main, .intro{/* body text of blocks */
font-family: ${bodyFont}; }

.header{/* Provides consistent heading height across different email clients*/
}

#layout .add-to-calendar-container td{/* Spacing between "Add to calendar" icons */
padding-right:6px;}

#layout .block[data-image-position=left] td.figure{padding-right:${paddingValue}px;}

#layout .block[data-image-position=right] td.figure{padding-left:${paddingValue}px;}

#layout .block[data-image-position=left] tr.figure-container:last-child td, #layout .block[data-image-position=right] tr.figure-container:last-child td{padding-bottom:${paddingValue}px;}

.calendar-body td, .calendar-body th{/* Styles of calendar table*/
border-top:1px solid #ddd;font-family: ${bodyFont}; border-bottom:1px solid #ddd;padding:2px 0}

/*hybrid*/
#layout .block[data-sd-content=article]:not([data-image-position]) .block-body > tbody > tr > td, #layout .block[data-sd-content=article][data-image-position=top] .block-body > tbody > tr:not(.media-container) > td, #layout .block[data-sd-content=article][data-image-position=bottom] .block-body > tbody > tr:not(.media-container) > td{/*set all elements in article to have padding left and right except image*/
padding-left:${paddingValue}px;padding-right:${paddingValue}px;padding-bottom:${paddingValue}px;}

#layout .block[data-sd-content=article]:not([data-image-position]) .block-body > tbody > tr > td.read-more, #layout .block[data-sd-content=article][data-image-position=top] .block-body > tbody > tr:not(.media-container) > td.read-more, #layout .block[data-sd-content=article][data-image-position=bottom] .block-body > tbody > tr:not(.media-container) > td.read-more {padding-top: 0px;}

#layout .block[data-sd-content=article][data-image-position=bottom] .block-body > tbody > tr:not(.media-container) > td {padding-bottom: ${paddingValue}px;}

#layout .block[data-sd-content=article][data-image-position=bottom] .block-body > tbody > tr:first-child > td, #layout .block[data-sd-content=article]:not([data-image-position]) .block-body > tbody > tr:first-child > td{padding-top:${paddingValue}px;}

#layout .block[data-sd-content=article][data-image-position=bottom] .media-container > td {padding-top: 0px;}

#layout .block[data-sd-content=article][data-image-position=top] .media-container > td, #layout .block[data-sd-content=article][data-image-position=top] .block-body > tbody > tr:last-child > td, #layout .block[data-sd-content=article]:not([data-image-position]) .block-body > tbody > tr:last-child > td{padding-bottom:${paddingValue}px;}

/*end of hybrid*/
#layout .block[data-sd-content=links], #layout .block[data-sd-content=map] td.gm-text-wrapper, #layout .block[data-sd-content=poll], #layout .block[data-sd-content=links], #layout .block[data-sd-content=rsvp], #layout .block[data-sd-content=calendar], #layout .block[data-sd-content=share], #layout .block[data-sd-content=list]{/*default padding around every block (except article block)*/
padding: ${paddingValue}px}

#layout .block[data-sd-content=article][data-image-position=left], #layout .block[data-sd-content=article][data-image-position=right] {padding: ${paddingValue}px}

#layout .block[data-sd-content=article][data-image-position=left] .figcaption {padding-right: ${paddingValue}px;}
#layout .block[data-sd-content=article][data-image-position=right] .figcaption {padding-left: ${paddingValue}px;}

#layout .block[data-sd-content=subscription] {padding: ${paddingValue}px;}

#layout .block[data-sd-content=article]:not([data-image-position]) .block-body > tbody > tr .header, #layout .block[data-sd-content=article][data-image-position=top] .block-body > tbody > tr:not(.media-container) .header, #layout .block[data-sd-content=article][data-image-position=bottom] .block-body > tbody > tr:first-child > .header {padding-bottom:14px;}

/*end of defaults*/

#layout .block[data-sd-content=article][data-image-position=left-no-wrap] .text-container, #layout .block[data-sd-content=article][data-image-position=right-no-wrap] .text-container {padding:${paddingValue}px;}

.add-to-calendar-container td:first-child{font-size:14px;}

/* Buttons */
.read-more-wrapper .btn-cm, .link-button-wrapper .btn-cm{padding-left:${buttonPaddingLeft}px;text-decoration:none;padding-right:${buttonPaddingRight}px;width: auto;}

.btn-cm{/* All buttons styles */
background-color:#00677f; border: 0px;
color:#ffffff;display:inline-block;font-family: ${buttonFont}; font-weight:700; text-align:center; text-decoration:none;width:100%;-webkit-text-size-adjust:none;mso-hide:all;padding:${buttonPaddingValue}; transition: all .4s ease; font-size: 14px; line-height: 19px; vertical-align: middle; width: auto; border-radius: ${buttonBorderRadiusValue};}

a.btn-cm.btn-accept, a.btn-cm.btn-decline {width: 100%;}

a.btn-cm.btn-poll {width: 100% !important; padding: 10px 0px 10px 0px !Important;}

.read-more, .link-button {padding-top: 0px;}

a.btn-cm.btn-width-auto {text-decoration: underline; font-weight: normal;}

.link-text {text-align: left;  font-size: ${bodySize}; line-height: ${bodyLineHeight}; font-weight: ${bodyWeight}; padding-top: 10px;}
.links-body {}
.single-link {text-align: left;}
.link-text a {text-align: left;}
.single-link table {width: 100%;}
#layout .block[data-sd-content="links"] .block-body .header-container .header {padding-bottom:0px;}

.share-article {padding-top: 0px;}

#layout .block[data-sd-content="links"] {}
#layout .block[data-sd-content="links"] .block-body .header-container .header {} 

.header1{font-family: ${headingFont}; font-size:${h1Size};line-height:${h1LineHeight}; font-weight: ${h1Weight};}
.header2{font-family: ${headingFont}; font-size:${h2Size};line-height:${h2LineHeight}; font-weight: ${h2Weight};}
.header3{font-family: ${headingFont}; font-size:${h3Size};line-height:${h3LineHeight}; font-weight: ${h3Weight};}
.header4{font-family: ${headingFont}; font-size:${h4Size};line-height:${h4LineHeight}; font-weight: ${h4Weight};}

#layout .block[data-image-position="right"] .share-article, #layout .block[data-image-position="left"] .share-article {padding-top: ${paddingValue}px !Important;}

`
  css = baseCss

  styles.forEach((style, index) => {
    const styleNum = index + 1
    const className = `.text-style-${styleNum}`

    const bgColor = getColorHex(style.background, colors)
    const textColor = getColorHex(style.textColor, colors)
    const headingColor = getColorHex(style.headingColor, colors)
    const btnBg = getColorHex(style.buttonBg, colors)
    const btnText = getColorHex(style.buttonText, colors)
    const linkColor = getColorHex(style.linkColor, colors)

    const h1SizeVal = style.h1Size || h1Size || "22px"
    const h1LineHeightVal = style.h1LineHeight || h1LineHeight || "30px"
    const h1WeightVal = style.h1Weight || h1Weight || "400"
    const h2SizeVal = style.h2Size || h2Size || "20px"
    const h2LineHeightVal = style.h2LineHeight || h2LineHeight || "28px"
    const h2WeightVal = style.h2Weight || h2Weight || "400"
    const h3SizeVal = style.h3Size || h3Size || "18px"
    const h3LineHeightVal = style.h3LineHeight || h3LineHeight || "26px"
    const h3WeightVal = style.h3Weight || h3Weight || "400"
    const h4SizeVal = style.h4Size || h4Size || "16px"
    const h4LineHeightVal = style.h4LineHeight || h4LineHeight || "24px"
    const h4WeightVal = style.h4Weight || h4Weight || "400"
    const bodySizeVal = style.bodySize || bodySize || "15px"
    const bodyLineHeightVal = style.bodyLineHeight || bodyLineHeight || "22px"
    const bodyWeightVal = style.bodyWeight || bodyWeight || "400"
    const btnSize = style.buttonSize || buttonSize || "15px"
    const btnLineHeight = style.buttonLineHeight || buttonLineHeight || "22px"
    const btnWeight = style.buttonWeight || buttonWeight || "400"
    const headingFontVal = style.headingFont || headingFont || "Arial, sans-serif"
    const bodyFontVal = style.bodyFont || bodyFont || "Arial, sans-serif"
    const btnFont = style.buttonFont || buttonFont || "Arial, sans-serif"

    const descriptionPrefix = style.noPadding ? 'No padding - ' : ''
    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    css += `/* Style ${styleNum} */\n`
    css += `.style-selector ${className} .info::after{content:'${descriptionPrefix}${capitalizeFirst(style.background)} background with ${style.headingColor.toLowerCase()} headings and ${style.buttonBg.toLowerCase()} buttons ';}`
    css += `#layout ${className} .header{padding-bottom:14px;}\n`
    css += `${className} {background-color:${bgColor};color:${textColor};font-family: ${bodyFontVal}; font-size:${bodySizeVal};line-height:${bodyLineHeightVal}; font-weight: ${bodyWeightVal};}\n`
    css += `${className} .main{color:${textColor};font-size:${bodySizeVal};line-height:${bodyLineHeightVal}; font-family: ${bodyFontVal}; }\n`
    css += `${className}, ${className} .add-to-calendar-container td:first-child, ${className} .main, ${className} .sd-list-date, ${className} .sd-list-description, ${className} .calendar-body table td, ${className} .calendar-body table th, ${className} .figcaption, ${className} .intro,  ${className} label, ${className} td {color:${textColor}; font-family: ${bodyFontVal}; }\n`
    css += `${className} .header1, ${className} .header2, ${className} .header3, ${className} .header4{font-family: ${headingFontVal};  color: ${headingColor};}\n`
    css += `${className} td.share-article {padding-top: 0px !Important;}\n`
    css += `${className} .figcaption {color: ${textColor};}\n`
    css += `${className} .header1{font-family: ${headingFontVal}; font-size:${h1SizeVal};line-height:${h1LineHeightVal}; font-weight: ${h1WeightVal};}\n`
    css += `${className} .header2{font-family: ${headingFontVal};font-size:${h2SizeVal};line-height:${h2LineHeightVal}; font-weight: ${h2WeightVal};}\n`
    css += `${className} .header3{font-family: ${headingFontVal}; font-size:${h3SizeVal};line-height:${h3LineHeightVal}; font-weight: ${h3WeightVal};}\n`
    css += `${className} .header4{font-family: ${headingFontVal}; font-size:${h4SizeVal};line-height:${h4LineHeightVal}; font-weight: ${h4WeightVal};}\n`
    css += `${className} .figcaption a, ${className} a{color:${linkColor};text-decoration:underline;}\n`
    css += `${className} .figcaption a:hover, ${className} a:hover {text-decoration:none;}\n`
    css += `${className} .single-link a {font-family: ${bodyFontVal}; text-decoration: underline; color: ${linkColor};}\n`
    css += `${className} .single-link a:visited {text-decoration: underline; color: ${linkColor} !important;}\n`
    css += `${className} .btn-cm{background-color:${btnBg}; text-decoration:none;color:${btnText}; font-family: ${btnFont}; font-size:${btnSize};line-height:${btnLineHeight}; font-weight: ${btnWeight};}\n`
    css += `${className} .btn-cm:hover,  ${className} .btn-cm:focus {background-color:${btnBg} !important; text-decoration:none;color:${btnText} !important;}\n`
    
    // Add no padding CSS if noPadding is enabled
    if (style.noPadding) {
      css += `#layout ${className}.block[data-sd-content=article]:not([data-image-position]) .block-body>tbody>tr>td, #layout ${className}.block[data-sd-content=article][data-image-position=bottom] .block-body>tbody>tr:not(.media-container)>td, #layout ${className}.block[data-sd-content=article][data-image-position=top] .block-body>tbody>tr:not(.media-container)>td, #layout ${className}.block[data-sd-content=article][data-image-position=left], #layout ${className}.block[data-sd-content=article][data-image-position=right],#layout ${className}.block[data-sd-content="sd-feedback"]{padding:0px}\n`
      css += `#layout ${className}.block[data-sd-content=article]:not([data-image-position]) .block-body>tbody>tr>.header, #layout ${className}.block[data-sd-content=article][data-image-position=bottom] .block-body>tbody>tr:not(.media-container)>.header, #layout ${className}.block[data-sd-content=article][data-image-position=top] .block-body>tbody>tr:not(.media-container)>.header {padding-bottom: 14px;}\n`
      css += `#layout ${className}.block[data-sd-content=map] td.gm-text-wrapper, #layout ${className}.block[data-sd-content=poll], #layout ${className}.block[data-sd-content=links], #layout ${className}.block[data-sd-content=rsvp], #layout ${className}.block[data-sd-content=calendar], #layout ${className}.block[data-sd-content=share], #layout ${className}.block[data-sd-content=list] {padding: 0px;}\n`
      css += `#layout ${className}.block[data-sd-content="links"] .block-body .header-container .header {padding: 0px; padding-bottom: 0px;}\n`
      css += `#layout ${className}.block .read-more {padding-top: 15px !Important;}\n`
    }
    
    css += `\n`
  })

  return css
}

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

export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export const getContrastRatio = (hex1: string, hex2: string): number => {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  if (!rgb1 || !rgb2) return 0

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}
