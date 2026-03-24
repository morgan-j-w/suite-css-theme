import { GoogleFont } from "@/lib/types"

export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const cleanFontValue = (fontValue: string): string => {
  if (!fontValue) return ""
  return fontValue.trim().replace(/;$/, "")
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
