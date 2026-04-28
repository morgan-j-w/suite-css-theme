"use client"

import { useState, useEffect } from "react"
import { ColorDefinition, StyleDefinition } from "@/lib/types"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"

export const useThemeState = () => {
  const [colors, setColors] = useState<ColorDefinition[]>([
    { id: "1", name: "White", hex: "#ffffff" },
    { id: "2", name: "Black", hex: "#000000" },
  ])

  const [styles, setStyles] = useState<StyleDefinition[]>([])
  const [h1Font, setH1Font] = useState("Arial, sans-serif")
  const [h2Font, setH2Font] = useState("Arial, sans-serif")
  const [h3Font, setH3Font] = useState("Arial, sans-serif")
  const [h4Font, setH4Font] = useState("Arial, sans-serif")
  const [bodyFont, setBodyFont] = useState("Arial, sans-serif")
  const [buttonFont, setButtonFont] = useState("Arial, sans-serif")
  const [themePadding, setThemePadding] = useState("25px")

  const [h1Size, setH1Size] = useState("22px")
  const [h1LineHeight, setH1LineHeight] = useState("30px")
  const [h1Weight, setH1Weight] = useState("400")
  const [h2Size, setH2Size] = useState("20px")
  const [h2LineHeight, setH2LineHeight] = useState("28px")
  const [h2Weight, setH2Weight] = useState("400")
  const [h3Size, setH3Size] = useState("18px")
  const [h3LineHeight, setH3LineHeight] = useState("26px")
  const [h3Weight, setH3Weight] = useState("400")
  const [h4Size, setH4Size] = useState("16px")
  const [h4LineHeight, setH4LineHeight] = useState("24px")
  const [h4Weight, setH4Weight] = useState("400")
  const [bodySize, setBodySize] = useState("15px")
  const [bodyLineHeight, setBodyLineHeight] = useState("22px")
  const [bodyWeight, setBodyWeight] = useState("400")
  const [buttonSize, setButtonSize] = useState("15px")
  const [buttonLineHeight, setButtonLineHeight] = useState("22px")
  const [buttonWeight, setButtonWeight] = useState("400")
  const [linkWeight, setLinkWeight] = useState("400")
  const [buttonPaddingTop, setButtonPaddingTop] = useState("10")
  const [buttonPaddingRight, setButtonPaddingRight] = useState("20")
  const [buttonPaddingBottom, setButtonPaddingBottom] = useState("10")
  const [buttonPaddingLeft, setButtonPaddingLeft] = useState("20")
  const [buttonBorderRadius, setButtonBorderRadius] = useState("4px")
  const [titlePaddingBottom, setTitlePaddingBottom] = useState("14")

  const [googleFontImport, setGoogleFontImport] = useState("")
  const [customImport, setCustomImport] = useState("")
  const [webfontImports, setWebfontImports] = useState("")
  const [bulkColorText, setBulkColorText] = useState("")
  const [globalIconStyle, setGlobalIconStyle] = useState("material-sharp")
  const [globalIconSize, setGlobalIconSize] = useState("18")

  const [generatedCombinations, setGeneratedCombinations] = useState<StyleDefinition[]>([])
  const [showCombinationGenerator, setShowCombinationGenerator] = useState(false)
  const [cssRefreshKey, setCssRefreshKey] = useState(0)
  const [currentStep, setCurrentStep] = useState(1)

  // Load from localStorage on client mount
  useEffect(() => {
    setColors(
      loadFromLocalStorage("themeColors", [
        { id: "1", name: "White", hex: "#ffffff" },
        { id: "2", name: "Black", hex: "#000000" },
      ]) as ColorDefinition[],
    )
    setH1Font(loadFromLocalStorage("h1Font", "Arial, sans-serif") as string)
    setH2Font(loadFromLocalStorage("h2Font", "Arial, sans-serif") as string)
    setH3Font(loadFromLocalStorage("h3Font", "Arial, sans-serif") as string)
    setH4Font(loadFromLocalStorage("h4Font", "Arial, sans-serif") as string)
    setBodyFont(loadFromLocalStorage("bodyFont", "Arial, sans-serif") as string)
    setButtonFont(loadFromLocalStorage("buttonFont", "Arial, sans-serif") as string)
    const savedPadding = loadFromLocalStorage("themePadding", "25px") as string
    setThemePadding(savedPadding === "15px" ? "25px" : savedPadding)
    setH1Size(loadFromLocalStorage("h1Size", "22px") as string)
    setH1LineHeight(loadFromLocalStorage("h1LineHeight", "30px") as string)
    setH1Weight(loadFromLocalStorage("h1Weight", "400") as string)
    setH2Size(loadFromLocalStorage("h2Size", "20px") as string)
    setH2LineHeight(loadFromLocalStorage("h2LineHeight", "28px") as string)
    setH2Weight(loadFromLocalStorage("h2Weight", "400") as string)
    setH3Size(loadFromLocalStorage("h3Size", "18px") as string)
    setH3LineHeight(loadFromLocalStorage("h3LineHeight", "26px") as string)
    setH3Weight(loadFromLocalStorage("h3Weight", "400") as string)
    setH4Size(loadFromLocalStorage("h4Size", "16px") as string)
    setH4LineHeight(loadFromLocalStorage("h4LineHeight", "24px") as string)
    setH4Weight(loadFromLocalStorage("h4Weight", "400") as string)
    setBodySize(loadFromLocalStorage("bodySize", "15px") as string)
    setBodyLineHeight(loadFromLocalStorage("bodyLineHeight", "22px") as string)
    setBodyWeight(loadFromLocalStorage("bodyWeight", "400") as string)
    setButtonSize(loadFromLocalStorage("buttonSize", "15px") as string)
    setButtonLineHeight(loadFromLocalStorage("buttonLineHeight", "22px") as string)
    setButtonWeight(loadFromLocalStorage("buttonWeight", "400") as string)
    setLinkWeight(loadFromLocalStorage("linkWeight", "400") as string)
    setButtonPaddingTop(loadFromLocalStorage("buttonPaddingTop", "10") as string)
    setButtonPaddingRight(loadFromLocalStorage("buttonPaddingRight", "20") as string)
    setButtonPaddingBottom(loadFromLocalStorage("buttonPaddingBottom", "10") as string)
    setButtonPaddingLeft(loadFromLocalStorage("buttonPaddingLeft", "20") as string)
    setButtonBorderRadius(loadFromLocalStorage("buttonBorderRadius", "4px") as string)
    setTitlePaddingBottom(loadFromLocalStorage("titlePaddingBottom", "14") as string)
    setGoogleFontImport(loadFromLocalStorage("googleFontImport", "") as string)
    setCustomImport(loadFromLocalStorage("customImport", "") as string)
    setWebfontImports(loadFromLocalStorage("webfontImports", "") as string)
    setStyles(loadFromLocalStorage("themeStyles", []) as StyleDefinition[])
    setGlobalIconStyle(loadFromLocalStorage("globalIconStyle", "material-sharp") as string)
    setGlobalIconSize(loadFromLocalStorage("globalIconSize", "18") as string)
  }, [])

  return {
    colors,
    setColors,
    styles,
    setStyles,
    h1Font,
    setH1Font,
    h2Font,
    setH2Font,
    h3Font,
    setH3Font,
    h4Font,
    setH4Font,
    bodyFont,
    setBodyFont,
    buttonFont,
    setButtonFont,
    themePadding,
    setThemePadding,
    h1Size,
    setH1Size,
    h1LineHeight,
    setH1LineHeight,
    h1Weight,
    setH1Weight,
    h2Size,
    setH2Size,
    h2LineHeight,
    setH2LineHeight,
    h2Weight,
    setH2Weight,
    h3Size,
    setH3Size,
    h3LineHeight,
    setH3LineHeight,
    h3Weight,
    setH3Weight,
    h4Size,
    setH4Size,
    h4LineHeight,
    setH4LineHeight,
    h4Weight,
    setH4Weight,
    bodySize,
    setBodySize,
    bodyLineHeight,
    setBodyLineHeight,
    bodyWeight,
    setBodyWeight,
    buttonSize,
    setButtonSize,
    buttonLineHeight,
    setButtonLineHeight,
    buttonWeight,
    setButtonWeight,
    linkWeight,
    setLinkWeight,
    buttonPaddingTop,
    setButtonPaddingTop,
    buttonPaddingRight,
    setButtonPaddingRight,
    buttonPaddingBottom,
    setButtonPaddingBottom,
    buttonPaddingLeft,
    setButtonPaddingLeft,
    buttonBorderRadius,
    setButtonBorderRadius,
    titlePaddingBottom,
    setTitlePaddingBottom,
    googleFontImport,
    setGoogleFontImport,
    customImport,
    setCustomImport,
    webfontImports,
    setWebfontImports,
    bulkColorText,
    setBulkColorText,
    globalIconStyle,
    setGlobalIconStyle,
    globalIconSize,
    setGlobalIconSize,
    generatedCombinations,
    setGeneratedCombinations,
    showCombinationGenerator,
    setShowCombinationGenerator,
    cssRefreshKey,
    setCssRefreshKey,
    currentStep,
    setCurrentStep,
  }
}
