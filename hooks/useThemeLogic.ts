"use client"

import { ColorDefinition, StyleDefinition } from "@/lib/types"
import { getContrastRatio } from "@/lib/styles"

export const useThemeLogic = (
  colors: ColorDefinition[],
  setColors: (colors: ColorDefinition[]) => void,
  styles: StyleDefinition[],
  setStyles: (styles: StyleDefinition[]) => void,
  headingFont: string,
  bodyFont: string,
  buttonFont: string,
  h1Size: string,
  h1LineHeight: string,
  h1Weight: string,
  h2Size: string,
  h2LineHeight: string,
  h2Weight: string,
  h3Size: string,
  h3LineHeight: string,
  h3Weight: string,
  h4Size: string,
  h4LineHeight: string,
  h4Weight: string,
  bodySize: string,
  bodyLineHeight: string,
  bodyWeight: string,
  buttonSize: string,
  buttonLineHeight: string,
  buttonWeight: string,
) => {
  const addColor = () => {
    setColors([...colors, { id: Date.now().toString(), name: "", hex: "#000000" }])
  }

  const removeColor = (id: string) => {
    setColors(colors.filter((c) => c.id !== id))
  }

  const updateColor = (id: string, field: "name" | "hex", value: string) => {
    setColors(colors.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const importColorsFromText = (bulkColorText: string) => {
    const entries = bulkColorText.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    const newColors: ColorDefinition[] = []

    entries.forEach((entry) => {
      const match = entry.match(/^(#[0-9A-Fa-f]{6})\s+[-–—]?\s*(.+)$/)
      if (match) {
        const [, hex, name] = match
        if (hex && name && name.trim()) {
          newColors.push({
            id: Date.now().toString() + Math.random(),
            name: name.trim(),
            hex: hex.toUpperCase(),
          })
        }
      }
    })

    if (newColors.length > 0) {
      setColors([...colors, ...newColors])
      return true
    }
    return false
  }

  const addStyle = () => {
    const styleNumber = styles.length + 1
    const whiteColor = colors.find(c => c.hex === "#ffffff") || colors[0]
    const blackColor = colors.find(c => c.hex === "#000000") || colors[1]
    
    setStyles([
      ...styles,
      {
        id: Date.now().toString(),
        name: `Style ${styleNumber}`,
        description: "",
        background: whiteColor?.name || "White",
        textColor: blackColor?.name || "Black",
        headingColor: blackColor?.name || "Black",
        buttonBg: blackColor?.name || "Black",
        buttonText: whiteColor?.name || "White",
        linkColor: blackColor?.name || "Black",
        headingFont: headingFont || "Arial, sans-serif",
        bodyFont: bodyFont || "Arial, sans-serif",
        buttonFont: buttonFont || "Arial, sans-serif",
        h1Size: h1Size || "22px",
        h1LineHeight: h1LineHeight || "30px",
        h1Weight: h1Weight || "400",
        h2Size: h2Size || "20px",
        h2LineHeight: h2LineHeight || "28px",
        h2Weight: h2Weight || "400",
        h3Size: h3Size || "18px",
        h3LineHeight: h3LineHeight || "26px",
        h3Weight: h3Weight || "400",
        h4Size: h4Size || "16px",
        h4LineHeight: h4LineHeight || "24px",
        h4Weight: h4Weight || "400",
        bodySize: bodySize || "15px",
        bodyLineHeight: bodyLineHeight || "22px",
        bodyWeight: bodyWeight || "400",
        buttonSize: buttonSize || "15px",
        buttonLineHeight: buttonLineHeight || "22px",
        buttonWeight: buttonWeight || "400",
        noPadding: false,
      },
    ])
  }

  const removeStyle = (id: string) => {
    const remainingStyles = styles.filter((s) => s.id !== id)
    const renumberedStyles = remainingStyles.map((s, index) => ({
      ...s,
      name: `Style ${index + 1}`,
    }))
    setStyles(renumberedStyles)
  }

  const moveStyle = (styleId: string, direction: "up" | "down") => {
    const currentIndex = styles.findIndex((s) => s.id === styleId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= styles.length) return

    const newStyles = [...styles]
    const [movedStyle] = newStyles.splice(currentIndex, 1)
    newStyles.splice(newIndex, 0, movedStyle)

    setStyles(newStyles)
  }

  const duplicateStyle = (styleId: string) => {
    const styleToClone = styles.find((s) => s.id === styleId)
    if (!styleToClone) return

    const clonedStyle = {
      ...styleToClone,
      id: Date.now().toString(),
      name: `${styleToClone.name} (Copy)`,
    }

    const currentIndex = styles.findIndex((s) => s.id === styleId)
    const newStyles = [...styles]
    newStyles.splice(currentIndex + 1, 0, clonedStyle)
    
    setStyles(newStyles)
  }

  const updateStyle = (id: string, field: keyof StyleDefinition, value: string) => {
    setStyles(styles.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const generateDescription = (style: StyleDefinition): string => {
    const text = `${style.background} background with ${style.headingColor} headings and ${style.buttonBg} buttons`
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }

  const updateStyleWithSmartDescription = (id: string, field: keyof StyleDefinition, value: string) => {
    setStyles(
      styles.map((s) => {
        if (s.id === id) {
          const updated = { ...s, [field]: value }
          if (["background", "textColor", "headingColor", "buttonBg", "buttonText", "linkColor"].includes(field)) {
            updated.description = generateDescription(updated)
          }
          return updated
        }
        return s
      }),
    )
  }

  const generateHighContrastCombinations = (setGeneratedCombinations: (combs: StyleDefinition[]) => void, setShowCombinationGenerator: (show: boolean) => void) => {
    if (colors.length < 2) {
      alert("Please add at least 2 colours to generate combinations")
      return
    }

    const combinations: StyleDefinition[] = []
    const minTextContrast = 4.5
    const minButtonContrast = 3

    colors.forEach((bgColor) => {
      colors.forEach((textColor) => {
        if (bgColor.id === textColor.id) return
        const textContrast = getContrastRatio(bgColor.hex, textColor.hex)
        if (textContrast < minTextContrast) return

        colors.forEach((headingColor) => {
          if (bgColor.id === headingColor.id) return
          const headingContrast = getContrastRatio(bgColor.hex, headingColor.hex)
          if (headingContrast < minTextContrast) return

          colors.forEach((linkColor) => {
            if (bgColor.id === linkColor.id) return
            const linkContrast = getContrastRatio(bgColor.hex, linkColor.hex)
            if (linkContrast < minTextContrast) return

            colors.forEach((btnBg) => {
              if (btnBg.id === bgColor.id) return
              colors.forEach((btnText) => {
                if (btnBg.id === btnText.id) return
                const btnContrast = getContrastRatio(btnBg.hex, btnText.hex)
                if (btnContrast < minButtonContrast) return

                const combo: StyleDefinition = {
                  id: `combo-${Date.now()}-${Math.random()}`,
                  name: `Combination ${combinations.length + 1}`,
                  description: `${bgColor.name} background with ${headingColor.name} headings and ${btnBg.name} buttons`,
                  background: bgColor.name,
                  textColor: textColor.name,
                  headingColor: headingColor.name,
                  buttonBg: btnBg.name,
                  buttonText: btnText.name,
                  linkColor: linkColor.name,
                  headingFont: headingFont,
                  bodyFont: bodyFont,
                  buttonFont: buttonFont,
                  h1Size: h1Size,
                  h1LineHeight: h1LineHeight,
                  h1Weight: h1Weight,
                  h2Size: h2Size,
                  h2LineHeight: h2LineHeight,
                  h2Weight: h2Weight,
                  h3Size: h3Size,
                  h3LineHeight: h3LineHeight,
                  h3Weight: h3Weight,
                  h4Size: h4Size,
                  h4LineHeight: h4LineHeight,
                  h4Weight: h4Weight,
                  bodySize: bodySize,
                  bodyLineHeight: bodyLineHeight,
                  bodyWeight: bodyWeight,
                  buttonSize: buttonSize,
                  buttonLineHeight: buttonLineHeight,
                  buttonWeight: buttonWeight,
                  noPadding: false,
                }
                combinations.push(combo)

                if (combinations.length >= 15) return
              })
              if (combinations.length >= 15) return
            })
            if (combinations.length >= 15) return
          })
        })
      })
      if (combinations.length >= 15) return
    })

    setGeneratedCombinations(combinations.slice(0, 15))
    setShowCombinationGenerator(true)
  }

  return {
    addColor,
    removeColor,
    updateColor,
    importColorsFromText,
    addStyle,
    removeStyle,
    moveStyle,
    duplicateStyle,
    updateStyle,
    generateDescription,
    updateStyleWithSmartDescription,
    generateHighContrastCombinations,
  }
}
