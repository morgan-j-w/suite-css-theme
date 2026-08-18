import test from "node:test"
import assert from "node:assert/strict"

import {
  VALIDATION_MESSAGES as M,
  isValidHex,
  stripHexWhitespace,
  normaliseHexOnBlur,
  validateBeforeAddingColour,
  validatePalette,
  validateTypographyForStep,
  validateTypographyForSave,
  validateThemeForSave,
  isThemeNameMissing,
} from "./theme-validator.ts"

/**
 * Covers the guards on the wizard's next and save paths — the QA triage items
 * #7, #9, #10, #11, #12, #13, #14, #15, #59, #60, #69, #74 and #75.
 *
 * The exact message strings are supplied by QA, so asserting against
 * VALIDATION_MESSAGES rather than literals keeps the wording in one place while
 * still failing if a guard returns the wrong one.
 *
 * Run with: pnpm test
 */

const c = (name: string, hex: string) => ({ id: name + hex, name, hex })

const goodTypography = () => ({
  h1Font: "Arial", h1Size: "22px", h1LineHeight: "30px",
  h2Font: "Arial", h2Size: "20px", h2LineHeight: "28px",
  h3Font: "Arial", h3Size: "18px", h3LineHeight: "26px",
  h4Font: "Arial", h4Size: "16px", h4LineHeight: "24px",
  bodyFont: "Arial", bodySize: "15px", bodyLineHeight: "22px",
  buttonFont: "Arial", buttonSize: "15px", buttonLineHeight: "22px",
})

test("#10/#11 hex validity", () => {
  assert.equal(isValidHex("#ffffff"), true)
  assert.equal(isValidHex("#FFFFFF"), true, "uppercase is valid")
  assert.equal(isValidHex("  #ffffff  "), true, "surrounding whitespace tolerated")
  assert.equal(isValidHex("264653"), false, "#10: missing hash")
  assert.equal(isValidHex("#fff"), false, "shorthand is not accepted")
  assert.equal(isValidHex("   "), false, "#11: whitespace-only is not a hex")
  assert.equal(isValidHex(undefined), false)
})

test("#11 whitespace can never enter a hex value", () => {
  assert.equal(stripHexWhitespace("  264653  "), "264653")
  assert.equal(stripHexWhitespace("26 46 53"), "264653", "interior spaces too")
  assert.equal(stripHexWhitespace("\t26\n4653"), "264653", "tabs and newlines too")
  assert.equal(stripHexWhitespace("#264653"), "#264653", "a clean value is untouched")
})

test("#10 the missing hash is supplied on blur", () => {
  assert.equal(normaliseHexOnBlur("264653"), "#264653")
  assert.equal(normaliseHexOnBlur("E9C46A"), "#E9C46A", "case is preserved")
  assert.equal(normaliseHexOnBlur("#2a9d8f"), "#2a9d8f", "an existing hash is kept")
  assert.equal(normaliseHexOnBlur(""), "")
  assert.equal(normaliseHexOnBlur("   "), "")
})

test("#10 only a plausible hex body gets a hash", () => {
  // Nonsense is left for the validator to report rather than dressed up as hex.
  assert.equal(normaliseHexOnBlur("reddish"), "reddish")
  assert.equal(normaliseHexOnBlur("2646531234"), "2646531234", "too long")
  // An incomplete body still gains its hash and still fails, which tells the
  // user the hash was not the problem.
  assert.equal(normaliseHexOnBlur("26465"), "#26465")
  assert.equal(isValidHex(normaliseHexOnBlur("264653")), true)
  assert.equal(isValidHex(normaliseHexOnBlur("26465")), false)
})

test("#13/#15 the add colour guard", () => {
  assert.equal(validateBeforeAddingColour([c("", "")]), M.colourRowIncomplete, "#13")
  assert.equal(validateBeforeAddingColour([c("", "   ")]), M.colourRowIncomplete)
  assert.equal(validateBeforeAddingColour([c("", "#123456")]), M.colourNameRequired, "#15")
  assert.equal(validateBeforeAddingColour([c("  ", "#123456")]), M.colourNameRequired)
  assert.equal(validateBeforeAddingColour([c("Blue", "264653")]), M.hexFormat)
  assert.equal(validateBeforeAddingColour([c("Blue", "#264653")]), null, "a complete row is allowed")
  assert.equal(validateBeforeAddingColour([]), null, "an empty palette is allowed")
})

test("#9 an empty palette blocks", () => {
  assert.equal(validatePalette([]), M.emptyPalette)
})

test("#9 a palette of only the seeded defaults is not a palette", () => {
  assert.equal(validatePalette([c("White", "#ffffff"), c("Black", "#000000")]), M.emptyPalette)
  assert.equal(validatePalette([c("White", "#ffffff")]), M.emptyPalette, "one default left")
  assert.equal(
    validatePalette([c("white", "#FFFFFF"), c("BLACK", "#000000")]),
    M.emptyPalette,
    "case-insensitive",
  )
  // Renaming or recolouring a default makes it the user's own choice.
  assert.equal(validatePalette([c("Snow", "#ffffff")]), null, "renamed")
  assert.equal(validatePalette([c("White", "#fefefe")]), null, "recoloured")
  assert.equal(
    validatePalette([c("White", "#ffffff"), c("Black", "#000000"), c("Verdigris", "#2a9d8f")]),
    null,
    "defaults plus a real colour",
  )
})

test("#14 incomplete colour rows block leaving step 1", () => {
  assert.equal(validatePalette([c("", "#2a9d8f")]), M.coloursIncomplete, "missing name")
  assert.equal(validatePalette([c("   ", "#2a9d8f")]), M.coloursIncomplete, "whitespace name")
  assert.equal(validatePalette([c("Verdigris", "   ")]), M.coloursIncomplete, "#11 blank hex")
  assert.equal(validatePalette([c("Verdigris", "2a9d8f")]), M.hexFormat, "#10 malformed hex")
})

test("#12 duplicates are caught case-insensitively", () => {
  assert.equal(
    validatePalette([c("Verdigris", "#2a9d8f"), c("Teal", "#2a9d8f")]),
    M.duplicateColours,
    "duplicate hex",
  )
  assert.equal(
    validatePalette([c("Verdigris", "#2A9D8F"), c("Teal", "#2a9d8f")]),
    M.duplicateColours,
    "duplicate hex, mixed case",
  )
  assert.equal(
    validatePalette([c("Verdigris", "#2a9d8f"), c("verdigris", "#e9c46a")]),
    M.duplicateColours,
    "duplicate name, mixed case",
  )
  assert.equal(
    validatePalette([c("Verdigris", "#2a9d8f"), c(" verdigris ", "#e9c46a")]),
    M.duplicateColours,
    "duplicate name, padded",
  )
  assert.equal(validatePalette([c("Verdigris", "#2a9d8f"), c("Jasmine", "#e9c46a")]), null)
})

test("#59/#60 typography is required to leave step 3", () => {
  assert.equal(validateTypographyForStep(goodTypography()), null)
  assert.equal(
    validateTypographyForStep({ ...goodTypography(), h1Size: "" }),
    M.typographyIncompleteContinue,
    "#59 empty",
  )
  assert.equal(
    validateTypographyForStep({ ...goodTypography(), h1Size: "   " }),
    M.typographyIncompleteContinue,
    "#60 whitespace-only",
  )
  assert.equal(
    validateTypographyForStep({ ...goodTypography(), buttonLineHeight: "\t" }),
    M.typographyIncompleteContinue,
    "#60 tab",
  )
  assert.equal(
    validateTypographyForStep({ ...goodTypography(), bodyFont: "" }),
    M.typographyIncompleteContinue,
    "the font counts too, per the message",
  )
})

test("#74/#75 typography is required to save from step 4", () => {
  assert.equal(
    validateTypographyForSave({ ...goodTypography(), h3Size: "" }, []),
    M.typographyIncompleteSave,
    "#74",
  )
  assert.equal(
    validateTypographyForSave({ ...goodTypography(), h3Size: "  " }, []),
    M.typographyIncompleteSave,
    "#75",
  )
  // An absent override means inherit; a present-but-blank one does not.
  assert.equal(
    validateTypographyForSave(goodTypography(), [{ id: "s1", h1Size: undefined } as never]),
    null,
  )
  assert.equal(
    validateTypographyForSave(goodTypography(), [{ id: "s1", h1Size: "   " } as never]),
    M.typographyIncompleteSave,
  )
  assert.equal(
    validateTypographyForSave(goodTypography(), [{ id: "s1", h1Size: "40px" } as never]),
    null,
  )
})

test("#7 the theme name must be the user's own", () => {
  assert.equal(isThemeNameMissing(""), true)
  assert.equal(isThemeNameMissing("   "), true)
  // The name input refuses an empty value, so the reachable case is the
  // untouched default the wizard starts with.
  assert.equal(isThemeNameMissing("Untitled Theme"), true)
  assert.equal(isThemeNameMissing("untitled theme"), true, "any case")
  assert.equal(isThemeNameMissing("Acme Brand"), false)
})

const completeTheme = () => ({
  themeName: "Acme Brand",
  colors: [c("Verdigris", "#2a9d8f")],
  styles: [{ id: "s1", name: "Style 1" }] as never,
  typography: goodTypography(),
})

test("the save guards fire in order of severity", () => {
  assert.equal(
    validateThemeForSave({ ...completeTheme(), themeName: "" }),
    M.themeNameRequired,
    "#7",
  )
  assert.equal(
    validateThemeForSave({ ...completeTheme(), themeName: "Untitled Theme" }),
    M.themeNameRequired,
    "#7 untouched default",
  )
  assert.equal(validateThemeForSave({ ...completeTheme(), colors: [] }), M.emptyPalette, "#9")
  assert.equal(
    validateThemeForSave({ ...completeTheme(), styles: [] as never }),
    M.themeStyleRequired,
    "#69",
  )
})

test("a complete theme saves", () => {
  assert.equal(validateThemeForSave(completeTheme()), null)
})
