"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Trash2, Plus, ChevronUp, ChevronDown, Copy, Check, Sparkles, HelpCircle, Upload, X, CheckCircle, AlertCircle, PaintBucket, Type, Link, Square, Smile, Maximize2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

// Import types
import { ColorDefinition, StyleDefinition } from "@/lib/types"

// Import utilities
import { generateCSS, getColorHex, getContrastRatio, findAccessibleAlternatives } from "@/lib/styles"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import { cleanFontValue, formatFontForCSS, getAvailableFonts, toCssPx } from "@/lib/utils/helpers"
import { FONT_WEIGHT_OPTIONS, getFontWeightLabel } from "@/lib/font-weights"
import { buildIconTemplates } from "@/lib/icon-templates"
import { splitTitlePadding } from "@/lib/title-padding"
import { clearedTypographyOverrides, hasTypographyOverrides } from "@/lib/typography-overrides"
import { checkAllContrasts, getComplianceLevel, isLargeTextForWCAG, type ContrastResults, type TextEvaluationConfig } from "@/lib/wcag"
import { validateCSS, formatValidationResults } from "@/lib/validators/css-validator"
import {
  validateBeforeAddingColour,
  validatePalette,
  validateTypographyForStep,
  validateThemeForSave,
  stripHexWhitespace,
  normaliseHexOnBlur,
  type TypographyValues,
} from "@/lib/validators/theme-validator"

// Import components
import { SyntaxHighlightedCSS, SyntaxHighlightedHTML } from "@/components/common/SyntaxHighlight"
import { PasswordModal } from "@/components/common/PasswordModal"
import { AppHeader } from "@/components/common/AppHeader"
import { DevInformationModal } from "@/components/common/DevInformationModal"
import { ThemeContextPanel } from "@/components/common/ThemeContextPanel"
import { ValidationMessage } from "@/components/common/ValidationMessage"
import { NumberField, FontField } from "@/components/common/ThemeFields"

// Import hooks
import { useThemeState } from "@/hooks/useThemeState"

export default function ThemeGenerator() {
  const [isClient, setIsClient] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [copied, setCopied] = useState(false)
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [copiedMedia, setCopiedMedia] = useState(false)
  const [colorImportError, setColorImportError] = useState("")
  const [colorNameError, setColorNameError] = useState("")
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const isInitializedRef = useRef(false)
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [typographyEnabledIds, setTypographyEnabledIds] = useState<Set<string>>(new Set())
  // Purely visual: which styles have their override fields folded away.
  const [typographyCollapsedIds, setTypographyCollapsedIds] = useState<Set<string>>(new Set())
  const [showDevInfo, setShowDevInfo] = useState(false)
  const [copiedCss, setCopiedCss] = useState(false)
  const [copiedImport, setCopiedImport] = useState(false)
  const [resetStyles, setResetStyles] = useState<Set<string>>(new Set())
  const [themeName, setThemeName] = useState("Untitled Theme")
  const [themeType, setThemeType] = useState("composer")
  const [savedTimeAgo, setSavedTimeAgo] = useState("")
  const [wcagFilter, setWcagFilter] = useState<'all' | 'AA' | 'AAA'>('all')
  const [activeContrastSuggestionStyleId, setActiveContrastSuggestionStyleId] = useState<string | null>(null)
  const [cssValidationResult, setCssValidationResult] = useState<any>(null)
  const { toast } = useToast()

  /**
   * A style is treated as overriding typography when it has been switched on in
   * this session or already carries override values from a loaded theme.
   */
  // Read lazily: the global typography state is destructured further down.
  const typographyGlobals = () => ({
    h1Font, h2Font, h3Font, h4Font, bodyFont, buttonFont,
    h1Size, h1LineHeight, h1Weight,
    h2Size, h2LineHeight, h2Weight,
    h3Size, h3LineHeight, h3Weight,
    h4Size, h4LineHeight, h4Weight,
    bodySize, bodyLineHeight, bodyWeight,
    linkWeight,
    buttonSize, buttonLineHeight, buttonWeight,
    buttonBorderRadius,
    buttonPaddingTop, buttonPaddingRight, buttonPaddingBottom, buttonPaddingLeft,
  })

  const typographyOverridesOn = (style: StyleDefinition): boolean =>
    typographyEnabledIds.has(style.id) || hasTypographyOverrides(style, typographyGlobals())

  const setTypographyOverridesOn = (styleId: string, enabled: boolean) => {
    const newSet = new Set(typographyEnabledIds)
    if (enabled) {
      newSet.add(styleId)
      // Enabling means the user wants to edit, so show the fields.
      setTypographyCollapsedIds((prev) => {
        const next = new Set(prev)
        next.delete(styleId)
        return next
      })
    } else {
      newSet.delete(styleId)
      // Switching off reverts the style to the Step 3 typography.
      setStyles((prev) =>
        prev.map((s) => (s.id === styleId ? { ...s, ...clearedTypographyOverrides() } : s)),
      )
    }
    setTypographyEnabledIds(newSet)
  }

  const typographyCollapsed = (styleId: string) => typographyCollapsedIds.has(styleId)

  const toggleTypographyCollapsed = (styleId: string) => {
    setTypographyCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(styleId)) next.delete(styleId)
      else next.add(styleId)
      return next
    })
  }



  // Safe value extractors for typography fields
  const getDisplayValue = (styleValue: string | undefined, globalValue: string | undefined, defaultValue: string = "0") => {
    const value = styleValue || globalValue || defaultValue
    return value.replace("px", "")
  }

  const getDisplayFont = (styleValue: string | undefined, globalValue: string | undefined, defaultValue: string = "Arial, sans-serif") => {
    return styleValue || globalValue || defaultValue
  }

  const getWeightLabel = getFontWeightLabel
  
  // Import theme state from hook
  const themeState = useThemeState()
  const {
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
  } = themeState

  const namedColors = useMemo(() => colors.filter((c) => c.name.trim() !== ""), [colors])

  // Authentication handlers
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setPasswordInput("")
      } else {
        setPasswordError("Incorrect password")
        setPasswordInput("")
      }
    } catch (error) {
      setPasswordError("Authentication failed")
      console.error(error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }


  // localStorage sync effects
  useEffect(() => { saveToLocalStorage("themeColors", colors) }, [colors])
  useEffect(() => { localStorage.setItem("themeName", themeName) }, [themeName])
  useEffect(() => { localStorage.setItem("themeType", themeType) }, [themeType])
  useEffect(() => { saveToLocalStorage("h1Font", h1Font) }, [h1Font])
  useEffect(() => { saveToLocalStorage("h2Font", h2Font) }, [h2Font])
  useEffect(() => { saveToLocalStorage("h3Font", h3Font) }, [h3Font])
  useEffect(() => { saveToLocalStorage("h4Font", h4Font) }, [h4Font])
  useEffect(() => { saveToLocalStorage("bodyFont", bodyFont) }, [bodyFont])
  useEffect(() => { saveToLocalStorage("buttonFont", buttonFont) }, [buttonFont])
  useEffect(() => { saveToLocalStorage("themePadding", themePadding) }, [themePadding])
  useEffect(() => { saveToLocalStorage("h1Size", h1Size) }, [h1Size])
  useEffect(() => { saveToLocalStorage("h1LineHeight", h1LineHeight) }, [h1LineHeight])
  useEffect(() => { saveToLocalStorage("h1Weight", h1Weight) }, [h1Weight])
  useEffect(() => { saveToLocalStorage("h2Size", h2Size) }, [h2Size])
  useEffect(() => { saveToLocalStorage("h2LineHeight", h2LineHeight) }, [h2LineHeight])
  useEffect(() => { saveToLocalStorage("h2Weight", h2Weight) }, [h2Weight])
  useEffect(() => { saveToLocalStorage("h3Size", h3Size) }, [h3Size])
  useEffect(() => { saveToLocalStorage("h3LineHeight", h3LineHeight) }, [h3LineHeight])
  useEffect(() => { saveToLocalStorage("h3Weight", h3Weight) }, [h3Weight])
  useEffect(() => { saveToLocalStorage("h4Size", h4Size) }, [h4Size])
  useEffect(() => { saveToLocalStorage("h4LineHeight", h4LineHeight) }, [h4LineHeight])
  useEffect(() => { saveToLocalStorage("h4Weight", h4Weight) }, [h4Weight])
  useEffect(() => { saveToLocalStorage("bodySize", bodySize) }, [bodySize])
  useEffect(() => { saveToLocalStorage("bodyLineHeight", bodyLineHeight) }, [bodyLineHeight])
  useEffect(() => { saveToLocalStorage("bodyWeight", bodyWeight) }, [bodyWeight])
  useEffect(() => { saveToLocalStorage("buttonSize", buttonSize) }, [buttonSize])
  useEffect(() => { saveToLocalStorage("buttonLineHeight", buttonLineHeight) }, [buttonLineHeight])
  useEffect(() => { saveToLocalStorage("buttonWeight", buttonWeight) }, [buttonWeight])
  useEffect(() => { saveToLocalStorage("buttonPaddingTop", buttonPaddingTop) }, [buttonPaddingTop])
  useEffect(() => { saveToLocalStorage("buttonPaddingRight", buttonPaddingRight) }, [buttonPaddingRight])
  useEffect(() => { saveToLocalStorage("buttonPaddingBottom", buttonPaddingBottom) }, [buttonPaddingBottom])
  useEffect(() => { saveToLocalStorage("buttonPaddingLeft", buttonPaddingLeft) }, [buttonPaddingLeft])
  useEffect(() => { saveToLocalStorage("buttonBorderRadius", buttonBorderRadius) }, [buttonBorderRadius])
  useEffect(() => { saveToLocalStorage("titlePaddingBottom", titlePaddingBottom) }, [titlePaddingBottom])
  useEffect(() => { localStorage.setItem("googleFontImport", googleFontImport) }, [googleFontImport])
  useEffect(() => { localStorage.setItem("webfontImports", webfontImports) }, [webfontImports])
  useEffect(() => { localStorage.setItem("customImport", customImport) }, [customImport])
  useEffect(() => { saveToLocalStorage("globalIconStyle", globalIconStyle) }, [globalIconStyle])
  useEffect(() => { saveToLocalStorage("globalIconSize", globalIconSize) }, [globalIconSize])
  useEffect(() => { saveToLocalStorage("themeStyles", styles) }, [styles])
  useEffect(() => () => { if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current) }, [])

  // Initialize client and fonts list
  useEffect(() => {
    setIsClient(true)
    
    // Load theme name and saved time from localStorage
    const savedThemeName = localStorage.getItem("themeName")
    if (savedThemeName) {
      setThemeName(savedThemeName)
    }
    
    const savedThemeType = localStorage.getItem("themeType")
    if (savedThemeType) {
      setThemeType(savedThemeType)
    }
    
    const lastSaved = localStorage.getItem("lastSavedTime")
    if (lastSaved) {
      const lastSavedDate = new Date(lastSaved)
      const now = new Date()
      const diffMs = now.getTime() - lastSavedDate.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) {
        setSavedTimeAgo("Saved just now")
      } else if (diffMins < 60) {
        setSavedTimeAgo(`Saved ${diffMins} min${diffMins !== 1 ? 's' : ''} ago`)
      } else {
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) {
          setSavedTimeAgo(`Saved ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`)
        } else {
          const diffDays = Math.floor(diffHours / 24)
          setSavedTimeAgo(`Saved ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`)
        }
      }
    }
    
    // Check if already authenticated via cookie
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', { method: 'GET' })
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            setIsAuthenticated(true)
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      }
    }
    checkAuth()
  }, [])

  // Initialize the component after data is loaded from localStorage
  useEffect(() => {
    // Use setTimeout to ensure all other useEffects have run and loaded data from localStorage
    setTimeout(() => {
      isInitializedRef.current = true
    }, 0)
  }, [])

  // Track unsaved changes (only after initial load)
  useEffect(() => {
    if (isInitializedRef.current) {
      setHasUnsavedChanges(true)
    }
  }, [colors, styles, h1Font, h2Font, h3Font, h4Font, bodyFont, buttonFont, themePadding, h1Size, h1LineHeight, h1Weight, h2Size, h2LineHeight, h2Weight, h3Size, h3LineHeight, h3Weight, h4Size, h4LineHeight, h4Weight, bodySize, bodyLineHeight, bodyWeight, buttonSize, buttonLineHeight, buttonWeight, buttonPaddingTop, buttonPaddingRight, buttonPaddingBottom, buttonPaddingLeft, buttonBorderRadius, titlePaddingBottom, googleFontImport, customImport, webfontImports, globalIconStyle, globalIconSize])

  // Sync all font imports into webfontImports (only if the sync result has content)
  useEffect(() => {
    const imports = [googleFontImport, customImport]
      .filter(imp => imp.trim() !== "")
      .join("\n")
    
    // Only sync if there's actual content from the individual import fields
    // AND the current webfontImports either matches the sync result OR is empty
    // This preserves direct textarea edits that don't match the sync output
    if (imports.trim() !== "" && (!webfontImports || webfontImports === imports)) {
      setWebfontImports(imports)
    }
  }, [googleFontImport, customImport])

  // Inject webfont imports into document head
  useEffect(() => {
    if (!isClient || !webfontImports) return

    const styleId = "webfont-imports"
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null
    
    if (!styleTag) {
      styleTag = document.createElement("style")
      styleTag.id = styleId
      document.head.appendChild(styleTag)
    }
    
    styleTag.textContent = webfontImports
  }, [webfontImports, isClient])

  useEffect(() => {
    localStorage.setItem("themeStyles", JSON.stringify(styles))
  }, [styles])

  const addColor = () => {
    // Blocks a blank row being appended on top of an incomplete one.
    const error = validateBeforeAddingColour(colors)
    if (error) {
      setColorNameError(error)
      return
    }
    setColorNameError("")
    setColors([...colors, { id: Date.now().toString(), name: "", hex: "#000000" }])
  }

  const validateColorsForStep = (): boolean => {
    const error = validatePalette(colors)
    setColorNameError(error ?? "")
    return !error
  }

  const currentTypography = (): TypographyValues => ({
    h1Font, h1Size, h1LineHeight,
    h2Font, h2Size, h2LineHeight,
    h3Font, h3Size, h3LineHeight,
    h4Font, h4Size, h4LineHeight,
    bodyFont, bodySize, bodyLineHeight,
    buttonFont, buttonSize, buttonLineHeight,
  })

  /** Validation failures surface as a toast beside the button that was clicked. */
  const showValidationToast = (title: string, message: string) => {
    toast({ title, description: message, variant: "destructive" })
  }

  const validateTypographyForNext = (): boolean => {
    const error = validateTypographyForStep(currentTypography())
    if (error) showValidationToast("Cannot continue", error)
    return !error
  }

  /** Shared by all three save entry points. */
  const validateBeforeSave = (): boolean => {
    const error = validateThemeForSave({
      themeName,
      colors,
      styles,
      typography: currentTypography(),
    })
    if (error) showValidationToast("Cannot save theme", error)
    return !error
  }

  const removeColor = (id: string) => {
    setColors(colors.filter((c) => c.id !== id))
    // The message is recomputed on the next add/next attempt. Clearing it on any
    // edit keeps the Next button, which is disabled while an error is showing,
    // from becoming a dead end after the user has fixed the problem.
    setColorNameError("")
  }

  const updateColor = (id: string, field: "name" | "hex", value: string) => {
    const next = field === "hex" ? stripHexWhitespace(value) : value
    setColors(colors.map((c) => (c.id === id ? { ...c, [field]: next } : c)))
    setColorNameError("")
  }

  const importColorsFromText = () => {
    setColorImportError("")
    // Split by comma or newline
    const entries = bulkColorText.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    const newColors: ColorDefinition[] = []
    const invalidEntries: string[] = []

    entries.forEach((entry) => {
      // Match patterns like "#000 Black", "#000 - Black", "#000 — Black"
      // OR "Black #000", "Black - #000", "Black — #000"
      const match1 = entry.match(/^(#[0-9A-Fa-f]{6})\s+[-–—]?\s*(.+)$/)
      const match2 = entry.match(/^(.+?)\s+[-–—]?\s*(#[0-9A-Fa-f]{6})$/)
      
      const match = match1 || match2
      
      if (match) {
        let hex: string = ""
        let name: string = ""
        
        if (match1) {
          [, hex, name] = match1
        } else if (match2) {
          const [, nameVal, hexVal] = match2
          hex = hexVal
          name = nameVal
        } else {
          return
        }
        
        if (hex && name && name.trim()) {
          newColors.push({
            id: Date.now().toString() + Math.random(),
            name: name.trim(),
            hex: hex.toUpperCase(),
          })
        }
      } else {
        invalidEntries.push(entry)
      }
    })

    if (newColors.length > 0) {
      setColors([...colors, ...newColors])
      setBulkColorText("")
      // Importing is one of the ways to resolve a palette error. Without this
      // the Next button, which is disabled while an error is showing, stays
      // disabled after the user has fixed the problem.
      setColorNameError("")
      if (invalidEntries.length > 0) {
        setColorImportError(`Added ${newColors.length} colour(s), but ${invalidEntries.length} line(s) had invalid format.`)
      }
    } else if (bulkColorText.trim()) {
      setColorImportError("No valid colours found. Please add a colour name with a hex code (e.g., #ffffff White).")
    }
  }

  const addStyle = () => {
    const whiteColor = colors.find(c => c.hex === "#ffffff") || colors[0]
    const blackColor = colors.find(c => c.hex === "#000000") || colors[1]
    
    const bgName = whiteColor?.name || "White"
    const headingName = blackColor?.name || "Black"
    const buttonName = blackColor?.name || "Black"
    const description = headingName === buttonName 
      ? `${bgName} background with ${headingName.toLowerCase()} headings and buttons`
      : `${bgName} background with ${headingName.toLowerCase()} headings and ${buttonName.toLowerCase()} buttons`
    
    const newStyleId = Date.now().toString()
    
    setStyles((prev) => [
      ...prev,
      {
        id: newStyleId,
        name: `Style ${prev.length + 1}`,
        description: description,
        background: whiteColor?.name || "White",
        textColor: blackColor?.name || "Black",
        headingColor: blackColor?.name || "Black",
        buttonBg: blackColor?.name || "Black",
        buttonText: whiteColor?.name || "White",
        buttonBgHover: blackColor?.name || "Black",
        buttonTextHover: whiteColor?.name || "White",
        linkColor: blackColor?.name || "Black",
        h1Font: h1Font || "Arial, sans-serif",
        h2Font: h2Font || "Arial, sans-serif",
        h3Font: h3Font || "Arial, sans-serif",
        h4Font: h4Font || "Arial, sans-serif",
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
        iconColor: "#000000",
        buttonBorderWidth: "0",
        buttonBorderColor: "none",
        buttonBorderColorHover: blackColor?.name || "Black",
      },
    ])
    
    // Smooth scroll to the newly added style
    setTimeout(() => {
      const element = document.getElementById(`style-${newStyleId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 0)
  }

  const removeStyle = (id: string) => {
    setStyles((prev) => {
      const remainingStyles = prev.filter((s) => s.id !== id)
      return remainingStyles.map((s, index) => ({
        ...s,
        name: `Style ${index + 1}`,
      }))
    })
  }

  const moveStyle = (styleId: string, direction: "up" | "down") => {
    setStyles((prev) => {
      const currentIndex = prev.findIndex((s) => s.id === styleId)
      if (currentIndex === -1) return prev

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

      // Check bounds
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newStyles = [...prev]
      const [movedStyle] = newStyles.splice(currentIndex, 1)
      newStyles.splice(newIndex, 0, movedStyle)

      return newStyles
    })
    
    // Scroll to the moved style after a brief delay to allow DOM to update
    setTimeout(() => {
      const element = document.getElementById(`style-${styleId}`)
      if (element) {
        // Get the header height to account for sticky positioning
        const header = document.querySelector('header')
        const headerHeight = header?.offsetHeight || 0
        const elementTop = element.getBoundingClientRect().top + window.scrollY
        const offsetTop = elementTop - headerHeight - 20 // 20px padding below header
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        })
      }
    }, 0)
  }

  const duplicateStyle = (styleId: string) => {
    const clonedId = Date.now().toString()
    setStyles((prev) => {
      const styleToClone = prev.find((s) => s.id === styleId)
      if (!styleToClone) return prev

      const clonedStyle = {
        ...styleToClone,
        id: clonedId,
        name: `${styleToClone.name} (Copy)`,
      }

      const currentIndex = prev.findIndex((s) => s.id === styleId)
      const newStyles = [...prev]
      newStyles.splice(currentIndex + 1, 0, clonedStyle)

      return newStyles
    })

    // Smooth scroll to the newly duplicated style
    setTimeout(() => {
      const element = document.getElementById(`style-${clonedId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 0)
  }

  const updateStyle = (id: string, field: keyof StyleDefinition, value: string | boolean) => {
    setStyles((prev) => prev.map((s) => {
      if (s.id === id) {
        const updated = { ...s, [field]: value }
        
        // Mirror button hover colors when button colors change (unless manually customized)
        if (field === "buttonBg" && s.buttonBgHover === s.buttonBg) {
          updated.buttonBgHover = value as string
        }
        if (field === "buttonText" && s.buttonTextHover === s.buttonText) {
          updated.buttonTextHover = value as string
        }
        // Always sync button border color hover when button background hover changes
        if (field === "buttonBgHover") {
          updated.buttonBorderColorHover = value as string
        }
        
        return updated
      }
      return s
    }))
  }

  const generateDescription = (style: StyleDefinition): string => {
    let text: string
    if (style.headingColor === style.buttonBg) {
      text = `${style.background.toLowerCase()} background with ${style.headingColor.toLowerCase()} headings and buttons`
    } else {
      text = `${style.background.toLowerCase()} background with ${style.headingColor.toLowerCase()} headings and ${style.buttonBg.toLowerCase()} buttons`
    }
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  const updateStyleWithSmartDescription = (id: string, field: keyof StyleDefinition, value: string) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, [field]: value }
          // Auto-update description when any colour field changes
          if (["background", "textColor", "headingColor", "buttonBg", "buttonText", "linkColor"].includes(field)) {
            updated.description = generateDescription(updated)
          }
          // Mirror button hover colors when button colors change (unless manually customized)
          if (field === "buttonBg" && s.buttonBgHover === s.buttonBg) {
            updated.buttonBgHover = value
          }
          if (field === "buttonText" && s.buttonTextHover === s.buttonText) {
            updated.buttonTextHover = value
          }
          // Always sync button border color hover when button background hover changes
          if (field === "buttonBgHover") {
            updated.buttonBorderColorHover = value
          }
          return updated
        }
        return s
      }),
    )
  }

  const updateAllStylesFonts = (fontType: "h1" | "h2" | "h3" | "h4" | "body" | "button", value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        [`${fontType}Font`]: value,
      }))
    )
  }

  const updateAllStylesButtonSize = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        buttonSize: value,
      }))
    )
  }

  const updateAllStylesButtonLineHeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        buttonLineHeight: value,
      }))
    )
  }

  const updateAllStylesButtonWeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        buttonWeight: value,
      }))
    )
  }

  const updateAllStylesLinkWeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        linkWeight: value,
      }))
    )
  }

  const updateAllStylesBodySize = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        bodySize: value,
      }))
    )
  }

  const updateAllStylesBodyLineHeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        bodyLineHeight: value,
      }))
    )
  }

  const updateAllStylesBodyWeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        bodyWeight: value,
      }))
    )
  }

  const updateAllStylesH1Size = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h1Size: value,
      }))
    )
  }

  const updateAllStylesH1LineHeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h1LineHeight: value,
      }))
    )
  }

  const updateAllStylesH1Weight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h1Weight: value,
      }))
    )
  }

  const updateAllStylesH2Size = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h2Size: value,
      }))
    )
  }

  const updateAllStylesH2LineHeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h2LineHeight: value,
      }))
    )
  }

  const updateAllStylesH2Weight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h2Weight: value,
      }))
    )
  }

  const updateAllStylesH3Size = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h3Size: value,
      }))
    )
  }

  const updateAllStylesH3LineHeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h3LineHeight: value,
      }))
    )
  }

  const updateAllStylesH3Weight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h3Weight: value,
      }))
    )
  }

  const updateAllStylesH4Size = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h4Size: value,
      }))
    )
  }

  const updateAllStylesH4LineHeight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h4LineHeight: value,
      }))
    )
  }

  const updateAllStylesH4Weight = (value: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        h4Weight: value,
      }))
    )
  }

  const getAvailableFonts = (): string[] => {
    // Extract font families from webfont imports
    const fonts: Set<string> = new Set()
    
    // Match family names in @import statements
    // Matches patterns like family=Roboto or family=Playfair+Display
    const familyMatches = webfontImports.match(/family=([^&;:]+)/g)
    if (familyMatches) {
      familyMatches.forEach((match) => {
        const fontName = match.replace("family=", "").replace(/\+/g, " ")
        fonts.add(fontName)
      })
    }
    
    return Array.from(fonts).sort()
  }





  // Wrapper for getColorHex that uses component colors
  const getColorHexValue = (colorName: string | undefined): string => {
    if (!colorName) return "#000000"
    return getColorHex(colorName, colors)
  }

  const parsePixelSize = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback
    const parsed = parseFloat(value.toString().replace(/[^\d.]/g, ""))
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const parseFontWeightValue = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback
    const parsed = parseInt(value.toString().replace(/\D/g, ""), 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  /**
   * Row status icon. AA and AAA both count as a pass, so both are green; amber
   * is reserved for the recoverable near miss where the pair would pass if the
   * text were sized as large text.
   */
  const contrastIcon = (result: ContrastResults["headingOnBg"]) => {
    if (result.aa) return <CheckCircle size={14} className="text-green-600" />
    if (!result.largeText && result.ratio >= 3) {
      return <AlertCircle size={14} className="text-yellow-600" />
    }
    return <X size={14} className="text-red-600" />
  }

  const getContrastHint = (result: ContrastResults["headingOnBg"]): string | null => {
    if (result.aa) return null

    if (!result.largeText && result.ratio >= 3) {
      return "Passes as large text only. Use 24px regular or 18.66px bold, or increase contrast."
    }

    if (!result.largeText) {
      return "Fails as normal text. Increase contrast or size/weight."
    }

    return "Fails even as large text. Increase color contrast."
  }

  const isTypographyDependentFail = (results: ContrastResults): boolean => {
    const textChecks = [
      results.headingOnBg,
      results.bodyTextOnBg,
      results.linkOnBg,
      results.buttonTextOnButtonBg,
    ]

    const hasRecoverableTypographyFail = textChecks.some(
      (check) => !check.aa && !check.largeText && check.ratio >= 3
    )

    const allTextAtLeastLargeAa = textChecks.every((check) => check.ratio >= 3)

    return (
      hasRecoverableTypographyFail &&
      allTextAtLeastLargeAa &&
      results.buttonBgOnBg.aa &&
      results.iconOnBg.aa
    )
  }

  /**
   * WCAG thresholds depend on whether text counts as "large", which depends on
   * the style's font size and weight. The generator and the checker must derive
   * this the same way: the generator used to fall back to checkAllContrasts'
   * defaults, which assume button text IS large (3:1 for AA), while the checker
   * computed it from the real 15px/600 button and required 4.5:1. Combinations
   * landing between the two were offered as passing and then failed. See #78.
   */
  const buildTextEvaluationConfig = (style: StyleDefinition): TextEvaluationConfig => ({
    headingLargeText: isLargeTextForWCAG(
      parsePixelSize(style.h1Size || h1Size, 22),
      parseFontWeightValue(style.h1Weight || h1Weight, 400),
    ),
    bodyLargeText: isLargeTextForWCAG(
      parsePixelSize(style.bodySize || bodySize, 15),
      parseFontWeightValue(style.bodyWeight || bodyWeight, 400),
    ),
    linkLargeText: isLargeTextForWCAG(
      parsePixelSize(style.bodySize || bodySize, 15),
      parseFontWeightValue(style.linkWeight || linkWeight || style.bodyWeight || bodyWeight, 400),
    ),
    buttonLargeText: isLargeTextForWCAG(
      parsePixelSize(style.buttonSize || buttonSize, 15),
      parseFontWeightValue(style.buttonWeight || buttonWeight, 400),
    ),
  })

  /** The one contrast evaluation used by both the generator and the checker. */
  const evaluateStyleContrast = (style: StyleDefinition): ContrastResults =>
    checkAllContrasts(
      getColorHexValue(style.background),
      getColorHexValue(style.headingColor),
      getColorHexValue(style.textColor),
      getColorHexValue(style.linkColor),
      getColorHexValue(style.buttonBg),
      getColorHexValue(style.buttonText),
      style.iconColor || "#000000",
      buildTextEvaluationConfig(style),
    )

  const calculateWCAGLevel = (combo: StyleDefinition): string => {
    try {
      return getComplianceLevel(evaluateStyleContrast(combo))
    } catch (error) {
      return 'NONE'
    }
  }

  const generateCSS = () => {
    let css = ""
    
    // Add base CSS with placeholders replaced
    // Ensure fonts have fallback values and proper CSS formatting
    const bodyFontVal = formatFontForCSS(bodyFont || "Arial, sans-serif")
    const h1FontVal = formatFontForCSS(h1Font || "Arial, sans-serif")
    const h2FontVal = formatFontForCSS(h2Font || "Arial, sans-serif")
    const h3FontVal = formatFontForCSS(h3Font || "Arial, sans-serif")
    const h4FontVal = formatFontForCSS(h4Font || "Arial, sans-serif")
    const buttonFontVal = formatFontForCSS(buttonFont || "Arial, sans-serif")
    const bodySizeVal = bodySize || "15px"
    const bodyLineHeightVal = bodyLineHeight || "22px"
    const bodyWeightVal = bodyWeight || "400"
    // The links block header and the text under it share the title padding:
    // the text carries its own top padding, so the header takes the remainder.
    const titlePaddingSplit = splitTitlePadding(titlePaddingBottom)
    const h1SizeVal = h1Size || "22px"
    const h1LineHeightVal = h1LineHeight || "30px"
    const h1WeightVal = h1Weight || "400"
    const h2SizeVal = h2Size || "20px"
    const h2LineHeightVal = h2LineHeight || "28px"
    const h2WeightVal = h2Weight || "400"
    const h3SizeVal = h3Size || "18px"
    const h3LineHeightVal = h3LineHeight || "26px"
    const h3WeightVal = h3Weight || "400"
    const h4SizeVal = h4Size || "16px"
    const h4LineHeightVal = h4LineHeight || "24px"
    const h4WeightVal = h4Weight || "400"
    const paddingValue = themePadding.replace("px", "") || "25"
    // Step 2 > Theme padding > Title padding, as entered. Distinct from the
    // links-block split above, which subtracts the content's own top padding.
    const titlePaddingValue = (titlePaddingBottom || "14").replace("px", "")
    const buttonPaddingValue = `${buttonPaddingTop}px ${buttonPaddingRight}px ${buttonPaddingBottom}px ${buttonPaddingLeft}px`
    const buttonBorderRadiusValue = `${buttonBorderRadius || "4px"}`
    
    // Get first style's button background color for default button styling
    const firstStyleButtonBg = styles.length > 0 ? getColorHexValue(styles[0].buttonBg) : "#00677f"
    const firstStyleButtonText = styles.length > 0 ? getColorHexValue(styles[0].buttonText) : "#ffffff"
    const baseCss = `.wrapper [class*="text-style-"] {padding: 5px !Important;}
.style-selector .info, .style-selector .header1 {font-size:14px !Important;line-height:24px !Important;}


#layout .block[data-sd-content=sd-feedback] td.intro {padding-bottom: 0px;}

/*gutter style*/
/*initial size of gutter and margin table*/
.grid .margintable{width:0px;height:22px;}

.grid .guttertable{width:0px;height:22px;}

/*end of gutter style*/
/* Defaults */

#layout table td {font-family: ${bodyFontVal}; }

#layout table, #layout label {font-family: ${bodyFontVal}; font-size:${bodySizeVal};line-height:${bodyLineHeightVal}; font-weight: ${bodyWeightVal};}

#layout .block[data-sd-content=website]{padding:5px ${paddingValue}px}


#layout label.control-label.required:after, #layout .form-group.required .control-label:after {content: '*';}

#layout .form-control {font-size:${bodySizeVal};line-height:${bodyLineHeightVal};}


#layout .form-control {height: 44px; border-radius: 0px;}

#layout label {font-weight: 400;}

#layout .allow [data-sd-content=website] td{/* Style of website link TDs*/
padding:0 8px;font-family: ${bodyFontVal}; text-align:center;border-left:1px solid #999999;border-right:1px solid #999999;}

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
padding:10px ${paddingValue}px 10px ${paddingValue}px;font-size:12px; line-height: 19px; text-align: left; text-decoration: none; font-family: ${bodyFontVal}; }

.figcaption a { text-decoration: none;}

.main, .intro{/* body text of blocks */
font-family: ${bodyFontVal}; }

.header{/* Provides consistent heading height across different email clients*/
}

#layout .add-to-calendar-container td{/* Spacing between "Add to calendar" icons */
padding-right:6px;}



#layout .block[data-image-position=left] td.figure{padding-right:${paddingValue}px;}

#layout .block[data-image-position=right] td.figure{padding-left:${paddingValue}px;}

#layout .block[data-image-position=left] tr.figure-container:last-child td, #layout .block[data-image-position=right] tr.figure-container:last-child td{padding-bottom:${paddingValue}px;}

.calendar-body td, .calendar-body th{/* Styles of calendar table*/
border-top:1px solid #ddd;font-family: ${bodyFontVal}; border-bottom:1px solid #ddd;padding:2px 0}




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
.read-more-wrapper .btn-cm, .read-more-wrapper button.btn-cm, .link-button-wrapper .btn-cm, .link-button-wrapper button.btn-cm{padding-left:${buttonPaddingLeft}px;text-decoration:none;padding-right:${buttonPaddingRight}px;width: auto;}


.btn-cm, button.btn-cm{/* All buttons styles */
background-color:${firstStyleButtonBg}; border: 0px;
color:${firstStyleButtonText};display:inline-block;font-family: ${buttonFontVal}; font-weight:700; text-align:center; text-decoration:none;width:100%;-webkit-text-size-adjust:none;mso-hide:all;padding:${buttonPaddingValue}; transition: all .4s ease; font-size: 14px; line-height: 19px; vertical-align: middle; width: auto; border-radius: ${buttonBorderRadiusValue};}


a.btn-cm.btn-accept, a.btn-cm.btn-decline {width: 100%;}


a.btn-cm.btn-poll {width: 100% !important; padding: ${buttonPaddingTop}px 0px ${buttonPaddingBottom}px 0px !Important;}

.read-more, .link-button {padding-top: 0px;}

a.btn-cm.btn-width-auto {text-decoration: underline; font-weight: normal;}

.link-text {text-align: left;  font-size: ${bodySizeVal}; line-height: ${bodyLineHeightVal}; font-weight: ${bodyWeightVal}; padding-top: ${titlePaddingSplit.linkTextPaddingTop}px;}
.links-body {}
.single-link {text-align: left;}
.link-text a {text-align: left;}
.single-link table {width: 100%;}
#layout .block[data-sd-content="links"] .block-body .header-container .header {padding-bottom:${titlePaddingSplit.headerPaddingBottom}px;}

.share-article {padding-top: 0px;}


#layout .block[data-sd-content="links"] {}
#layout .block[data-sd-content="links"] .block-body .header-container .header {} 

.header1{font-family: ${h1FontVal}; font-size:${h1SizeVal};line-height:${h1LineHeightVal}; font-weight: ${h1WeightVal};}
.header2{font-family: ${h2FontVal}; font-size:${h2SizeVal};line-height:${h2LineHeightVal}; font-weight: ${h2WeightVal};}
.header3{font-family: ${h3FontVal}; font-size:${h3SizeVal};line-height:${h3LineHeightVal}; font-weight: ${h3WeightVal};}
.header4{font-family: ${h4FontVal}; font-size:${h4SizeVal};line-height:${h4LineHeightVal}; font-weight: ${h4WeightVal};}



#layout .block[data-image-position="right"] .share-article, #layout .block[data-image-position="left"] .share-article {padding-top: ${paddingValue}px !Important;}

/* Feedback block: uses the theme padding */
#layout .block[data-sd-content="sd-feedback"] {padding: ${paddingValue}px;}

/* Table headers and footers keep the block background rather than their own */
#layout table thead tr th, #layout table tfoot tr td {background-color: transparent;}

/* Session selector: wrapper takes the title padding, body takes the theme padding */
.sd-session-selector-wrapper {padding-bottom: ${titlePaddingValue}px;}
.sd-session-selector-main {padding-top: ${paddingValue}px;}

/* Registration form spacing, from the theme padding */
.regform-summary-container {padding-bottom: ${paddingValue}px;}
.regform-summary-container[sd-style="STS"] .discountCodeWrapper {padding-bottom: 20px;}
#middle_0_wide .block[data-sd-content="subscription"], #middle_0_wide .block[data-sd-content="sd-total-summary"], #middle_0_wide .block[data-sd-content="event-reg-action"], #middle_0_wide .block[data-sd-content="sd-session-selector"] {padding: ${paddingValue}px;}

/* Guest form spacing, from the theme padding */
.form-group:last-child {margin-bottom: 0px !important;}
.guestHeadingWrapper {padding-top: ${paddingValue}px; margin-top: ${paddingValue}px;}


`
    css = baseCss

    // Landing Pages and Events Desk themes only.
    if (themeType === 'events') {
      css += `#middle_0_wide .block {padding-left: inherit; padding-right: inherit;}\n\n`
    }

    styles.forEach((style, index) => {
      const styleNum = index + 1
      const className = `.text-style-${styleNum}`

      const bgColor = getColorHexValue(style.background)
      const textColor = getColorHexValue(style.textColor)
      const headingColor = getColorHexValue(style.headingColor)
      const btnBg = getColorHexValue(style.buttonBg)
      const btnText = getColorHexValue(style.buttonText)
      const btnBgHover = getColorHexValue(style.buttonBgHover)
      const btnTextHover = getColorHexValue(style.buttonTextHover)
      const linkColor = getColorHexValue(style.linkColor)

      // Use fallback values for all typography if empty
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
      const linkWeightVal = style.linkWeight || linkWeight || "400"
      // Links typography only writes a font-weight from medium (500) upwards.
      // Thin, extra light, light and normal are left to inherit.
      const linkWeightNumeric = parseInt(String(linkWeightVal).replace(/\D/g, "") || "400", 10)
      const linkWeightDecl = linkWeightNumeric >= 500 ? `font-weight: ${linkWeightVal};` : ""
      const READMORE_BTN = "a.btn-cm.btn-width-auto.sd-readmore-btn"
      const btnBorderWidth = style.buttonBorderWidth || "0"
      const btnBorderColor = getColorHexValue((style.buttonBorderColor && style.buttonBorderColor !== "none") ? style.buttonBorderColor : style.buttonBg)
      const btnBorderColorHover = getColorHexValue(style.buttonBorderColorHover || style.buttonBgHover)
      const h1FontVal = formatFontForCSS(style.h1Font || h1Font || "Arial, sans-serif")
      const h2FontVal = formatFontForCSS(style.h2Font || h2Font || "Arial, sans-serif")
      const h3FontVal = formatFontForCSS(style.h3Font || h3Font || "Arial, sans-serif")
      const h4FontVal = formatFontForCSS(style.h4Font || h4Font || "Arial, sans-serif")
      const bodyFontVal = formatFontForCSS(style.bodyFont || bodyFont || "Arial, sans-serif")
      const btnFont = formatFontForCSS(style.buttonFont || buttonFont || "Arial, sans-serif")

      const descriptionPrefix = style.noPadding ? 'No padding - ' : ''
      const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
      const defaultDescription = style.headingColor === style.buttonBg
        ? `${capitalizeFirst(style.background)} background with ${style.headingColor.toLowerCase()} headings and buttons`
        : `${capitalizeFirst(style.background)} background with ${style.headingColor.toLowerCase()} headings and ${style.buttonBg.toLowerCase()} buttons`
      css += `/* Style ${styleNum} */\n`
      css += `.style-selector ${className} .info::after{content:'${descriptionPrefix}${style.description || defaultDescription}';}\n`
      css += `#layout ${className} .header{padding-bottom:${titlePaddingBottom || "14"}px;}\n`
      css += `${className} {background-color:${bgColor};color:${textColor};font-family: ${bodyFontVal}; font-size:${bodySizeVal};line-height:${bodyLineHeightVal}; font-weight: ${bodyWeightVal};}\n`
      css += `${className} .main{color:${textColor};font-size:${bodySizeVal};line-height:${bodyLineHeightVal}; font-family: ${bodyFontVal}; }\n`
      css += `${className}, ${className} .add-to-calendar-container td:first-child, ${className} .main, ${className} .sd-list-date, ${className} .sd-list-description, ${className} .calendar-body table td, ${className} .calendar-body table th, ${className} .figcaption, ${className} .intro,  ${className} label, ${className} td {color:${textColor}; font-family: ${bodyFontVal}; }\n`
      css += `${className} .header1, ${className} .header2, ${className} .header3, ${className} .header4{color: ${headingColor};}\n`
      css += `${className} td.share-article {padding-top: 0px !Important;}\n`
      css += `${className} .figcaption {color: ${textColor};}\n`
      css += `${className} .header1{font-family: ${h1FontVal}; font-size:${h1SizeVal};line-height:${h1LineHeightVal}; font-weight: ${h1WeightVal};}\n`
      css += `${className} .header2{font-family: ${h2FontVal};font-size:${h2SizeVal};line-height:${h2LineHeightVal}; font-weight: ${h2WeightVal};}\n`
      css += `${className} .header3{font-family: ${h3FontVal}; font-size:${h3SizeVal};line-height:${h3LineHeightVal}; font-weight: ${h3WeightVal};}\n`
      css += `${className} .header4{font-family: ${h4FontVal}; font-size:${h4SizeVal};line-height:${h4LineHeightVal}; font-weight: ${h4WeightVal};}\n`
      css += `${className} .figcaption a, ${className} a, ${READMORE_BTN}{color:${linkColor};text-decoration:underline;${linkWeightDecl}}\n`
      css += `${className} .figcaption a:hover, ${className} a:hover, ${READMORE_BTN}:hover {text-decoration:none;}\n`
      css += `${className} .single-link a {font-family: ${bodyFontVal}; text-decoration: underline; color: ${linkColor};${linkWeightDecl ? ` ${linkWeightDecl}` : ""}}\n`
      css += `${className} .single-link a:visited {text-decoration: underline; color: ${linkColor} !important;${linkWeightDecl ? ` ${linkWeightDecl}` : ""}}\n`
      css += `${className} .btn-cm, ${className} button.btn-cm{background-color:${btnBg}; text-decoration:none;color:${btnText}; font-family: ${btnFont}; font-size:${btnSize};line-height:${btnLineHeight}; font-weight: ${btnWeight}; border: ${btnBorderWidth}px solid ${btnBorderColor};}\n`
      css += `${className} .btn-cm:hover, ${className} .btn-cm:focus, ${className} button.btn-cm:hover, ${className} button.btn-cm:focus {background-color:${btnBgHover} !important; text-decoration:none;color:${btnTextHover} !important; border-color: ${btnBorderColorHover} !important;}\n`
      
      // Add no padding CSS if noPadding is enabled
      if (style.noPadding) {
        css += `#layout ${className}.block[data-sd-content=article]:not([data-image-position]) .block-body>tbody>tr>td, #layout ${className}.block[data-sd-content=article][data-image-position=bottom] .block-body>tbody>tr:not(.media-container)>td, #layout ${className}.block[data-sd-content=article][data-image-position=top] .block-body>tbody>tr:not(.media-container)>td, #layout ${className}.block[data-sd-content=article][data-image-position=left], #layout ${className}.block[data-sd-content=article][data-image-position=right],#layout ${className}.block[data-sd-content="sd-feedback"]{padding:0px}\n`
        css += `#layout ${className}.block[data-sd-content=article]:not([data-image-position]) .block-body>tbody>tr>.header, #layout ${className}.block[data-sd-content=article][data-image-position=bottom] .block-body>tbody>tr:not(.media-container)>.header, #layout ${className}.block[data-sd-content=article][data-image-position=top] .block-body>tbody>tr:not(.media-container)>.header {padding-bottom: ${titlePaddingBottom || "14"}px;}\n`
        css += `#layout ${className}.block[data-sd-content=map] td.gm-text-wrapper, #layout ${className}.block[data-sd-content=poll], #layout ${className}.block[data-sd-content=links], #layout ${className}.block[data-sd-content=rsvp], #layout ${className}.block[data-sd-content=calendar], #layout ${className}.block[data-sd-content=share], #layout ${className}.block[data-sd-content=list], #layout ${className}.block[data-sd-content=subscription] {padding: 0px;}\n`
        css += `#layout ${className}.block[data-sd-content="links"] .block-body .header-container .header {padding: 0px; padding-bottom: 0px;}\n`
        css += `#middle_0_wide ${className}.block[data-sd-content="subscription"], #middle_0_wide ${className}.block[data-sd-content="sd-total-summary"], #middle_0_wide ${className}.block[data-sd-content="event-reg-action"], #middle_0_wide ${className}.block[data-sd-content="sd-session-selector"] {padding: 0px;}\n`
        css += `#layout ${className}.block .read-more {padding-top: 15px !Important;}\n`
        css += `${className} td.share-article {padding-top: ${paddingValue}px !Important;}\n`
      }
      
      css += `\n`
    })

    // Add strong tag rule if any font weight is 300 or lower
    const getWeightValue = (weight: any) => {
      const val = weight || "400"
      return parseInt(val.toString().replace(/\D/g, '') || "400")
    }
    
    const h1WeightNum = getWeightValue(h1Weight)
    const h2WeightNum = getWeightValue(h2Weight)
    const h3WeightNum = getWeightValue(h3Weight)
    const h4WeightNum = getWeightValue(h4Weight)
    const linkWeightNum = getWeightValue(linkWeight)
    const bodyWeightNum = getWeightValue(bodyWeight)
    
    if (h1WeightNum <= 300 || h2WeightNum <= 300 || h3WeightNum <= 300 || h4WeightNum <= 300 || linkWeightNum <= 300 || bodyWeightNum <= 300) {
      css += `strong {font-weight: bold !important;}\n`
    }

    // Add feedback-td-1 rule with title padding
    const feedbackPadding = titlePaddingBottom || "15"
    css += `.feedback-td-1 {padding-top: ${feedbackPadding}px;}\n`

    return css
  }



  const generateHighContrastCombinations = () => {
    if (colors.length < 2) {
      alert("Please add at least 2 colours to generate combinations")
      return
    }

    const combinations: StyleDefinition[] = []
    const minTextContrastHigh = 4.5 // WCAG AA standard
    const minButtonContrastHigh = 3 // Lower threshold for button text

    // Generate combinations systematically
    colors.forEach((bgColor) => {
      colors.forEach((textColor) => {
        if (bgColor.id === textColor.id) return
        const textContrast = getContrastRatio(bgColor.hex, textColor.hex)
        if (textContrast < minTextContrastHigh) return

        colors.forEach((headingColor) => {
          if (bgColor.id === headingColor.id) return
          const headingContrast = getContrastRatio(bgColor.hex, headingColor.hex)
          if (headingContrast < minTextContrastHigh) return

          colors.forEach((linkColor) => {
            if (bgColor.id === linkColor.id) return
            const linkContrast = getContrastRatio(bgColor.hex, linkColor.hex)
            if (linkContrast < minTextContrastHigh) return

            colors.forEach((btnBg) => {
              if (btnBg.id === bgColor.id) return
              colors.forEach((btnText) => {
                if (btnBg.id === btnText.id) return
                const btnContrast = getContrastRatio(btnBg.hex, btnText.hex)
                if (btnContrast < minButtonContrastHigh) return

                // Create combination
                const combo: StyleDefinition = {
                  id: `combo-${Date.now()}-${Math.random()}`,
                  name: `Combination ${combinations.length + 1}`,
                  description: headingColor.name === btnBg.name 
                    ? `${bgColor.name} background with ${headingColor.name} headings and buttons`
                    : `${bgColor.name} background with ${headingColor.name} headings and ${btnBg.name} buttons`,
                  background: bgColor.name,
                  textColor: textColor.name,
                  headingColor: headingColor.name,
                  buttonBg: btnBg.name,
                  buttonText: btnText.name,
                  linkColor: linkColor.name,
                  h1Font: h1Font,
                  h2Font: h2Font,
                  h3Font: h3Font,
                  h4Font: h4Font,
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
                  iconStyle: "ios-outline",
                  iconColor: "#000000",
                }
                
                combinations.push(combo)
              })
            })
          })
        })
      })
    })

    const minTextContrast = 3
    const minButtonContrast = 2

    // Pre-calculate valid colors for each background once
    const validColorCache: Record<string, Record<string, ColorDefinition[]>> = {}
    
    colors.forEach(bgColor => {
      validColorCache[bgColor.id] = {
        text: colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast),
        button: colors.filter(c => c.id !== bgColor.id),
      }
    })

    // Generate combinations using all backgrounds
    colors.forEach((bgColor) => {
      // Generate up to 2 variations per background color
      for (let variation = 0; variation < 2; variation++) {
        if (combinations.length >= 15) return

        const validText = validColorCache[bgColor.id].text
        const validBtn = validColorCache[bgColor.id].button

        if (validText.length === 0 || validBtn.length === 0) return

        // Pick diverse colors from valid options
        const textColor = validText[Math.floor(Math.random() * validText.length)]
        const headingColor = validText[Math.floor(Math.random() * validText.length)]
        const linkColor = validText[Math.floor(Math.random() * validText.length)]
        
        const btnBg = validBtn[Math.floor(Math.random() * validBtn.length)]
        const btnTextOptions = colors.filter(c => c.id !== btnBg.id && getContrastRatio(btnBg.hex, c.hex) >= minButtonContrast)
      
        if (btnTextOptions.length === 0) return
        const btnText = btnTextOptions[Math.floor(Math.random() * btnTextOptions.length)]

        const combo: StyleDefinition = {
          id: `combo-${Date.now()}-${Math.random()}`,
          name: `Combination ${combinations.length + 1}`,
          description: headingColor.name === btnBg.name 
            ? `${bgColor.name} background with ${headingColor.name} headings and buttons`
            : `${bgColor.name} background with ${headingColor.name} headings and ${btnBg.name} buttons`,
          background: bgColor.name,
          textColor: textColor.name,
          headingColor: headingColor.name,
          buttonBg: btnBg.name,
          buttonText: btnText.name,
          linkColor: linkColor.name,
          h1Font: h1Font,
          h2Font: h2Font,
          h3Font: h3Font,
          h4Font: h4Font,
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
          iconStyle: "ios-outline",
          iconColor: "#000000",
        }
        
        // Calculate WCAG level for this combination
        combo.wcagLevel = calculateWCAGLevel(combo)
        
        combinations.push(combo)
      }
    })

    setGeneratedCombinations(combinations)
    setShowCombinationGenerator(true)
  }

  const interleaveByBackground = (combinations: StyleDefinition[]) => {
    const grouped: Record<string, StyleDefinition[]> = {}

    combinations.forEach((combo) => {
      if (!grouped[combo.background]) {
        grouped[combo.background] = []
      }
      grouped[combo.background].push(combo)
    })

    Object.values(grouped).forEach((group) => {
      group.sort(() => Math.random() - 0.5)
    })

    const ordered: StyleDefinition[] = []
    let hasRemaining = true

    while (hasRemaining) {
      hasRemaining = false
      const keys = Object.keys(grouped).sort(() => Math.random() - 0.5)

      keys.forEach((key) => {
        const next = grouped[key].pop()
        if (next) {
          ordered.push(next)
          hasRemaining = true
        }
      })
    }

    return ordered
  }

  const generateMoreCombinations = () => {
    const allCombos = (window as any).allWCAGCombinations || []
    if (allCombos.length === 0) {
      if (wcagFilter === 'AA') {
        generateCombinationsForWCAG('AA')
      } else if (wcagFilter === 'AAA') {
        generateCombinationsForWCAG('AAA')
      } else {
        generateCombinationsForAll()
      }
      return
    }

    let offset = (window as any).wcagCombinationOffset || 0
    const nextBatch = allCombos.slice(offset, offset + 15)
    
    // If we've reached the end, reshuffle and start over
    if (nextBatch.length === 0) {
      const reshuffled = interleaveByBackground([...allCombos])
      ;(window as any).allWCAGCombinations = reshuffled
      ;(window as any).wcagCombinationOffset = 15
      setGeneratedCombinations(reshuffled.slice(0, 15))
    } else {
      // Keep paging fixed-size: show one batch (15) at a time.
      setGeneratedCombinations(nextBatch)
      ;(window as any).wcagCombinationOffset = offset + 15
    }
  }

  const generateCombinationsForAll = () => {
    if (colors.length < 2) {
      alert("Please add at least 2 colours to generate combinations")
      return
    }

    const allCombinations: StyleDefinition[] = []
    const minTextContrast = 3
    const minButtonContrast = 2

    colors.forEach((bgColor) => {
      const validTextColors = colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast)
      if (validTextColors.length === 0) return

      validTextColors.forEach((textColor) => {
        const validHeadingColors = colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast)
        const validLinkColors = colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast)

        colors.forEach((btnBg) => {
          if (btnBg.id === bgColor.id) return
          const validBtnTexts = colors.filter(c => c.id !== btnBg.id && getContrastRatio(btnBg.hex, c.hex) >= minButtonContrast)
          if (validBtnTexts.length === 0) return

          validBtnTexts.forEach((btnText) => {
            const headingColor = validHeadingColors[0]
            const linkColor = validLinkColors[0]

            if (!headingColor || !linkColor) return

            const combo: StyleDefinition = {
              id: `combo-${Date.now()}-${Math.random()}`,
              name: `Combination`,
              description: (headingColor.name === btnBg.name
                ? `${bgColor.name.toLowerCase()} background with ${headingColor.name.toLowerCase()} headings and buttons`
                : `${bgColor.name.toLowerCase()} background with ${headingColor.name.toLowerCase()} headings and ${btnBg.name.toLowerCase()} buttons`
              ).replace(/^./, ch => ch.toUpperCase()),
              background: bgColor.name,
              textColor: textColor.name,
              headingColor: headingColor.name,
              buttonBg: btnBg.name,
              buttonText: btnText.name,
              buttonBgHover: btnBg.name,
              buttonTextHover: btnText.name,
              linkColor: linkColor.name,
              h1Font: h1Font,
              h2Font: h2Font,
              h3Font: h3Font,
              h4Font: h4Font,
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
              iconColor: textColor.hex,
            }

            combo.wcagLevel = calculateWCAGLevel(combo)
            allCombinations.push(combo)
          })
        })
      })
    })

    // All tab should also be shuffled and mixed by background.
    const shuffled = interleaveByBackground(allCombinations)
    ;(window as any).allWCAGCombinations = shuffled
    ;(window as any).wcagCombinationOffset = 15
    setGeneratedCombinations(shuffled.slice(0, 15))
  }

  const generateCombinationsForWCAG = (targetLevel: 'AA' | 'AAA') => {
    if (colors.length < 2) {
      alert("Please add at least 2 colours to generate combinations")
      return
    }

    const allCombinations: StyleDefinition[] = []
    const minTextContrast = targetLevel === 'AAA' ? 7 : 4.5
    const minButtonContrast = targetLevel === 'AAA' ? 4.5 : 3
    const minButtonSurfaceContrast = 3

    // Generate exhaustively: all backgrounds × valid text colors × valid button combos
    colors.forEach((bgColor) => {
      const validTextColors = colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast)
      
      if (validTextColors.length === 0) return

      validTextColors.forEach((textColor) => {
        const validHeadingColors = colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast)
        const validLinkColors = colors.filter(c => c.id !== bgColor.id && getContrastRatio(bgColor.hex, c.hex) >= minTextContrast)
        
        colors.forEach((btnBg) => {
          if (btnBg.id === bgColor.id) return
          if (getContrastRatio(bgColor.hex, btnBg.hex) < minButtonSurfaceContrast) return
          const validBtnTexts = colors.filter(c => c.id !== btnBg.id && getContrastRatio(btnBg.hex, c.hex) >= minButtonContrast)
          
          if (validBtnTexts.length === 0) return

          validBtnTexts.forEach((btnText) => {
            const headingColor = validHeadingColors[0]
            const linkColor = validLinkColors[0]
            
            if (!headingColor || !linkColor) return

            const combo: StyleDefinition = {
              id: `combo-${Date.now()}-${Math.random()}`,
              name: `Combination`,
              description: (headingColor.name === btnBg.name
                ? `${bgColor.name.toLowerCase()} background with ${headingColor.name.toLowerCase()} headings and buttons`
                : `${bgColor.name.toLowerCase()} background with ${headingColor.name.toLowerCase()} headings and ${btnBg.name.toLowerCase()} buttons`
              ).replace(/^./, ch => ch.toUpperCase()),
              background: bgColor.name,
              textColor: textColor.name,
              headingColor: headingColor.name,
              buttonBg: btnBg.name,
              buttonText: btnText.name,
              buttonBgHover: btnBg.name,
              buttonTextHover: btnText.name,
              linkColor: linkColor.name,
              h1Font: h1Font,
              h2Font: h2Font,
              h3Font: h3Font,
              h4Font: h4Font,
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
              // Keep icon contrast aligned with readable body text to avoid excluding dark backgrounds.
              iconColor: textColor.hex,
            }
            
            combo.wcagLevel = calculateWCAGLevel(combo)
            
            const meetsTargetLevel = targetLevel === 'AA'
              ? combo.wcagLevel === 'AA' || combo.wcagLevel === 'AAA'
              : combo.wcagLevel === 'AAA'

            if (meetsTargetLevel) {
              allCombinations.push(combo)
            }
          })
        })
      })
    })

    // Mix by background first so batches do not cluster on one background color.
    const shuffled = interleaveByBackground(allCombinations)
    
    // Store all combinations and reset offset
    ;(window as any).allWCAGCombinations = shuffled
    ;(window as any).wcagCombinationOffset = 0
    
    // Show first 15
    setGeneratedCombinations(shuffled.slice(0, 15))
    ;(window as any).wcagCombinationOffset = 15
  }

  const addCombinationToStyles = (combination: StyleDefinition) => {
    const styleNumber = styles.length + 1
    setStyles([
      ...styles,
      {
        ...combination,
        id: Date.now().toString(),
        name: `Style ${styleNumber}`,
      },
    ])
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generateCSS())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyHtmlToClipboard = async () => {
    const htmlContent = `<div class="read-more-button">
    <div><!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                     href="http://" style="height:46px;v-text-anchor:middle;width:180px;" arcsize="20%"
                    stroke="#f" fillcolor="#64ccc9">
            <w:anchorlock></w:anchorlock>
            <center style="color:#212529;font-family:Arial,sans-serif;font-size:16px;">
                Read more
            </center>
        </v:roundrect>
        <![endif]-->
        <a class="btn-cm" href="http://">
            Read more
        </a>
    </div>
</div>

<div class="grid-templates">
        <div class="template grid grid-1 allow-top allow-bottom allow-move allow-delete">
            <table cellspacing="0" cellpadding="0" border="0" align="center">
                <tbody>
                <tr>
                    <td class="mobileBlock" valign="top" align="left">
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                    <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="contenttable mso-full-width skip-mso" style="width: 100%;" width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 1-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                    <td class="mobileBlock" valign="top" align="left"> 
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="template grid grid-2 allow-top allow-bottom allow-move allow-delete">
            <table cellspacing="0" cellpadding="0" border="0" align="center">
                <tbody>
                <tr>
                    <td class="mobileBlock" valign="top" align="left">
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">  
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="template grid grid-3 allow-top allow-bottom allow-move allow-delete">
            <table cellspacing="0" cellpadding="0" border="0" align="center">
                <tbody>
                <tr>
                    <td class="mobileBlock" valign="top" align="left">
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>


                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="template grid grid-4 allow-top allow-bottom allow-move allow-delete">
            <table cellspacing="0" cellpadding="0" border="0" align="center">
                <tbody>
                <tr>
                    <td class="mobileBlock" valign="top" align="left">
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock mccontentBlock" valign="top" align="left">
                        <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                      </td>
                      <td class="mobileBlock" valign="top" align="left">
                        <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>

<div class="icon-templates">
${styles.map((style, index) => `    <div class="text-style-${index + 1}"><br>
        <a title="Facebook" class="sd-facebook" style="text-decoration: none;" href="{!FACEBOOK_SHARE_DOC!}">
            <img alt="Facebook" src="[UPDATE_WITH_YOUR_FACEBOOK_ICON_URL]" width="18">
        </a>
        <a title="X" class="sd-twitter" style="text-decoration: none;" href="{!TWITTER_SHARE_DOC!}">
            <img alt="X" src="[UPDATE_WITH_YOUR_X_ICON_URL]" width="18">
        </a>
        <a title="LinkedIn" class="sd-linkedin" style="text-decoration: none;" href="{!LINKEDIN_SHARE_DOC!}">
            <img alt="LinkedIn" src="[UPDATE_WITH_YOUR_LINKEDIN_ICON_URL]" width="18">
        </a>
        <a title="Print" class="sd-print" style="text-decoration: none;" href="{!PRINT_SHARE_DOC!}">
            <img alt="Print" src="[UPDATE_WITH_YOUR_PRINT_ICON_URL]" width="18">
        </a>
        <a title="Send as Email" class="sd-email" style="text-decoration: none;" href="{!FORWARD_SHARE_DOC!}">
            <img alt="Email" src="[UPDATE_WITH_YOUR_EMAIL_ICON_URL]" width="18">
        </a>
    </div>`).join("\n")}
</div>`
    await navigator.clipboard.writeText(htmlContent)
    setCopiedHtml(true)
    setTimeout(() => setCopiedHtml(false), 2000)
  }

  const copyMediaToClipboard = async () => {
    const breakpoint = themeType === 'events' ? '1023px' : '650px'
    const mediaQuery = getMediaQuery(breakpoint)
    await navigator.clipboard.writeText(mediaQuery)
    setCopiedMedia(true)
    setTimeout(() => setCopiedMedia(false), 2000)
  }

  const copyExportCss = async () => {
    const css = generateCSS()
    const validation = validateCSS(css)
    setCssValidationResult(validation)

    // Always copy, regardless of validation status
    await navigator.clipboard.writeText(css)
    setCopiedCss(true)

    if (!validation.isValid) {
      toast({
        title: "CSS Copied (with errors)",
        description: `${validation.errors.length} error(s) found. Review in Dev Info modal.`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "CSS Copied",
        description: "Valid CSS copied to clipboard!",
      })
    }

    setTimeout(() => setCopiedCss(false), 2000)
  }

  const getMediaQuery = (breakpoint: string = '650px') => {
    const breakpointValue = breakpoint.replace('px', '')
    const gutterSize = themePadding || '10px'
    
    // Build mobile padding selectors for styles with noPadding && showPaddingOnMobile
    let mobilePaddingRules = ''
    const mobileSelectors: string[] = []
    styles.forEach((style, index) => {
      if (style.noPadding && style.showPaddingOnMobile) {
        mobileSelectors.push(`#layout td.block.text-style-${index + 1}`)
      }
    })
    if (mobileSelectors.length > 0) {
      const themePaddingVal = themePadding || '25px'
      mobilePaddingRules = `${mobileSelectors.join(',')} {padding-left: ${themePaddingVal} !important; padding-right: ${themePaddingVal} !important;}`
    }
    
    return `@media screen and (max-width:${breakpointValue}px){.mobileBlock{display:block!important}.sd-mobile-hidden{display:none!important;mso-hide:all!important;width:0!important;min-width:0!important;max-width:0!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;visibility:hidden!important}#layout .block[data-sd-content=image] img{width:100%!important;max-width:100%!important;min-width:100%!important}.figure img,.sd-mobile-img-figure img{width:100%!important;height:auto!important;max-width:100%!important}.sd-img-responsive{width:100%!important;height:auto!important}.mobile-break{word-break:break-all!important}#layout .btn-poll,#layout .grid>table,#layout .section,.sd-mobile-full-width,.section>tbody>tr>td>.grid>table,table.guttertable,table.margintable,table.mso-full-width.contenttable{width:100%!important}#layout .block[data-sd-content=article] .figure img:not([data-full-width=false]),#layout .block[data-sd-content=image] img:not([data-full-width=false]),#layout .block[data-sd-content=map] img,#layout .block[data-sd-content=video-email] img:not([data-full-width=false]):not(.btn-play){width:100%!important;height:auto!important;max-width:100%!important}#layout .btn-cm,#layout .btn-poll{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%!important;}#layout .btn-width-auto{width:auto!important}.sd-mobile-quicklinks,.sd-mobile-quicklinks *{display:none!important;mso-hide:all!important;width:0!important;min-width:0!important;max-width:0!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;visibility:hidden!important}#layout,#layout .block>table,#layout .grid,#layout .grid>table>tbody>tr>td>table.contenttable,#layout .section>tbody>tr>td>table,#layout .section>tbody>tr>td>table>tbody>tr>td>table,#layout .section>tbody>tr>td>table>tbody>tr>td>table>tbody>tr>td>table{height:auto!important;width:100%!important}.clearHeight,.grid>table>tbody>tr>td>table.contenttable>tbody>tr>td{height:auto!important}.guttertable{height:${gutterSize}!important;width:${gutterSize}!important}.sd-mobile-quicklinks .guttertable,.sd-mobile-quicklinks .margintable{height:0!important}.margintable{display:none!important;mso-hide:all!important;width:0!important;min-width:0!important;max-width:0!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;visibility:hidden!important}.block[data-sd-content=links]{display:block!important;}.intro-article{padding-left:30px!important;padding-right:30px!important;box-sizing:border-box!important}.sd-padding-0{padding:0!important}.sd-padding-top-0{padding-top:0!important}.sd-padding-right-0{padding-right:0!important}.sd-padding-bottom-0{padding-bottom:0!important}.sd-padding-left-0{padding-left:0!important}.sd-padding-top-15{padding-top:15px!important}.sd-padding-right-15{padding-right:15px!important}.sd-padding-bottom-15{padding-bottom:15px!important}.sd-padding-top-10{padding-top:10px!important}.sd-padding-bottom-10{padding-bottom:10px!important}.sd-padding-left-15{padding-left:15px!important}.sd-padding-right-10{padding-right:10px!important}.sd-padding-left-10{padding-left:10px!important}.sd-padding-15{padding:15px!important}.sd-padding-top-20{padding-top:20px!important}.sd-padding-right-20{padding-right:20px!important}.sd-padding-bottom-20{padding-bottom:20px!important}.sd-padding-left-20{padding-left:20px!important}.sd-padding-top-25{padding-top:25px!important}.sd-padding-20{padding:20px!important}.sd-padding-left-40{padding-left:40px!important}.sd-padding-right-40{padding-right:40px!important}#header_wide,#middle_0_wide{width:100%!important;margin:0 auto!important}#footer_wide{width:100%;margin:0 auto!important}.text-left,.textLeft{text-align:left!important}.block[data-sd-content=article][data-image-position=left] .figcaption{border-right:0!important}.block[data-sd-content=article][data-image-position=right] .figcaption{border-left:0!important}.textCenter{text-align:center!important}.figure iframe{width:100%}#layout .block[data-sd-content=video-email] .figure img{height:50px!important;width:auto!important}td.figure.sd-mobile-img-figure.sd-image-figure-right{padding-left:0 !important;}td.figure.sd-mobile-img-figure.sd-image-figure-left{padding-right:0 !important;}.stack{display:block!important;width:100%!important;text-align:center!important;}.textCenter .link-button-wrapper div{text-align:center!important;}.footerLinks a{display:block!important;margin-bottom:0.5rem;}.footerLinks a:last-child{margin-bottom:0!important;}.br-0{border-radius:0px!important;}.sd-padding-bottom-30{padding-bottom:30px!important}${mobilePaddingRules}}*[x-apple-data-detectors],.x-gmail-data-detectors,.x-gmail-data-detectors *,.aBn{border-bottom:0!important;cursor:default!important;color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important}`
  }

  const getGridTemplates = () => {
    if (themeType === 'events') {
      // Events Desk / Landing Page Theme - Simplified grid templates
      return `<div class="template grid grid-1 allow-top allow-bottom allow-move allow-delete">
            <table align="center" border="0" cellpadding="0" cellspacing="0">
                <tbody>
                <tr>
                    <td>
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="contenttable mso-full-width" style="width: 100%;" align="left" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 1-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="template grid grid-2 allow-top allow-bottom allow-move allow-delete">
            <table align="center" border="0" cellpadding="0" cellspacing="0">
                <tbody>
                <tr>
                    <td align="left" valign="top">
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="guttertable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="template grid grid-3 allow-top allow-bottom allow-move allow-delete">
            <table align="center" border="0" cellpadding="0" cellspacing="0">
                <tbody>
                <tr>
                    <td align="left" valign="top">
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="guttertable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="guttertable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="template grid grid-4 allow-top allow-bottom allow-move allow-delete">
            <table align="center" border="0" cellpadding="0" cellspacing="0">
                <tbody>
                <tr>
                    <td align="left" valign="top">
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="guttertable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="guttertable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="guttertable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td><!-- Gutter --></td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="mso-full-width contenttable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td class="block" draggable="false" data-sd-content="none" valign="top">
                                    <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <table class="margintable" align="left" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                            <tr>
                                <td>
                                    <!-- Margin -->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>`
    } else {
      // Composer Theme - Keep current structure (this will be called from copyExportHtml)
      return null
    }
  }

  const getComposerGridTemplates = () => {
    return `<div class="template grid grid-1 allow-top allow-bottom allow-move allow-delete">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
            <tbody>
            <tr>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="contenttable mso-full-width skip-mso" style="width: 100%;" width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 1-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            </tbody>
        </table>
    </div>

    <div class="template grid grid-2 allow-top allow-bottom allow-move allow-delete">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
            <tbody>
            <tr>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Gutter --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            </tbody>
        </table>
    </div>

    <div class="template grid grid-3 allow-top allow-bottom allow-move allow-delete">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
            <tbody>
            <tr>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Gutter --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Gutter --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            </tbody>
        </table>
    </div>

    <div class="template grid grid-4 allow-top allow-bottom allow-move allow-delete">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
            <tbody>
            <tr>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Gutter --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Gutter --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="guttertable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Gutter --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock mccontentBlock" valign="top" align="left">
                    <table class="mso-full-width contenttable skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td class="block" draggable="false" data-sd-content="none" valign="top">
                                <!-- Blank 4-column grid --><span class="glyphicon glyphicon-arrow-down"></span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
                <td class="mobileBlock" valign="top" align="left">
                    <table class="margintable sd-mobile-full-width skip-mso" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tbody>
                        <tr>
                            <td><!-- Margin --></td>
                        </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            </tbody>
        </table>
    </div>`
  }

  const copyExportHtml = async () => {
    // Built in lib/icon-templates.ts, which is covered by a test asserting the
    // merge-tag braces are emitted literally.
    const iconTemplates = buildIconTemplates(styles, {
      iconStyle: globalIconStyle,
      iconSize: globalIconSize,
    })

    // Determine which grid templates to use based on theme type
    const gridTemplatesContent = themeType === 'events' ? getGridTemplates() : getComposerGridTemplates()

    const htmlContent = `<div class="read-more-button">
    <div><!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                     href="http://" style="height:46px;v-text-anchor:middle;width:180px;" arcsize="20%"
                    stroke="#f" fillcolor="#64ccc9">
            <w:anchorlock></w:anchorlock>
            <center style="color:#212529;font-family:Arial,sans-serif;font-size:16px;">
                Read more
            </center>
        </v:roundrect>
        <![endif]-->
        <a class="btn-cm" href="http://">
            Read more
        </a>
    </div>
</div>

<div class="grid-templates">
${gridTemplatesContent}
</div>


<div class="icon-templates">
${iconTemplates}</div>`
    await navigator.clipboard.writeText(htmlContent)
    setCopiedHtml(true)
    setTimeout(() => setCopiedHtml(false), 2000)
  }

  const copyExportMediaQuery = async () => {
    const breakpoint = themeType === 'events' ? '1023px' : '650px'
    const mediaQuery = getMediaQuery(breakpoint)
    await navigator.clipboard.writeText(mediaQuery)
    setCopiedMedia(true)
    setTimeout(() => setCopiedMedia(false), 2000)
  }

  const copyImportToClipboard = async () => {
    await navigator.clipboard.writeText(webfontImports)
    setCopiedImport(true)
    setTimeout(() => setCopiedImport(false), 2000)
  }

  const refreshCSS = () => {
    setCssRefreshKey(prev => prev + 1)
  }

  const handleSaveThemeFromHeader = async () => {
    if (!validateBeforeSave()) return
    try {
      setIsSaving(true)
      // Simulate a slight delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Save theme
      saveToLocalStorage("savedTheme", {
        colors,
        styles,
        h1Font,
        h2Font,
        h3Font,
        h4Font,
        bodyFont,
        buttonFont,
        themePadding,
        h1Size,
        h1LineHeight,
        h1Weight,
        h2Size,
        h2LineHeight,
        h2Weight,
        h3Size,
        h3LineHeight,
        h3Weight,
        h4Size,
        h4LineHeight,
        h4Weight,
        bodySize,
        bodyLineHeight,
        bodyWeight,
        buttonSize,
        buttonLineHeight,
        buttonWeight,
        buttonPaddingTop,
        buttonPaddingRight,
        buttonPaddingBottom,
        buttonPaddingLeft,
        buttonBorderRadius,
        titlePaddingBottom,
        googleFontImport,
        customImport,
        webfontImports,
        globalIconStyle,
        globalIconSize,
      })
      setHasUnsavedChanges(false)
      localStorage.setItem("lastSavedTime", new Date().toISOString())
      setSavedTimeAgo("Saved just now")
      setShowSuccessModal(true)
      toast({
        title: "Success",
        description: "Your theme has been saved successfully.",
      })
    } catch (error) {
      console.error('Error saving theme:', error)
      toast({
        title: "Error",
        description: "Failed to save theme. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetAllSettings = () => {
    if (
      confirm(
        "Are you sure you want to reset all settings? This will clear your colour palette, fonts, typography settings, and styles. This action cannot be undone.",
      )
    ) {
      // Clear localStorage
      localStorage.removeItem("themeColors")
      localStorage.removeItem("h1Font")
      localStorage.removeItem("h2Font")
      localStorage.removeItem("h3Font")
      localStorage.removeItem("h4Font")
      localStorage.removeItem("bodyFont")
      localStorage.removeItem("buttonFont")
      localStorage.removeItem("h1Size")
      localStorage.removeItem("h1LineHeight")
      localStorage.removeItem("h1Weight")
      localStorage.removeItem("h2Size")
      localStorage.removeItem("h2LineHeight")
      localStorage.removeItem("h2Weight")
      localStorage.removeItem("h3Size")
      localStorage.removeItem("h3LineHeight")
      localStorage.removeItem("h3Weight")
      localStorage.removeItem("h4Size")
      localStorage.removeItem("h4LineHeight")
      localStorage.removeItem("h4Weight")
      localStorage.removeItem("bodySize")
      localStorage.removeItem("bodyLineHeight")
      localStorage.removeItem("bodyWeight")
      localStorage.removeItem("buttonSize")
      localStorage.removeItem("buttonLineHeight")
      localStorage.removeItem("buttonWeight")
      localStorage.removeItem("themeStyles")

      setColors([
        { id: "1", name: "White", hex: "#FFFFFF" },
        { id: "2", name: "Black", hex: "#000000" },
      ])
      setH1Font("")
      setH2Font("")
      setH3Font("")
      setH4Font("")
      setBodyFont("")
      setButtonFont("")
      setH1Size("")
      setH1LineHeight("")
      setH1Weight("400")
      setH2Size("")
      setH2LineHeight("")
      setH2Weight("400")
      setH3Size("")
      setH3LineHeight("")
      setH3Weight("400")
      setH4Size("")
      setH4LineHeight("")
      setH4Weight("400")
      setBodySize("")
      setBodyLineHeight("")
      setBodyWeight("400")
      setButtonSize("")
      setButtonLineHeight("")
      setButtonWeight("400")
      setStyles([])
    }
  }

  // Show password form if not authenticated (client-side only)
  if (isClient && !isAuthenticated) {
    return (
      <PasswordModal
        passwordInput={passwordInput}
        passwordError={passwordError}
        onPasswordChange={setPasswordInput}
        onErrorClear={() => setPasswordError("")}
        onSubmit={handlePasswordSubmit}
      />
    )
  }

  return (
    <>
      {/* Header Bar - Full Width */}
      <AppHeader 
        onSaveTheme={handleSaveThemeFromHeader} 
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onDevInfo={() => setShowDevInfo(true)}
      />
          <div className="min-h-screen pt-4 md:pt-8 pl-4 md:pl-8 pr-4 md:pr-8" style={{ backgroundColor: '#F6F8FB' }}>
            {webfontImports && (
              <style dangerouslySetInnerHTML={{ __html: webfontImports }} />
            )}
            
            {/* Theme Context Panel - Full Width */}
            <div className="mb-8 -mx-4 md:-mx-8 px-4 md:px-8">
              <ThemeContextPanel
                themeName={themeName}
                onThemeNameChange={setThemeName}
                savedTimeAgo={savedTimeAgo}
                isDirty={hasUnsavedChanges}
                themeType={themeType}
              />
            </div>
            
            <div className="flex gap-6">
              {/* Left Column - Controls */}
              <div className="flex-1 flex flex-col">

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => {
                    // Validate colors on step 1 before navigation away
                    if (currentStep === 1 && step > currentStep) {
                      if (!validateColorsForStep()) {
                        return
                      }
                    }
                    // Same guard as the Next button, so jumping ahead from step 3
                    // cannot bypass the typography check.
                    if (currentStep === 3 && step > currentStep) {
                      if (!validateTypographyForNext()) {
                        return
                      }
                    }
                        setCurrentStep(step)
                  }}
                  disabled={currentStep === 1 && !!colorNameError && step > currentStep}
                  className={`w-10 h-10 rounded-full font-semibold flex items-center justify-center transition-all ${
                    step === currentStep
                      ? "text-white shadow-lg"
                      : step < currentStep
                      ? "text-white cursor-pointer"
                      : currentStep === 1 && !!colorNameError && step > currentStep
                      ? "bg-slate-200 text-slate-600 cursor-not-allowed opacity-50"
                      : "bg-slate-200 text-slate-600 cursor-pointer hover:bg-slate-300"
                  }`}
                  style={{
                    backgroundColor: step === currentStep ? "#ec2176" : step < currentStep ? "#21cdec" : undefined
                  }}
                >
                  {step < currentStep ? "✓" : step}
                </button>
                <span className="text-xs mt-2 text-center font-medium text-slate-600">
                  {step === 1 && "Colours"}
                  {step === 2 && "Theme"}
                  {step === 3 && "Typography"}
                  {step === 4 && "Styles"}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-slate-200 rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(currentStep - 1) * (100 / 3)}%`, backgroundColor: "#ec2176" }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-6">
            
            {/* STEP 1: COLOURS */}
            {currentStep === 1 && (
              <>
                <h2 className="text-2xl font-bold mb-4">Set up your colour palette</h2>
                <p className="text-slate-600 mb-4">Create your colour palette for consistent branding across your themes. Paste multiple colours at once or add them one by one.</p>
          {/* Colours section - full width */}
          <Card className="shadow-sm !py-0">
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-lg">Colours</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Paste colours</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Paste one colour per line or separate multiple colours with commas.</p>
                        <p className="mt-2">Supported formats: #HEX Colour name or Colour name #HEX.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  placeholder={`One colour per line or separate multiple colours with commas.
Examples:
#FFFFFF White
#000000 Black
White #FFFFFF, Black #000000`}
                  value={bulkColorText}
                  onChange={(e) => {
                    setBulkColorText(e.target.value)
                    setColorImportError("")
                  }}
                  className="min-h-[100px] text-sm font-mono"
                  style={{ backgroundColor: '#FFFFFF', borderColor: '#E6EDF3' }}
                />
                <ValidationMessage message={colorImportError} />
                <Button onClick={importColorsFromText} disabled={!bulkColorText.trim()} variant="outline" className="w-full bg-slate-50 hover:bg-slate-100 border-slate-200">
                  <Upload className="h-4 w-4 mr-2" />
                  Import colours
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {colors.map((color) => (
                  <div key={color.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white group flex flex-col">
                    {/* Color swatch - dominant visual element */}
                    <div
                      className="w-full cursor-pointer relative transition-all duration-150 ease-out rounded-t-xl"
                      style={{ backgroundColor: color.hex, height: 'calc(var(--spacing) * 8)' }}
                      onClick={() => {
                        // Trigger color picker
                        const colorInput = document.querySelector(`input[data-color-id="${color.id}"]`) as HTMLInputElement
                        if (colorInput) colorInput.click()
                      }}
                    >
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => updateColor(color.id, "hex", e.target.value)}
                        className="absolute inset-0 w-0 h-0 opacity-0"
                        data-color-id={color.id}
                      />
                      {/* Delete button in top right */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeColor(color.id)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-150"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </Button>
                    </div>
                    {/* Color info below */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <Input
                        placeholder="Colour name"
                        value={color.name}
                        onChange={(e) => updateColor(color.id, "name", e.target.value)}
                        className="h-8 text-xs transition-all duration-150"
                      />
                      <Input
                        placeholder="#000000"
                        value={color.hex}
                        onChange={(e) => updateColor(color.id, "hex", e.target.value)}
                        // Blocked at the keystroke so the caret does not jump;
                        // updateColor also strips whitespace, which covers paste.
                        onKeyDown={(e) => {
                          if (e.key === " ") e.preventDefault()
                        }}
                        // Supply the "#" the user left off, once they are done typing.
                        onBlur={(e) => updateColor(color.id, "hex", normaliseHexOnBlur(e.target.value))}
                        className="h-8 text-xs font-mono transition-all duration-150"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <ValidationMessage message={colorNameError} />
              <Button onClick={addColor} variant="outline" className="mt-4 bg-slate-50 hover:bg-slate-100 border-slate-200 w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add colour
              </Button>
            </CardContent>
          </Card>
              </>
            )}

          {/* STEP 3: TYPOGRAPHY */}
            {currentStep === 3 && (
              <>
                <h2 className="text-2xl font-bold mb-4">Configure your typography</h2>
                <p className="text-slate-600 mb-4">Configure fonts, font sizes and line heights for headings, body text and buttons.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Typography Controls (scrollable) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Heading typography */}
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Heading typography</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                {/* Heading 1 */}
                <div>
                  <Label>Heading 1 font</Label>
                  <FontField
                    className="mt-1 mb-3"
                    value={h1Font || "Arial, sans-serif"}
                    fallback="Arial, sans-serif"
                    onValueChange={(next) => {
                      const value = next
                      setH1Font(value)
                      updateAllStylesFonts("h1", value)
                    }}
                    placeholder="e.g., 'Hubot Sans', sans-serif"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h1Size || "22px").replace("px", "")}
                        fallback="22"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH1Size(value)
                          updateAllStylesH1Size(value)
                        }}
                        placeholder="22"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Line height <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h1LineHeight || "30px").replace("px", "")}
                        fallback="30"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH1LineHeight(value)
                          updateAllStylesH1LineHeight(value)
                        }}
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <Select value={h1Weight} onValueChange={(value) => {
                        setH1Weight(value)
                        updateAllStylesH1Weight(value)
                      }}>
                        <SelectTrigger className="mt-1.5 h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Heading 2 */}
                <div>
                  <Label>Heading 2 font</Label>
                  <FontField
                    className="mt-1 mb-3"
                    value={h2Font || "Arial, sans-serif"}
                    fallback="Arial, sans-serif"
                    onValueChange={(next) => {
                      const value = next
                      setH2Font(value)
                      updateAllStylesFonts("h2", value)
                    }}
                    placeholder="e.g., 'Hubot Sans', sans-serif"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h2Size || "20px").replace("px", "")}
                        fallback="20"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH2Size(value)
                          updateAllStylesH2Size(value)
                        }}
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Line height <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h2LineHeight || "28px").replace("px", "")}
                        fallback="28"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH2LineHeight(value)
                          updateAllStylesH2LineHeight(value)
                        }}
                        placeholder="28"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <Select value={h2Weight} onValueChange={(value) => {
                        setH2Weight(value)
                        updateAllStylesH2Weight(value)
                      }}>
                        <SelectTrigger className="mt-1.5 h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Heading 3 */}
                <div>
                  <Label>Heading 3 font</Label>
                  <FontField
                    className="mt-1 mb-3"
                    value={h3Font || "Arial, sans-serif"}
                    fallback="Arial, sans-serif"
                    onValueChange={(next) => {
                      const value = next
                      setH3Font(value)
                      updateAllStylesFonts("h3", value)
                    }}
                    placeholder="e.g., 'Hubot Sans', sans-serif"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h3Size || "18px").replace("px", "")}
                        fallback="18"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH3Size(value)
                          updateAllStylesH3Size(value)
                        }}
                        placeholder="18"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Line height <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h3LineHeight || "26px").replace("px", "")}
                        fallback="26"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH3LineHeight(value)
                          updateAllStylesH3LineHeight(value)
                        }}
                        placeholder="26"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <Select value={h3Weight} onValueChange={(value) => {
                        setH3Weight(value)
                        updateAllStylesH3Weight(value)
                      }}>
                        <SelectTrigger className="mt-1.5 h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Heading 4 */}
                <div>
                  <Label>Heading 4 font</Label>
                  <FontField
                    className="mt-1 mb-3"
                    value={h4Font || "Arial, sans-serif"}
                    fallback="Arial, sans-serif"
                    onValueChange={(next) => {
                      const value = next
                      setH4Font(value)
                      updateAllStylesFonts("h4", value)
                    }}
                    placeholder="e.g., 'Hubot Sans', sans-serif"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h4Size || "16px").replace("px", "")}
                        fallback="16"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH4Size(value)
                          updateAllStylesH4Size(value)
                        }}
                        placeholder="16"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Line height <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(h4LineHeight || "22px").replace("px", "")}
                        fallback="22"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setH4LineHeight(value)
                          updateAllStylesH4LineHeight(value)
                        }}
                        placeholder="22"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <Select value={h4Weight} onValueChange={(value) => {
                        setH4Weight(value)
                        updateAllStylesH4Weight(value)
                      }}>
                        <SelectTrigger className="mt-1.5 h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body typography */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Body typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Body font</Label>
                  <FontField
                    className="mt-1"
                    value={bodyFont || "Arial, sans-serif"}
                    fallback="Arial, sans-serif"
                    onValueChange={(next) => {
                      const value = next
                      setBodyFont(value)
                      updateAllStylesFonts("body", value)
                    }}
                    placeholder="e.g., 'Roboto', sans-serif;"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Body copy</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(bodySize || "15px").replace("px", "")}
                        fallback="15"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setBodySize(value)
                          updateAllStylesBodySize(value)
                        }}
                        placeholder="16"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Line height <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(bodyLineHeight || "22px").replace("px", "")}
                        fallback="22"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setBodyLineHeight(value)
                          updateAllStylesBodyLineHeight(value)
                        }}
                        placeholder="22"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <Select value={bodyWeight} onValueChange={(value) => {
                        setBodyWeight(value)
                        updateAllStylesBodyWeight(value)
                      }}>
                        <SelectTrigger className="mt-1.5 h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Button typography */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Button typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Button font</Label>
                  <FontField
                    className="mt-1"
                    value={buttonFont || "Arial, sans-serif"}
                    fallback="Arial, sans-serif"
                    onValueChange={(next) => {
                      const value = next
                      setButtonFont(value)
                      updateAllStylesFonts("button", value)
                    }}
                    placeholder="e.g., 'Inter', sans-serif;"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Button</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(buttonSize || "15px").replace("px", "")}
                        fallback="15"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setButtonSize(value)
                          updateAllStylesButtonSize(value)
                        }}
                        placeholder="15"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Line height <span className="text-xs text-gray-400">px</span></Label>
                      <NumberField
                        className="mt-1.5 w-full"
                        value={(buttonLineHeight || "22px").replace("px", "")}
                        fallback="22"
                        onValueChange={(next) => {
                          const value = `${next}px`
                          setButtonLineHeight(value)
                          updateAllStylesButtonLineHeight(value)
                        }}
                        placeholder="22"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <Select value={buttonWeight || "400"} onValueChange={(value) => {
                        setButtonWeight(value)
                        updateAllStylesButtonWeight(value)
                      }}>
                        <SelectTrigger className="mt-1.5 h-9 w-full">
                          <SelectValue placeholder="Select weight" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Links typography */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Links typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Weight</Label>
                  <Select value={linkWeight || "400"} onValueChange={(value) => {
                    setLinkWeight(value)
                    updateAllStylesLinkWeight(value)
                  }}>
                    <SelectTrigger className="mt-1.5 h-9 w-full">
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

                    {/* Webfont imports */}
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Webfont @import</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <Textarea
                            value={webfontImports}
                            onChange={(e) => setWebfontImports(e.target.value)}
                            placeholder="Paste @import links from Google Fonts here (e.g., @import url('https://fonts.googleapis.com/...');)"
                            className="font-mono text-sm min-h-[120px] pr-10"
                            style={{ backgroundColor: '#FFFFFF', borderColor: '#E6EDF3' }}
                          />
                          {webfontImports && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 h-8 w-8 p-0"
                              onClick={() => {
                                navigator.clipboard.writeText(webfontImports)
                                toast({
                                  description: "Webfont imports copied to clipboard",
                                })
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>


                  </div>

                  {/* Right Column: Font Preview (sticky) */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-32 z-10">
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                          <label className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2 block">Preview</label>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                <div>
                  <div 
                    style={{
                      fontFamily: cleanFontValue(h1Font) || "Arial, sans-serif",
                      fontSize: `${h1Size || '22px'}`,
                      lineHeight: `${h1LineHeight || '30px'}`,
                      fontWeight: h1Weight || '700',
                    }}
                    className="text-slate-900 font-bold"
                  >
                    Heading 1
                  </div>
                </div>
                <div>
                  <div 
                    style={{
                      fontFamily: cleanFontValue(h2Font) || "Arial, sans-serif",
                      fontSize: `${h2Size || '20px'}`,
                      lineHeight: `${h2LineHeight || '28px'}`,
                      fontWeight: h2Weight || '700',
                    }}
                    className="text-slate-900 font-bold"
                  >
                    Heading 2
                  </div>
                </div>
                <div>
                  <div 
                    style={{
                      fontFamily: cleanFontValue(h3Font) || "Arial, sans-serif",
                      fontSize: `${h3Size || '18px'}`,
                      lineHeight: `${h3LineHeight || '26px'}`,
                      fontWeight: h3Weight || '700',
                    }}
                    className="text-slate-900 font-bold"
                  >
                    Heading 3
                  </div>
                </div>
                <div>
                  <div 
                    style={{
                      fontFamily: cleanFontValue(h4Font) || "Arial, sans-serif",
                      fontSize: `${h4Size || '16px'}`,
                      lineHeight: `${h4LineHeight || '24px'}`,
                      fontWeight: h4Weight || '700',
                    }}
                    className="text-slate-900 font-bold"
                  >
                    Heading 4
                  </div>
                </div>
                <div>
                  <div 
                    style={{
                      fontFamily: cleanFontValue(bodyFont) || "Arial, sans-serif",
                      fontSize: `${bodySize || '15px'}`,
                      lineHeight: `${bodyLineHeight || '22px'}`,
                      fontWeight: bodyWeight || '400',
                    }}
                    className="text-slate-900 leading-relaxed"
                  >
                    Body copy sample text
                  </div>
                </div>
                <div>
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    style={{
                      fontFamily: cleanFontValue(bodyFont) || "Arial, sans-serif",
                      fontSize: `${bodySize || '15px'}`,
                      fontWeight: linkWeight || '400',
                      color: '#0066cc',
                      textDecoration: 'underline',
                    }}
                  >
                    Sample link
                  </a>
                </div>
                <button
                  className="w-full bg-slate-900 text-white transition-colors hover:bg-slate-800"
                  style={{
                    fontFamily: cleanFontValue(buttonFont) || "Arial, sans-serif",
                    fontSize: `${buttonSize || '15px'}`,
                    lineHeight: `${buttonLineHeight || '22px'}`,
                    fontWeight: buttonWeight || '600',
                    padding: `${buttonPaddingTop || "10"}px ${buttonPaddingRight || "20"}px ${buttonPaddingBottom || "10"}px ${buttonPaddingLeft || "20"}px`,
                    borderRadius: buttonBorderRadius || "4px",
                  }}
                >
                  Button
                </button>
              </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

              </>
            )}

        {/* STEP 2: THEME */}
            {currentStep === 2 && (
              <>
                <h2 className="text-2xl font-bold mb-4">Configure your theme</h2>
                <p className="text-slate-600 mb-6">Configure spacing, icons, and button styles for your theme.</p>

                {/* Theme Type Selector */}
                <Card className="shadow-sm mb-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Theme type</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm text-xs">
                            Choose where your theme will be used - Email Composer or Events Desk and Landing Pages. It will automatically adapt for email or web.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-row gap-3">
                      <RadioGroup value={themeType} onValueChange={setThemeType}>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="composer" id="composer-theme" className="w-5 h-5 border-2 border-slate-300" />
                            <label htmlFor="composer-theme" className="text-sm font-medium cursor-pointer">Email Composer</label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="events" id="events-theme" className="w-5 h-5 border-2 border-slate-300" />
                            <label htmlFor="events-theme" className="text-sm font-medium cursor-pointer">Landing Pages and Events Desk</label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Theme padding */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Theme padding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Padding <span className="text-xs text-gray-400">px</span></Label>
                <NumberField
                  className="mt-2"
                  value={(themePadding || "25px").replace("px", "")}
                  fallback="25"
                  onValueChange={(next) => {
                    const value = `${next}px`
                    setThemePadding(value)
                    setCssRefreshKey(prev => prev + 1)
                  }}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground mt-2">Controls the spacing around content, images and sections throughout your theme.</p>
              </div>
              <div>
                <Label>Title padding <span className="text-xs text-gray-400">px</span></Label>
                <NumberField
                  className="mt-2"
                  value={titlePaddingBottom || "14"}
                  fallback="14"
                  onValueChange={(next) => {
                    setTitlePaddingBottom(next)
                    setCssRefreshKey(prev => prev + 1)
                  }}
                  placeholder="14"
                />
                <p className="text-xs text-muted-foreground mt-2">Controls the spacing below headings within content blocks.</p>
              </div>
            </CardContent>
          </Card>

          {/* Icons section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Icons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Icon style</Label>
                  <p className="text-xs text-slate-500 mt-1 mb-2">Choose an icon style for sharing buttons.</p>
                  <Select
                    value={globalIconStyle || "material-sharp"}
                    onValueChange={(value) => setGlobalIconStyle(value)}
                  >
                    <SelectTrigger className="mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material-rounded">Material Rounded</SelectItem>
                      <SelectItem value="material-outlined">Material Outlined</SelectItem>
                      <SelectItem value="material-sharp">Material Sharp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Icon size <span className="text-xs text-gray-400">px</span></Label>
                  <NumberField
                    className="mt-2 w-full"
                    value={globalIconSize || "18"}
                    fallback="18"
                    onValueChange={(next) => setGlobalIconSize(next)}
                    placeholder="18"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2 block">Preview</Label>
                  <div className="flex gap-3 p-6 bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                    {[
                      { id: 'facebook', name: 'Facebook' },
                      { id: 'x', name: 'X' },
                      { id: 'linkedin', name: 'LinkedIn' },
                      { id: 'print', name: 'Print' },
                      { id: 'new-post', name: 'Email' },
                    ].map((icon) => {
                      const iconStyleMap: Record<string, string> = {
                        'material-rounded': 'material-rounded',
                        'material-outlined': 'material-outlined',
                        'material-sharp': 'material-sharp',
                      }
                      // For X icon only, swap the rounded/sharp styles due to icons8 naming
                      const xIconStyleMap: Record<string, string> = {
                        'material-rounded': 'material-sharp',
                        'material-outlined': 'material-outlined',
                        'material-sharp': 'material-rounded',
                      }
                      const mappedStyle = (icon.id === 'x' ? xIconStyleMap : iconStyleMap)[globalIconStyle || 'material-sharp']
                      const iconSize = globalIconSize || "18"
                      
                      return (
                        <img
                          key={icon.id}
                          src={`https://img.icons8.com/${mappedStyle}/96/000000/${icon.id === 'x' ? 'twitterx--v1' : icon.id}.png`}
                          alt={icon.name}
                          width={iconSize}
                          height={iconSize}
                          title={icon.name}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Button settings */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Button settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Button padding</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Top <span className="text-xs text-gray-400">px</span></Label>
                    <NumberField
                      className="mt-1"
                      value={buttonPaddingTop || "10"}
                      fallback="10"
                      onValueChange={(next) => {
                        setButtonPaddingTop(next)
                        setCssRefreshKey(prev => prev + 1)
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Right <span className="text-xs text-gray-400">px</span></Label>
                    <NumberField
                      className="mt-1"
                      value={buttonPaddingRight || "20"}
                      fallback="20"
                      onValueChange={(next) => {
                        setButtonPaddingRight(next)
                        setCssRefreshKey(prev => prev + 1)
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bottom <span className="text-xs text-gray-400">px</span></Label>
                    <NumberField
                      className="mt-1"
                      value={buttonPaddingBottom || "10"}
                      fallback="10"
                      onValueChange={(next) => {
                        setButtonPaddingBottom(next)
                        setCssRefreshKey(prev => prev + 1)
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Left <span className="text-xs text-gray-400">px</span></Label>
                    <NumberField
                      className="mt-1"
                      value={buttonPaddingLeft || "20"}
                      fallback="20"
                      onValueChange={(next) => {
                        setButtonPaddingLeft(next)
                        setCssRefreshKey(prev => prev + 1)
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Button border radius <span className="text-xs text-gray-400">px</span></Label>
                <div className="mt-2">
                  <NumberField
                    value={(buttonBorderRadius || "4px").replace("px", "")}
                    fallback="4"
                    onValueChange={(next) => {
                      const value = `${next}px`
                      setButtonBorderRadius(value)
                      setCssRefreshKey(prev => prev + 1)
                    }}
                    placeholder="4"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2 block">Preview</Label>
                <div className="bg-slate-100 p-6 rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                  <button
                    className="font-medium text-white bg-black hover:bg-slate-800"
                    style={{
                      padding: `${buttonPaddingTop || "10"}px ${buttonPaddingRight || "20"}px ${buttonPaddingBottom || "10"}px ${buttonPaddingLeft || "20"}px`,
                      borderRadius: buttonBorderRadius || "4px",
                    }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

              </>
            )}

        {/* STEP 4: STYLES */}
            {currentStep === 4 && (
              <>
                <h2 className="text-2xl font-bold mb-4">Create your style combinations</h2>
                <p className="text-slate-600 mb-4">Generate colour combinations and manage your theme styles.</p>

        <Card className="mb-6 pt-0 pb-0">
          <div className="border-b">
            <button
              onClick={() => {
                if (!showCombinationGenerator) {
                  if (wcagFilter === 'AA') {
                    generateCombinationsForWCAG('AA')
                  } else if (wcagFilter === 'AAA') {
                    generateCombinationsForWCAG('AAA')
                  } else {
                    generateCombinationsForAll()
                  }
                }
                setShowCombinationGenerator(!showCombinationGenerator)
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: "#ec2176" }} />
                <span className="font-semibold text-slate-900">Generate colour combinations</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm text-xs">
                      Automatically creates colour combination suggestions. Click the + icon to add any combination as a new style to your theme.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {showCombinationGenerator ? (
                <ChevronUp className="h-5 w-5 text-slate-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>

          {showCombinationGenerator && (
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-600">Filter by:</p>
                  <div className="flex gap-2">
                    {(['all', 'AA', 'AAA'] as const).map((level) => (
                      <div key={level}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  setWcagFilter(level)
                                  if (level === 'AA') {
                                    generateCombinationsForWCAG('AA')
                                  } else if (level === 'AAA') {
                                    generateCombinationsForWCAG('AAA')
                                  } else {
                                    generateCombinationsForAll()
                                  }
                                }}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                  wcagFilter === level
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {level === 'all' ? 'All' : `WCAG ${level}`}
                              </button>
                            </TooltipTrigger>
                            {level === 'all' && (
                              <TooltipContent side="top" className="text-xs">
                                All combinations (including non-WCAG compliant)
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    generateMoreCombinations()
                  }} 
                  size="sm" 
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate More
                </Button>
              </div>

              {generatedCombinations.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No combinations found. Try adding more colours to your palette.
                </p>
              ) : (
                <>
                  {/* Generated Combinations */}
                  {generatedCombinations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-slate-700">Generated Combinations</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {generatedCombinations
                          .filter((combo) => {
                            if (wcagFilter === 'all') return true
                            if (wcagFilter === 'AA') {
                              return combo.wcagLevel === 'AA' || combo.wcagLevel === 'AAA'
                            }
                            return combo.wcagLevel === 'AAA'
                          })
                          .map((combo, index) => (
                          <div
                            key={combo.id}
                            className="relative text-left p-3 border rounded-lg group cursor-pointer transition-all"
                            style={{
                              backgroundColor: getColorHexValue(combo.background),
                            }}
                          >
                            <div
                              className="text-sm font-semibold mb-1 pointer-events-none"
                              style={{
                                color: getColorHexValue(combo.headingColor),
                                fontFamily: cleanFontValue(combo.h1Font),
                              }}
                            >
                              Sample heading
                            </div>
                            <div
                              className="text-xs mb-2 pointer-events-none"
                              style={{
                                color: getColorHexValue(combo.textColor),
                                fontFamily: cleanFontValue(combo.bodyFont),
                              }}
                            >
                              Body text with <span style={{ color: getColorHexValue(combo.linkColor) }}>link</span>
                            </div>
                            <div
                              className="text-xs px-2 py-1 rounded inline-block pointer-events-none"
                              style={{
                                backgroundColor: getColorHexValue(combo.buttonBg),
                                color: getColorHexValue(combo.buttonText),
                                fontFamily: cleanFontValue(combo.buttonFont),
                                fontSize: combo.buttonSize,
                                lineHeight: combo.buttonLineHeight,
                                fontWeight: combo.buttonWeight,
                              }}
                            >
                              Button
                            </div>
                            
                            {/* Hover overlay with action buttons */}
                            <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => addCombinationToStyles(combo)}
                                className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-slate-100 transition-colors"
                                title="Add to theme styles"
                              >
                                <Plus className="h-4 w-4 text-slate-900" />
                              </button>
                              <button
                                onClick={() => setGeneratedCombinations(generatedCombinations.filter((c) => c.id !== combo.id))}
                                className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-slate-100 transition-colors"
                                title="Delete from generated"
                              >
                                <X className="h-4 w-4 text-slate-900" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        <div className="w-full">
          {/* Theme styles column */}
          <Card>
            <CardHeader>
              <CardTitle>Theme styles</CardTitle>
              <CardDescription className="pb-4">Customise your theme styles, reorder, copy, or delete styles as needed for consistent branding across your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {styles.map((style, index) => {
                const bgColor = getColorHexValue(style.background)
                const headingColor = getColorHexValue(style.headingColor)
                const textColor = getColorHexValue(style.textColor)
                const linkColor = getColorHexValue(style.linkColor)
                const buttonBg = getColorHexValue(style.buttonBg)
                const buttonText = getColorHexValue(style.buttonText)

                return (
                  <div key={style.id} id={`style-${style.id}`} className="p-4 border rounded-lg bg-slate-50">
                    <div className="grid lg:grid-cols-5 gap-4">
                      {/* Left Column: Tools */}
                      <div className="space-y-3 lg:col-span-3">
                        {/* Title and Controls */}
                        <div className="flex items-center gap-2 w-full">
                          <h3 className="font-semibold text-lg truncate min-w-0 flex-shrink">Style {index + 1}</h3>
                          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveStyle(style.id, "up")}
                              disabled={index === 0}
                              title="Move up theme style"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveStyle(style.id, "down")}
                              disabled={index === styles.length - 1}
                              title="Move down theme style"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => removeStyle(style.id)} title="Delete theme style">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateStyle(style.id)}
                              title="Copy theme style"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-600">Description</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-sm text-xs">
                                  Automatically updates based on your colour selections. You can edit this text if needed.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Textarea
                            value={style.description}
                            onChange={(e) => updateStyle(style.id, "description", e.target.value)}
                            placeholder="Style description"
                            className="mt-1.5 min-h-[60px] bg-white"
                          />
                        </div>

                        {/* Color Selectors - 4 Column Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Row 1 */}
                          <div>
                            <div className="flex items-center gap-1">
                              <PaintBucket className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Background</Label>
                            </div>
                            <Select
                              value={style.background}
                              onValueChange={(value) => updateStyleWithSmartDescription(style.id, "background", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.background) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.background)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.background}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Type className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Heading colour</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-sm text-xs">
                                    Colour applied to all headings (H1-H4).
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              value={style.headingColor}
                              onValueChange={(value) =>
                                updateStyleWithSmartDescription(style.id, "headingColor", value)
                              }
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.headingColor) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.headingColor)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.headingColor}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Type className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Text colour</Label>
                            </div>
                            <Select
                              value={style.textColor}
                              onValueChange={(value) => updateStyleWithSmartDescription(style.id, "textColor", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.textColor) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.textColor)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.textColor}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Link className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Link colour</Label>
                            </div>
                            <Select
                              value={style.linkColor}
                              onValueChange={(value) => updateStyleWithSmartDescription(style.id, "linkColor", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.linkColor) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.linkColor)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.linkColor}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Row 2 */}
                          <div>
                            <div className="flex items-center gap-1">
                              <PaintBucket className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Button background</Label>
                            </div>
                            <Select
                              value={style.buttonBg}
                              onValueChange={(value) => updateStyleWithSmartDescription(style.id, "buttonBg", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.buttonBg) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.buttonBg)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.buttonBg}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Type className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Button text colour</Label>
                            </div>
                            <Select
                              value={style.buttonText}
                              onValueChange={(value) => updateStyleWithSmartDescription(style.id, "buttonText", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.buttonText) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.buttonText)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.buttonText}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Square className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Button border width <span className="text-xs text-gray-400">px</span></Label>
                            </div>
                            <NumberField
                              className="mt-1.5 text-xs bg-white w-full"
                              value={getDisplayValue(style.buttonBorderWidth, "", "0")}
                              fallback={getDisplayValue(undefined, "", "0")}
                              onValueChange={(next) => updateStyle(style.id, "buttonBorderWidth", next)}
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Square className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Button border colour</Label>
                            </div>
                            <Select
                              value={style.buttonBorderColor || "none"}
                              onValueChange={(value) => {
                                updateStyle(style.id, "buttonBorderColor", value)
                              }}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <div className="flex items-center gap-2 max-w-[200px]">
                                  {style.buttonBorderColor && style.buttonBorderColor !== "none" ? (
                                    <>
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.buttonBorderColor)?.hex || "#000000" }}
                                      />
                                      <span className="truncate text-xs">
                                        {colors.find((c) => c.name === style.buttonBorderColor)?.name || style.buttonBorderColor}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="truncate text-xs text-slate-400">None</span>
                                  )}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-slate-400">None</span>
                                </SelectItem>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Row 3 */}
                          <div>
                            <div className="flex items-center gap-1">
                              <PaintBucket className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Button background hover</Label>
                            </div>
                            <Select
                              value={style.buttonBgHover}
                              onValueChange={(value) => updateStyle(style.id, "buttonBgHover", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.buttonBgHover) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.buttonBgHover)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.buttonBgHover}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Type className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Button text colour hover</Label>
                            </div>
                            <Select
                              value={style.buttonTextHover}
                              onValueChange={(value) => updateStyle(style.id, "buttonTextHover", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  {colors.find((c) => c.name === style.buttonTextHover) && (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div
                                        className="w-4 h-4 rounded border shrink-0"
                                        style={{ backgroundColor: colors.find((c) => c.name === style.buttonTextHover)?.hex }}
                                      />
                                      <span className="truncate text-xs">{style.buttonTextHover}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.name}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Smile className="h-3 w-3 text-slate-400" />
                              <Label className="text-xs text-slate-600">Icon colour</Label>
                            </div>
                            <Select
                              value={style.iconColor || "#000000"}
                              onValueChange={(value) => updateStyle(style.id, "iconColor", value)}
                            >
                              <SelectTrigger className="w-full mt-1.5 h-8 text-xs bg-white">
                                <SelectValue>
                                  <div className="flex items-center gap-2 max-w-[200px]">
                                    <div
                                      className="w-4 h-4 rounded border shrink-0"
                                      style={{ backgroundColor: style.iconColor || "#000000" }}
                                    />
                                    <span className="truncate text-xs">
                                      {colors.find((c) => c.hex === style.iconColor)?.name || "Black"}
                                    </span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {namedColors.map((color) => (
                                  <SelectItem key={color.id} value={color.hex}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Preview */}
                      <div className="min-w-0 lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold block">Preview</Label>
                          {(() => {
                            // Same evaluation the generator uses, so a combination
                            // it offers as AA/AAA cannot fail here (#78).
                            const contrastResults = evaluateStyleContrast(style)
                            const level = getComplianceLevel(contrastResults)
                            const typographyDependentFail = level === 'FAIL' && isTypographyDependentFail(contrastResults)
                            const badgeColor = typographyDependentFail
                              ? 'bg-yellow-50 text-yellow-700'
                              : level === 'AAA' || level === 'AA'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            const borderColor = typographyDependentFail
                              ? 'border-yellow-200'
                              : level === 'AAA' || level === 'AA'
                                ? 'border-green-200'
                                : 'border-red-200'
                            const badgeLabel = typographyDependentFail ? 'WCAG AA' : `WCAG ${level}`
                            const headingHint = getContrastHint(contrastResults.headingOnBg)
                            const bodyHint = getContrastHint(contrastResults.bodyTextOnBg)
                            const linkHint = getContrastHint(contrastResults.linkOnBg)
                            const buttonHint = getContrastHint(contrastResults.buttonTextOnButtonBg)
                            const isSuggestionPopoverOpen = activeContrastSuggestionStyleId === style.id && level === 'FAIL'
                            return (
                              <div className="flex items-center gap-1.5">
                              <TooltipProvider>
                                <Tooltip delayDuration={0} open={isSuggestionPopoverOpen ? false : undefined}>
                                  <TooltipTrigger asChild>
                                    <button 
                                      className={`px-2 py-1 rounded text-xs font-semibold ${badgeColor} border ${borderColor} cursor-help flex items-center gap-1.5 ${isSuggestionPopoverOpen ? 'pointer-events-none opacity-80' : ''}`}
                                    >
                                      {badgeLabel}
                                      {typographyDependentFail ? <AlertCircle size={14} /> : level === 'AAA' || level === 'AA' ? <Check size={14} /> : null}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" showArrow={false} className="bg-white text-slate-900 border border-slate-200 shadow-lg p-3 max-w-md">
                                    <div className="space-y-2 text-xs">
                                      {typographyDependentFail && (
                                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                          Some text fails only because current size/weight is treated as normal text.
                                        </p>
                                      )}
                                      <p className="font-semibold">Contrast Ratios:</p>
                                      <div className="space-y-1">
                                        <div className="flex justify-between gap-4 items-center">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-slate-400" style={{ backgroundColor: headingColor }}></div>
                                            <span>Heading</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono">{contrastResults.headingOnBg.ratio}:1</span>
                                            {contrastIcon(contrastResults.headingOnBg)}
                                          </div>
                                        </div>
                                        {headingHint && (
                                          <>
                                            <p className="text-[11px] text-red-700 ml-5">{headingHint}</p>
                                          </>
                                        )}
                                        <div className="flex justify-between gap-4 items-center">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-slate-400" style={{ backgroundColor: textColor }}></div>
                                            <span>Body text</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono">{contrastResults.bodyTextOnBg.ratio}:1</span>
                                            {contrastIcon(contrastResults.bodyTextOnBg)}
                                          </div>
                                        </div>
                                        {bodyHint && (
                                          <>
                                            <p className="text-[11px] text-red-700 ml-5">{bodyHint}</p>
                                          </>
                                        )}
                                        <div className="flex justify-between gap-4 items-center">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-slate-400" style={{ backgroundColor: linkColor }}></div>
                                            <span>Link</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono">{contrastResults.linkOnBg.ratio}:1</span>
                                            {contrastIcon(contrastResults.linkOnBg)}
                                          </div>
                                        </div>
                                        {linkHint && (
                                          <>
                                            <p className="text-[11px] text-red-700 ml-5">{linkHint}</p>
                                          </>
                                        )}
                                        <div className="flex justify-between gap-4 items-center">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-slate-400" style={{ backgroundColor: buttonText }}></div>
                                            <span>Button text</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono">{contrastResults.buttonTextOnButtonBg.ratio}:1</span>
                                            {contrastIcon(contrastResults.buttonTextOnButtonBg)}
                                          </div>
                                        </div>
                                        {buttonHint && (
                                          <>
                                            <p className="text-[11px] text-red-700 ml-5">{buttonHint}</p>
                                          </>
                                        )}
                                        <div className="flex justify-between gap-4 items-center">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-slate-400" style={{ backgroundColor: buttonBg }}></div>
                                            <span>Button surface</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono">{contrastResults.buttonBgOnBg.ratio}:1</span>
                                            {contrastIcon(contrastResults.buttonBgOnBg)}
                                          </div>
                                        </div>
                                        <div className="flex justify-between gap-4 items-center">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-slate-400" style={{ backgroundColor: style.iconColor || "#000000" }}></div>
                                            <span>Icon</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono">{contrastResults.iconOnBg.ratio}:1</span>
                                            {contrastIcon(contrastResults.iconOnBg)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-xs text-slate-600 pt-2 border-t">Normal text AA/AAA: 4.5:1 / 7:1 | Large text AA/AAA: 3:1 / 4.5:1 | Button surface: 3:1</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {level === 'FAIL' && (
                                <Popover
                                  open={activeContrastSuggestionStyleId === style.id}
                                  onOpenChange={(open) => {
                                    setActiveContrastSuggestionStyleId(open ? style.id : null)
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <button title="Suggest accessible colours" className="text-slate-400 hover:text-slate-600 flex items-center">
                                      <Sparkles className="h-3.5 w-3.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" align="end" className="w-72 p-3">
                                    <p className="font-semibold text-xs text-slate-700 mb-2">Contrast suggestions</p>
                                    <div className="space-y-3 text-xs">
                                      {!contrastResults.headingOnBg.aa && (() => {
                                        const alts = findAccessibleAlternatives(headingColor, bgColor, colors)
                                        return alts.length > 0 ? (
                                          <div>
                                            <p className="text-slate-500 mb-1 font-medium">Heading colour</p>
                                            <div className="space-y-0.5">
                                              {alts.map((alt) => (
                                                <button key={alt.id} onClick={() => updateStyleWithSmartDescription(style.id, "headingColor", alt.name)} className="flex items-center gap-2 w-full hover:bg-slate-100 p-1 rounded text-left">
                                                  <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ backgroundColor: alt.hex }} />
                                                  <span className="truncate">{alt.name}</span>
                                                  <span className="ml-auto font-mono text-slate-400 shrink-0">{alt.ratio}:1</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null
                                      })()}
                                      {!contrastResults.bodyTextOnBg.aa && (() => {
                                        const alts = findAccessibleAlternatives(textColor, bgColor, colors)
                                        return alts.length > 0 ? (
                                          <div>
                                            <p className="text-slate-500 mb-1 font-medium">Body text colour</p>
                                            <div className="space-y-0.5">
                                              {alts.map((alt) => (
                                                <button key={alt.id} onClick={() => updateStyleWithSmartDescription(style.id, "textColor", alt.name)} className="flex items-center gap-2 w-full hover:bg-slate-100 p-1 rounded text-left">
                                                  <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ backgroundColor: alt.hex }} />
                                                  <span className="truncate">{alt.name}</span>
                                                  <span className="ml-auto font-mono text-slate-400 shrink-0">{alt.ratio}:1</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null
                                      })()}
                                      {!contrastResults.linkOnBg.aa && (() => {
                                        const alts = findAccessibleAlternatives(linkColor, bgColor, colors)
                                        return alts.length > 0 ? (
                                          <div>
                                            <p className="text-slate-500 mb-1 font-medium">Link colour</p>
                                            <div className="space-y-0.5">
                                              {alts.map((alt) => (
                                                <button key={alt.id} onClick={() => updateStyleWithSmartDescription(style.id, "linkColor", alt.name)} className="flex items-center gap-2 w-full hover:bg-slate-100 p-1 rounded text-left">
                                                  <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ backgroundColor: alt.hex }} />
                                                  <span className="truncate">{alt.name}</span>
                                                  <span className="ml-auto font-mono text-slate-400 shrink-0">{alt.ratio}:1</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null
                                      })()}
                                      {!contrastResults.buttonTextOnButtonBg.aa && (() => {
                                        const alts = findAccessibleAlternatives(buttonText, buttonBg, colors)
                                        return alts.length > 0 ? (
                                          <div>
                                            <p className="text-slate-500 mb-1 font-medium">Button text colour</p>
                                            <div className="space-y-0.5">
                                              {alts.map((alt) => (
                                                <button key={alt.id} onClick={() => updateStyleWithSmartDescription(style.id, "buttonText", alt.name)} className="flex items-center gap-2 w-full hover:bg-slate-100 p-1 rounded text-left">
                                                  <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ backgroundColor: alt.hex }} />
                                                  <span className="truncate">{alt.name}</span>
                                                  <span className="ml-auto font-mono text-slate-400 shrink-0">{alt.ratio}:1</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null
                                      })()}
                                      {!contrastResults.buttonBgOnBg.aa && (() => {
                                        const alts = findAccessibleAlternatives(buttonBg, bgColor, colors, 3)
                                        return (
                                          <div>
                                            <p className="text-slate-500 mb-1 font-medium">Button background</p>
                                            {alts.length > 0 ? (
                                              <div className="space-y-0.5">
                                                {alts.map((alt) => (
                                                  <button key={alt.id} onClick={() => updateStyleWithSmartDescription(style.id, "buttonBg", alt.name)} className="flex items-center gap-2 w-full hover:bg-slate-100 p-1 rounded text-left">
                                                    <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ backgroundColor: alt.hex }} />
                                                    <span className="truncate">{alt.name}</span>
                                                    <span className="ml-auto font-mono text-slate-400 shrink-0">{alt.ratio}:1</span>
                                                  </button>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-[11px] text-red-700">No palette colour meets 3:1 against the current background.</p>
                                            )}
                                          </div>
                                        )
                                      })()}
                                      {!contrastResults.iconOnBg.aa && (() => {
                                        const alts = findAccessibleAlternatives(style.iconColor || "#000000", bgColor, colors)
                                        return alts.length > 0 ? (
                                          <div>
                                            <p className="text-slate-500 mb-1 font-medium">Icon colour</p>
                                            <div className="space-y-0.5">
                                              {alts.map((alt) => (
                                                <button key={alt.id} onClick={() => updateStyle(style.id, "iconColor", alt.hex)} className="flex items-center gap-2 w-full hover:bg-slate-100 p-1 rounded text-left">
                                                  <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ backgroundColor: alt.hex }} />
                                                  <span className="truncate">{alt.name}</span>
                                                  <span className="ml-auto font-mono text-slate-400 shrink-0">{alt.ratio}:1</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null
                                      })()}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                              </div>
                            )
                          })()}
                        </div>
                        <div className={`rounded-lg border ${style.noPadding ? '' : 'p-4'}`} style={{ backgroundColor: bgColor, color: textColor }}>
                          <div
                            style={{
                              color: headingColor,
                              fontFamily: cleanFontValue(style.h1Font || h1Font) || "Arial, sans-serif",
                              fontSize: `${style.h1Size || h1Size || '22px'}`,
                              lineHeight: `${style.h1LineHeight || h1LineHeight || '30px'}`,
                              fontWeight: style.h1Weight || h1Weight || '700',
                              paddingBottom: '14px',
                            }}
                          >
                            Style {index + 1} - Sample heading
                          </div>
                          {style.description && (
                            <p
                              style={{
                                fontFamily: cleanFontValue(style.bodyFont || bodyFont) || "Arial, sans-serif",
                                fontSize: `${style.bodySize || bodySize || '15px'}`,
                                lineHeight: `${style.bodyLineHeight || bodyLineHeight || '22px'}`,
                                fontWeight: style.bodyWeight || bodyWeight || '400',
                                margin: 0,
                              }}
                            >
                              {style.description}{" "}
                              <a href="#" style={{ color: linkColor, textDecoration: "underline", fontWeight: style.linkWeight || linkWeight || '400' }}>
                                body text with link
                              </a>
                            </p>
                          )}
                          <button
                            className="mt-3 rounded transition-colors"
                            style={{
                              backgroundColor: buttonBg,
                              color: buttonText,
                              fontFamily: cleanFontValue(style.buttonFont || buttonFont) || "Arial, sans-serif",
                              fontSize: `${style.buttonSize || buttonSize || '15px'}`,
                              lineHeight: `${style.buttonLineHeight || buttonLineHeight || '22px'}`,
                              fontWeight: style.buttonWeight || buttonWeight || '600',
                              borderRadius: style.buttonBorderRadius || buttonBorderRadius || '4px',
                              padding: `${toCssPx(style.buttonPaddingTop || buttonPaddingTop, "10")} ${toCssPx(style.buttonPaddingRight || buttonPaddingRight, "20")} ${toCssPx(style.buttonPaddingBottom || buttonPaddingBottom, "10")} ${toCssPx(style.buttonPaddingLeft || buttonPaddingLeft, "20")}`,
                              border: `${style.buttonBorderWidth || "0"}px solid ${getColorHexValue((style.buttonBorderColor && style.buttonBorderColor !== "none") ? style.buttonBorderColor : style.buttonBg) || buttonBg}`,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              if (style.buttonBgHover) {
                                const hoverBg = getColorHexValue(style.buttonBgHover)
                                if (hoverBg) e.currentTarget.style.backgroundColor = hoverBg
                              }
                              if (style.buttonTextHover) {
                                const hoverText = getColorHexValue(style.buttonTextHover)
                                if (hoverText) e.currentTarget.style.color = hoverText
                              }
                              if (style.buttonBorderColorHover) {
                                const hoverBorderColor = getColorHexValue(style.buttonBorderColorHover)
                                if (hoverBorderColor) e.currentTarget.style.borderColor = hoverBorderColor
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = buttonBg
                              e.currentTarget.style.color = buttonText
                              e.currentTarget.style.borderColor = getColorHexValue((style.buttonBorderColor && style.buttonBorderColor !== "none") ? style.buttonBorderColor : style.buttonBg) || buttonBg
                            }}
                          >
                            Sample Button
                          </button>
                          <div className="flex gap-1 pt-3">
                            {[
                              { id: 'facebook', name: 'Facebook' },
                              { id: 'x', name: 'X' },
                              { id: 'linkedin', name: 'LinkedIn' },
                              { id: 'print', name: 'Print' },
                              { id: 'new-post', name: 'Email' },
                            ].map((icon) => {
                              const iconStyleMap: Record<string, string> = {
                                'material-rounded': 'material-rounded',
                                'material-outlined': 'material-outlined',
                                'material-sharp': 'material-sharp',
                              }
                              // For X icon only, swap the rounded/sharp styles due to icons8 naming
                              const xIconStyleMap: Record<string, string> = {
                                'material-rounded': 'material-sharp',
                                'material-outlined': 'material-outlined',
                                'material-sharp': 'material-rounded',
                              }
                              const mappedStyle = (icon.id === 'x' ? xIconStyleMap : iconStyleMap)[globalIconStyle || 'material-sharp']
                              const iconColor = style.iconColor || '#000000'
                              const iconSize = globalIconSize || "18"
                              
                              return (
                                <img
                                  key={icon.id}
                                  src={`https://img.icons8.com/${mappedStyle}/96/${iconColor.replace('#', '')}/${icon.id === 'x' ? 'twitterx--v1' : icon.id}.png`}
                                  alt={icon.name}
                                  width={parseInt(iconSize)}
                                  height={parseInt(iconSize)}
                                  title={icon.name}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Style Padding Section */}
                    <div className="mt-4 pt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Maximize2 className="h-3 w-3 text-slate-400" />
                          <Label className="text-xs text-slate-600 font-semibold">Style padding</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`noPadding-${style.id}`}
                            checked={style.noPadding === true}
                            className="data-[state=unchecked]:bg-slate-300"
                            onCheckedChange={(checked) => {
                              const isChecking = checked as boolean
                              setStyles((prev) => prev.map((s) => {
                                if (s.id === style.id) {
                                  let newDescription = s.description
                                  
                                  if (isChecking) {
                                    if (!newDescription.startsWith("No padding - ")) {
                                      newDescription = `No padding - ${newDescription}`
                                    }
                                  } else {
                                    if (newDescription.startsWith("No padding - ")) {
                                      newDescription = newDescription.replace("No padding - ", "")
                                    }
                                  }
                                  
                                  return { ...s, noPadding: isChecking, description: newDescription }
                                }
                                return s
                              }))
                            }}
                          />
                          <Label htmlFor={`noPadding-${style.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                            No padding
                          </Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs text-xs">
                              Removes padding from all sides for this style
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Show padding on mobile - nested toggle */}
                        {style.noPadding && (
                          <>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`showPaddingOnMobile-${style.id}`}
                                checked={style.showPaddingOnMobile === true}
                                className="data-[state=unchecked]:bg-slate-300"
                                onCheckedChange={(checked) => {
                                  setStyles((prev) => prev.map((s) => {
                                    if (s.id === style.id) {
                                      return { ...s, showPaddingOnMobile: checked as boolean }
                                    }
                                    return s
                                  }))
                                }}
                              />
                              <Label htmlFor={`showPaddingOnMobile-${style.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                                Show padding on mobile
                              </Label>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs text-xs">
                                  Restores left and right padding to the style on mobile devices
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Typography Overrides Section */}
                    <div className="mt-4 border-t pt-4">
                      <div className="w-full flex items-center justify-between p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`typographyOverrides-${style.id}`}
                            checked={typographyOverridesOn(style)}
                            className="data-[state=unchecked]:bg-slate-300"
                            onCheckedChange={(checked) => setTypographyOverridesOn(style.id, checked)}
                          />
                          <Label
                            htmlFor={`typographyOverrides-${style.id}`}
                            className="text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            Typography overrides
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-sm text-xs">
                                Override global typography for just this style. Leave fields blank to use global settings. Useful when one style needs different heading sizes or fonts than others.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {typographyOverridesOn(style) && (
                          <button
                            type="button"
                            onClick={() => toggleTypographyCollapsed(style.id)}
                            aria-expanded={!typographyCollapsed(style.id)}
                            aria-controls={`typographyFields-${style.id}`}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                            title={typographyCollapsed(style.id) ? 'Show typography fields' : 'Hide typography fields'}
                          >
                            {typographyCollapsed(style.id) ? 'Show' : 'Hide'}
                            {typographyCollapsed(style.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {typographyOverridesOn(style) && !typographyCollapsed(style.id) && (
                        <div className="mt-4" id={`typographyFields-${style.id}`}>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Heading Typography Column */}
                            <div className="space-y-6">
                            {/* Heading 1 */}
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-600">Heading 1 font</Label>
                              </div>
                              <FontField
                                className="mt-1 mb-3 text-xs bg-white w-full"
                                value={getDisplayFont(style.h1Font, h1Font, "Arial, sans-serif")}
                                fallback={getDisplayFont(undefined, h1Font, "Arial, sans-serif")}
                                onValueChange={(next) => updateStyle(style.id, "h1Font", next)}
                                placeholder={getDisplayFont(undefined, h1Font, "Arial, sans-serif")}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs text-slate-600">Size <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h1Size, h1Size, "22")}
                                    fallback={getDisplayValue(undefined, h1Size, "22")}
                                    onValueChange={(next) => updateStyle(style.id, "h1Size", `${next}px`)}
                                    placeholder="22"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Line height <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h1LineHeight, h1LineHeight, "30")}
                                    fallback={getDisplayValue(undefined, h1LineHeight, "30")}
                                    onValueChange={(next) => updateStyle(style.id, "h1LineHeight", `${next}px`)}
                                    placeholder="30"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Weight</Label>
                                  <Select
                                    value={style.h1Weight || h1Weight || "700"}
                                    onValueChange={(value) => updateStyle(style.id, "h1Weight", value)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                      <SelectValue placeholder={getWeightLabel(style.h1Weight || h1Weight || "700")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Heading 2 */}
                            <div>
                              <Label className="text-xs text-slate-600">Heading 2 font</Label>
                              <FontField
                                className="mt-1 mb-3 text-xs bg-white w-full"
                                value={getDisplayFont(style.h2Font, h2Font, "Arial, sans-serif")}
                                fallback={getDisplayFont(undefined, h2Font, "Arial, sans-serif")}
                                onValueChange={(next) => updateStyle(style.id, "h2Font", next)}
                                placeholder={getDisplayFont(undefined, h2Font, "Arial, sans-serif")}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs text-slate-600">Size <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h2Size, h2Size, "20")}
                                    fallback={getDisplayValue(undefined, h2Size, "20")}
                                    onValueChange={(next) => updateStyle(style.id, "h2Size", `${next}px`)}
                                    placeholder="20"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Line height <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h2LineHeight, h2LineHeight, "28")}
                                    fallback={getDisplayValue(undefined, h2LineHeight, "28")}
                                    onValueChange={(next) => updateStyle(style.id, "h2LineHeight", `${next}px`)}
                                    placeholder="28"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Weight</Label>
                                  <Select
                                    value={style.h2Weight || h2Weight || "700"}
                                    onValueChange={(value) => updateStyle(style.id, "h2Weight", value)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                      <SelectValue placeholder={getWeightLabel(style.h2Weight || h2Weight || "700")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Heading 3 */}
                            <div>
                              <Label className="text-xs text-slate-600">Heading 3 font</Label>
                              <FontField
                                className="mt-1 mb-3 text-xs bg-white w-full"
                                value={getDisplayFont(style.h3Font, h3Font, "Arial, sans-serif")}
                                fallback={getDisplayFont(undefined, h3Font, "Arial, sans-serif")}
                                onValueChange={(next) => updateStyle(style.id, "h3Font", next)}
                                placeholder={getDisplayFont(undefined, h3Font, "Arial, sans-serif")}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs text-slate-600">Size <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h3Size, h3Size, "18")}
                                    fallback={getDisplayValue(undefined, h3Size, "18")}
                                    onValueChange={(next) => updateStyle(style.id, "h3Size", `${next}px`)}
                                    placeholder="18"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Line height <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h3LineHeight, h3LineHeight, "26")}
                                    fallback={getDisplayValue(undefined, h3LineHeight, "26")}
                                    onValueChange={(next) => updateStyle(style.id, "h3LineHeight", `${next}px`)}
                                    placeholder="26"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Weight</Label>
                                  <Select
                                    value={style.h3Weight || h3Weight || "700"}
                                    onValueChange={(value) => updateStyle(style.id, "h3Weight", value)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                      <SelectValue placeholder={getWeightLabel(style.h3Weight || h3Weight || "700")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Heading 4 */}
                            <div>
                              <Label className="text-xs text-slate-600">Heading 4 font</Label>
                              <FontField
                                className="mt-1 mb-3 text-xs bg-white w-full"
                                value={getDisplayFont(style.h4Font, h4Font, "Arial, sans-serif")}
                                fallback={getDisplayFont(undefined, h4Font, "Arial, sans-serif")}
                                onValueChange={(next) => updateStyle(style.id, "h4Font", next)}
                                placeholder={getDisplayFont(undefined, h4Font, "Arial, sans-serif")}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs text-slate-600">Size <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h4Size, h4Size, "16")}
                                    fallback={getDisplayValue(undefined, h4Size, "16")}
                                    onValueChange={(next) => updateStyle(style.id, "h4Size", `${next}px`)}
                                    placeholder="16"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Line height <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.h4LineHeight, h4LineHeight, "24")}
                                    fallback={getDisplayValue(undefined, h4LineHeight, "24")}
                                    onValueChange={(next) => updateStyle(style.id, "h4LineHeight", `${next}px`)}
                                    placeholder="24"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Weight</Label>
                                  <Select
                                    value={style.h4Weight || h4Weight || "700"}
                                    onValueChange={(value) => updateStyle(style.id, "h4Weight", value)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                      <SelectValue placeholder={getWeightLabel(style.h4Weight || h4Weight || "700")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Body + Links Typography Column */}
                          <div className="space-y-6">
                            {/* Body */}
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-600">Body font</Label>
                              </div>
                              <FontField
                                className="mt-1 mb-3 text-xs bg-white w-full"
                                value={getDisplayFont(style.bodyFont, bodyFont, "Arial, sans-serif")}
                                fallback={getDisplayFont(undefined, bodyFont, "Arial, sans-serif")}
                                onValueChange={(next) => updateStyle(style.id, "bodyFont", next)}
                                placeholder={getDisplayFont(undefined, bodyFont, "Arial, sans-serif")}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs text-slate-600">Size <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.bodySize, bodySize, "16")}
                                    fallback={getDisplayValue(undefined, bodySize, "16")}
                                    onValueChange={(next) => updateStyle(style.id, "bodySize", `${next}px`)}
                                    placeholder="16"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Line height <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.bodyLineHeight, bodyLineHeight, "24")}
                                    fallback={getDisplayValue(undefined, bodyLineHeight, "24")}
                                    onValueChange={(next) => updateStyle(style.id, "bodyLineHeight", `${next}px`)}
                                    placeholder="24"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Weight</Label>
                                  <Select
                                    value={style.bodyWeight || bodyWeight || "400"}
                                    onValueChange={(value) => updateStyle(style.id, "bodyWeight", value)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                      <SelectValue placeholder={getWeightLabel(style.bodyWeight || bodyWeight || "400")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Links */}
                            <div className="border-t pt-4">
                              <Label className="text-xs text-slate-600">Links</Label>
                              <div className="mt-3">
                                <Label className="text-xs text-slate-600">Weight</Label>
                                <Select
                                  value={style.linkWeight || linkWeight || "400"}
                                  onValueChange={(value) => updateStyle(style.id, "linkWeight", value)}
                                >
                                  <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                    <SelectValue placeholder={getWeightLabel(style.linkWeight || linkWeight || "400")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FONT_WEIGHT_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Button Typography Column */}
                          <div className="space-y-6">
                            {/* Button */}
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-600">Button font</Label>
                              </div>
                              <FontField
                                className="mt-1 mb-3 text-xs bg-white w-full"
                                value={getDisplayFont(style.buttonFont, buttonFont, "Arial, sans-serif")}
                                fallback={getDisplayFont(undefined, buttonFont, "Arial, sans-serif")}
                                onValueChange={(next) => updateStyle(style.id, "buttonFont", next)}
                                placeholder={getDisplayFont(undefined, buttonFont, "Arial, sans-serif")}
                              />
                              <div className="grid grid-cols-3 gap-2 mb-6">
                                <div>
                                  <Label className="text-xs text-slate-600">Size <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.buttonSize, buttonSize, "15")}
                                    fallback={getDisplayValue(undefined, buttonSize, "15")}
                                    onValueChange={(next) => updateStyle(style.id, "buttonSize", `${next}px`)}
                                    placeholder="15"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Line height <span className="text-xs text-gray-400">px</span></Label>
                                  <NumberField
                                    className="mt-1 text-xs bg-white w-full"
                                    value={getDisplayValue(style.buttonLineHeight, buttonLineHeight, "22")}
                                    fallback={getDisplayValue(undefined, buttonLineHeight, "22")}
                                    onValueChange={(next) => updateStyle(style.id, "buttonLineHeight", `${next}px`)}
                                    placeholder="22"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">Weight</Label>
                                  <Select
                                    value={style.buttonWeight || buttonWeight || "600"}
                                    onValueChange={(value) => updateStyle(style.id, "buttonWeight", value)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs bg-white w-full">
                                      <SelectValue placeholder={getWeightLabel(style.buttonWeight || buttonWeight || "600")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Button Padding */}
                              <div className="mb-6">
                                <Label className="text-xs font-semibold text-slate-700">Button padding <span className="text-xs text-gray-400">px</span></Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                                  <div>
                                    <Label className="text-xs text-slate-600">Top</Label>
                                    <NumberField
                                      className="mt-1 text-xs bg-white w-full"
                                      value={getDisplayValue(style.buttonPaddingTop, buttonPaddingTop, "10")}
                                      fallback={getDisplayValue(undefined, buttonPaddingTop, "10")}
                                      onValueChange={(next) => updateStyle(style.id, "buttonPaddingTop", `${next}px`)}
                                      placeholder="10"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Right</Label>
                                    <NumberField
                                      className="mt-1 text-xs bg-white w-full"
                                      value={getDisplayValue(style.buttonPaddingRight, buttonPaddingRight, "20")}
                                      fallback={getDisplayValue(undefined, buttonPaddingRight, "20")}
                                      onValueChange={(next) => updateStyle(style.id, "buttonPaddingRight", `${next}px`)}
                                      placeholder="20"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Bottom</Label>
                                    <NumberField
                                      className="mt-1 text-xs bg-white w-full"
                                      value={getDisplayValue(style.buttonPaddingBottom, buttonPaddingBottom, "10")}
                                      fallback={getDisplayValue(undefined, buttonPaddingBottom, "10")}
                                      onValueChange={(next) => updateStyle(style.id, "buttonPaddingBottom", `${next}px`)}
                                      placeholder="10"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Left</Label>
                                    <NumberField
                                      className="mt-1 text-xs bg-white w-full"
                                      value={getDisplayValue(style.buttonPaddingLeft, buttonPaddingLeft, "20")}
                                      fallback={getDisplayValue(undefined, buttonPaddingLeft, "20")}
                                      onValueChange={(next) => updateStyle(style.id, "buttonPaddingLeft", `${next}px`)}
                                      placeholder="20"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Button Border Radius */}
                              <div>
                                <Label className="text-xs font-semibold text-slate-700">Button border radius</Label>
                                <NumberField
                                  className="mt-1 text-xs bg-white w-full"
                                  value={(getDisplayValue(style.buttonBorderRadius, buttonBorderRadius, "4")).replace("px", "")}
                                  fallback={getDisplayValue(undefined, buttonBorderRadius, "4")}
                                  onValueChange={(next) => updateStyle(style.id, "buttonBorderRadius", `${next}px`)}
                                  placeholder="4"
                                />
                              </div>
                            </div>
                          </div>
                          </div>

                        <Button
                            onClick={() => {
                              setStyles((prev) => prev.map((s) => {
                                if (s.id === style.id) {
                                  return {
                                    ...s,
                                    ...clearedTypographyOverrides(),
                                  }
                                }
                                return s
                              }))
                              
                              // Show check icon feedback
                              setResetStyles((prev) => {
                                const newSet = new Set(prev)
                                newSet.add(style.id)
                                return newSet
                              })
                              
                              // Auto-clear after 2 seconds
                              if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
                              resetTimeoutRef.current = setTimeout(() => {
                                setResetStyles((prev) => {
                                  const updated = new Set(prev)
                                  updated.delete(style.id)
                                  return updated
                                })
                              }, 2000)
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full mt-4"
                            title="Removes all typography overrides for this style, reverting to global defaults"
                          >
                            {resetStyles.has(style.id) ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Reset!
                              </>
                            ) : (
                              "Reset to global settings"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              <Button onClick={addStyle} variant="outline" className="w-full bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Add Style
              </Button>
            </CardContent>
          </Card>
        </div>
              </>
            )}


        </div>
        </div>

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between mt-2 gap-4">
          {currentStep > 1 && (
            <Button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              variant="outline"
              className="flex-1"
            >
              ← Back
            </Button>
          )}
          {currentStep === 1 && <div className="flex-1" />}
          {currentStep < 4 && (
            <Button
              onClick={() => {
                // Validate colors on step 1 before advancing
                if (currentStep === 1 && !validateColorsForStep()) {
                  return
                }
                // Validate typography on step 3 before advancing
                if (currentStep === 3 && !validateTypographyForNext()) {
                  return
                }
                setCurrentStep(Math.min(4, currentStep + 1))
              }}
              disabled={currentStep === 1 && !!colorNameError}
              className="flex-1 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </Button>
          )}
          {currentStep === 4 && (
            <Button
              onClick={() => {
                if (!validateBeforeSave()) return
                // Save theme
                saveToLocalStorage("savedTheme", {
                  colors,
                  styles,
                  h1Font,
                  h2Font,
                  h3Font,
                  h4Font,
                  bodyFont,
                  buttonFont,
                  themePadding,
                  h1Size,
                  h1LineHeight,
                  h1Weight,
                  h2Size,
                  h2LineHeight,
                  h2Weight,
                  h3Size,
                  h3LineHeight,
                  h3Weight,
                  h4Size,
                  h4LineHeight,
                  h4Weight,
                  bodySize,
                  bodyLineHeight,
                  bodyWeight,
                  buttonSize,
                  buttonLineHeight,
                  buttonWeight,
                  buttonPaddingTop,
                  buttonPaddingRight,
                  buttonPaddingBottom,
                  buttonPaddingLeft,
                  buttonBorderRadius,
                  titlePaddingBottom,
                  googleFontImport,
                  customImport,
                  webfontImports,
                  globalIconStyle,
                  globalIconSize,
                })
                setHasUnsavedChanges(false)
                setShowSuccessModal(true)
              }}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              Save Theme
            </Button>
          )}
        </div>
              </div>
            </div>

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 gap-4">
        <AlertDialog open={showExitWarning} onOpenChange={setShowExitWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. What would you like to do?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
              <Button
                onClick={() => {
                  setShowExitWarning(false)
                  window.location.href = "/"
                }}
                variant="outline"
                className="flex-1"
              >
                Discard changes
              </Button>
              <Button
                onClick={() => {
                  if (!validateBeforeSave()) return
                  // Save theme
                  saveToLocalStorage("savedTheme", {
                    colors,
                    styles,
                    h1Font,
                    h2Font,
                    h3Font,
                    h4Font,
                    bodyFont,
                    buttonFont,
                    themePadding,
                    h1Size,
                    h1LineHeight,
                    h1Weight,
                    h2Size,
                    h2LineHeight,
                    h2Weight,
                    h3Size,
                    h3LineHeight,
                    h3Weight,
                    h4Size,
                    h4LineHeight,
                    h4Weight,
                    bodySize,
                    bodyLineHeight,
                    bodyWeight,
                    buttonSize,
                    buttonLineHeight,
                    buttonWeight,
                    buttonPaddingTop,
                    buttonPaddingRight,
                    buttonPaddingBottom,
                    buttonPaddingLeft,
                    buttonBorderRadius,
                    titlePaddingBottom,
                    googleFontImport,
                    customImport,
                    webfontImports,
                    globalIconStyle,
                    globalIconSize,
                  })
                  setShowExitWarning(false)
                  window.location.href = "/"
                }}
                className="flex-1 text-white"
                style={{ backgroundColor: '#16A34A' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
              >
                Save and exit
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Success Modal */}
        <style>{`
          @keyframes springPop {
            0% {
              opacity: 0;
              transform: scale(0.3);
            }
            50% {
              opacity: 1;
            }
            70% {
              transform: scale(1.15);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-spring-pop {
            animation: springPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          /* Truncate long color names in select triggers */
          [data-color-select] {
            width: 100%;
          }
          [data-color-select] > div {
            max-width: 200px;
            overflow: hidden;
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }
          [data-color-select] > div > :last-child {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        `}</style>
        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent className="max-w-md">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="mb-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(33, 205, 236, 0.1)' }} />
                  <CheckCircle className="w-16 h-16 animate-spring-pop" style={{ color: '#21cdec' }} strokeWidth={1.5} />
                </div>
              </div>
              <AlertDialogHeader className="text-center">
                <AlertDialogTitle className="text-2xl">Theme saved!</AlertDialogTitle>
                <AlertDialogDescription className="text-base mt-2">
                  Your theme has been saved successfully. You can continue customizing or exit anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <AlertDialogFooter className="flex gap-3 w-full">
              <Button
                onClick={() => setShowSuccessModal(false)}
                variant="outline"
                className="flex-1"
              >
                Continue customising
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false)
                  window.location.href = "/"
                }}
                variant="outline"
                className="flex-1"
              >
                Exit to Theme Dashboard
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Datalist for available webfonts */}
        <datalist id="available-fonts">
          {getAvailableFonts().map((font) => (
            <option key={font} value={font} />
          ))}
        </datalist>
            </div>
            </div>
      <DevInformationModal
        isOpen={showDevInfo}
        onClose={() => setShowDevInfo(false)}
        onCopyCss={copyExportCss}
        onCopyHtml={copyExportHtml}
        onCopyMediaQuery={copyExportMediaQuery}
        onCopyImport={copyImportToClipboard}
        copiedCss={copiedCss}
        copiedHtml={copiedHtml}
        copiedMediaQuery={copiedMedia}
        copiedImport={copiedImport}
        cssValidationResult={cssValidationResult}
      />
      <Toaster />
    </>
  )
}
