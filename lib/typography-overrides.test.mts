import test from "node:test"
import assert from "node:assert/strict"

import {
  TYPOGRAPHY_OVERRIDE_FIELDS,
  hasTypographyOverrides,
  clearedTypographyOverrides,
} from "./typography-overrides.ts"

/** Run with: pnpm test */

const GLOBALS = {
  h1Font: "Arial, sans-serif", h2Font: "Arial, sans-serif", h3Font: "Arial, sans-serif",
  h4Font: "Arial, sans-serif", bodyFont: "Arial, sans-serif", buttonFont: "Arial, sans-serif",
  h1Size: "22px", h1LineHeight: "30px", h1Weight: "400",
  h2Size: "20px", h2LineHeight: "28px", h2Weight: "400",
  h3Size: "18px", h3LineHeight: "26px", h3Weight: "400",
  h4Size: "16px", h4LineHeight: "24px", h4Weight: "400",
  bodySize: "15px", bodyLineHeight: "22px", bodyWeight: "400",
  linkWeight: "400",
  buttonSize: "15px", buttonLineHeight: "22px", buttonWeight: "400",
  buttonBorderRadius: "4px",
  buttonPaddingTop: "10", buttonPaddingRight: "20",
  buttonPaddingBottom: "10", buttonPaddingLeft: "20",
}

/** What addStyle produces: the global typography copied onto the style. */
const seededStyle = () => ({
  id: "s1", name: "Style 1", description: "", background: "White", textColor: "Black",
  headingColor: "Black", buttonBg: "Black", buttonText: "White", linkColor: "Black",
  h1Font: "Arial, sans-serif", h2Font: "Arial, sans-serif", h3Font: "Arial, sans-serif",
  h4Font: "Arial, sans-serif", bodyFont: "Arial, sans-serif", buttonFont: "Arial, sans-serif",
  h1Size: "22px", h1LineHeight: "30px", h1Weight: "400",
  h2Size: "20px", h2LineHeight: "28px", h2Weight: "400",
  h3Size: "18px", h3LineHeight: "26px", h3Weight: "400",
  h4Size: "16px", h4LineHeight: "24px", h4Weight: "400",
  bodySize: "15px", bodyLineHeight: "22px", bodyWeight: "400",
  buttonSize: "15px", buttonLineHeight: "22px", buttonWeight: "400",
}) as any

test("the field list covers all thirty overrides", () => {
  assert.equal(TYPOGRAPHY_OVERRIDE_FIELDS.length, 30)
  assert.equal(new Set(TYPOGRAPHY_OVERRIDE_FIELDS).size, 30, "no duplicates")
})

test("a freshly seeded style is not overriding anything", () => {
  // addStyle copies the globals onto the style, so presence alone means nothing.
  assert.equal(hasTypographyOverrides(seededStyle(), GLOBALS), false)
})

test("a changed value counts as an override", () => {
  assert.equal(hasTypographyOverrides({ ...seededStyle(), h1Size: "44px" }, GLOBALS), true)
  assert.equal(hasTypographyOverrides({ ...seededStyle(), bodyFont: "Georgia" }, GLOBALS), true)
  assert.equal(hasTypographyOverrides({ ...seededStyle(), buttonWeight: "700" }, GLOBALS), true)
})

test("a field the seed leaves unset counts once populated", () => {
  assert.equal(hasTypographyOverrides({ ...seededStyle(), buttonPaddingTop: "40px" }, GLOBALS), true)
  // ...but not when it matches the global, in either unit form.
  assert.equal(hasTypographyOverrides({ ...seededStyle(), buttonPaddingTop: "10px" }, GLOBALS), false)
  assert.equal(hasTypographyOverrides({ ...seededStyle(), buttonPaddingTop: "10" }, GLOBALS), false)
})

test("blank and undefined values are not overrides", () => {
  assert.equal(hasTypographyOverrides({ ...seededStyle(), h1Size: undefined }, GLOBALS), false)
  assert.equal(hasTypographyOverrides({ ...seededStyle(), h1Size: "   " }, GLOBALS), false)
})

test("an empty style with no globals supplied is not overriding", () => {
  assert.equal(hasTypographyOverrides({ id: "s1" } as any, GLOBALS), false)
})

test("clearing removes every field", () => {
  const cleared = { ...seededStyle(), h1Size: "44px", ...clearedTypographyOverrides() }
  for (const field of TYPOGRAPHY_OVERRIDE_FIELDS) {
    assert.equal(cleared[field], undefined, `${field} should be cleared`)
  }
  assert.equal(hasTypographyOverrides(cleared, GLOBALS), false)
  // Non-typography fields survive.
  assert.equal(cleared.background, "White")
  assert.equal(cleared.buttonBg, "Black")
})

test("clearing then re-checking is stable", () => {
  const once = { ...seededStyle(), ...clearedTypographyOverrides() }
  const twice = { ...once, ...clearedTypographyOverrides() }
  assert.deepEqual(once, twice)
})
