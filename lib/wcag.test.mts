import test from "node:test"
import assert from "node:assert/strict"

import {
  getContrastRatio,
  checkAllContrasts,
  getComplianceLevel,
  isLargeTextForWCAG,
  type TextEvaluationConfig,
} from "./wcag.ts"

/**
 * Regression tests for issue #78 — the WCAG generator offering combinations
 * that the checker then failed.
 *
 * Run with: pnpm test
 */

/** QA's test palette from the bug report. */
const PALETTE = [
  { name: "Charcoal Blue", hex: "#264653" },
  { name: "Verdigris", hex: "#2a9d8f" },
  { name: "Jasmine", hex: "#e9c46a" },
  { name: "Sandy Brown", hex: "#f4a261" },
  { name: "Burnt Peach", hex: "#e76f51" },
  { name: "Mystic", hex: "#E5EFF0" },
  { name: "Athens Gray", hex: "#e9eff5" },
  { name: "Bubblegum Pink", hex: "#ef476f" },
  { name: "Emerald", hex: "#06d6a0" },
  { name: "Ocean Blue", hex: "#118ab2" },
  { name: "Dark Teal", hex: "#073b4c" },
]

/**
 * The config the checker derives from the wizard's default typography:
 * heading 22px/400, body 15px/400, link 15px/400, button 15px/600. None of
 * those reach the large-text threshold.
 */
const DEFAULT_TYPOGRAPHY_CONFIG: TextEvaluationConfig = {
  headingLargeText: isLargeTextForWCAG(22, 400),
  bodyLargeText: isLargeTextForWCAG(15, 400),
  linkLargeText: isLargeTextForWCAG(15, 400),
  buttonLargeText: isLargeTextForWCAG(15, 600),
}

test("contrast ratio matches the WCAG reference values", () => {
  assert.equal(Number(getContrastRatio("#ffffff", "#000000").toFixed(2)), 21)
  assert.equal(Number(getContrastRatio("#ffffff", "#ffffff").toFixed(2)), 1)
  // Dark Teal from QA's palette against white: relative luminance 0.03695,
  // so (1.0 + 0.05) / (0.03695 + 0.05) = 12.08.
  assert.equal(Number(getContrastRatio("#073b4c", "#ffffff").toFixed(2)), 12.08)
})

test("default typography is not large text", () => {
  assert.equal(DEFAULT_TYPOGRAPHY_CONFIG.buttonLargeText, false)
  assert.equal(DEFAULT_TYPOGRAPHY_CONFIG.headingLargeText, false)
  // 18.66px only counts as large once the weight is bold.
  assert.equal(isLargeTextForWCAG(19, 700), true)
  assert.equal(isLargeTextForWCAG(19, 600), false)
  assert.equal(isLargeTextForWCAG(24, 400), true)
})

/**
 * Enumerates every background/text/button combination the generator could build
 * from the palette, evaluated the way the checker evaluates a saved style.
 */
function* combinations() {
  for (const bg of PALETTE) {
    for (const text of PALETTE) {
      if (text.hex === bg.hex) continue
      for (const buttonBg of PALETTE) {
        if (buttonBg.hex === bg.hex) continue
        for (const buttonText of PALETTE) {
          if (buttonText.hex === buttonBg.hex) continue
          yield { bg, text, buttonBg, buttonText }
        }
      }
    }
  }
}

interface Combination {
  bg: { name: string; hex: string }
  text: { name: string; hex: string }
  buttonBg: { name: string; hex: string }
  buttonText: { name: string; hex: string }
}

const evaluate = (c: Combination, config?: TextEvaluationConfig) =>
  checkAllContrasts(
    c.bg.hex,
    c.text.hex,
    c.text.hex,
    c.text.hex,
    c.buttonBg.hex,
    c.buttonText.hex,
    c.text.hex,
    config,
  )

test("#78: anything offered as AA genuinely meets the AA thresholds", () => {
  let checked = 0
  for (const c of combinations()) {
    const results = evaluate(c, DEFAULT_TYPOGRAPHY_CONFIG)
    const level = getComplianceLevel(results)
    if (level !== "AA" && level !== "AAA") continue
    checked++
    const combo = `${c.bg.name} bg / ${c.text.name} text / ${c.buttonText.name} on ${c.buttonBg.name}`
    assert.ok(results.headingOnBg.ratio >= 4.5, `heading below 4.5 in ${combo}`)
    assert.ok(results.bodyTextOnBg.ratio >= 4.5, `body below 4.5 in ${combo}`)
    assert.ok(results.linkOnBg.ratio >= 4.5, `link below 4.5 in ${combo}`)
    assert.ok(results.buttonTextOnButtonBg.ratio >= 4.5, `button text below 4.5 in ${combo}`)
    assert.ok(results.buttonBgOnBg.ratio >= 3, `button bg below 3 in ${combo}`)
  }
  assert.ok(checked > 0, "expected at least one passing combination in the palette")
})

test("#78: anything offered as AAA genuinely meets the AAA thresholds", () => {
  for (const c of combinations()) {
    const results = evaluate(c, DEFAULT_TYPOGRAPHY_CONFIG)
    if (getComplianceLevel(results) !== "AAA") continue
    const combo = `${c.bg.name} bg / ${c.text.name} text / ${c.buttonText.name} on ${c.buttonBg.name}`
    assert.ok(results.headingOnBg.ratio >= 7, `heading below 7 in ${combo}`)
    assert.ok(results.bodyTextOnBg.ratio >= 7, `body below 7 in ${combo}`)
    assert.ok(results.buttonTextOnButtonBg.ratio >= 7, `button text below 7 in ${combo}`)
  }
})

/**
 * The actual defect. checkAllContrasts defaults buttonLargeText to true, so a
 * caller that omitted the config required only 3:1 on button text while the
 * checker required 4.5:1. This asserts such combinations exist in QA's palette,
 * so the test would catch the generator drifting back to the defaults.
 */
test("#78: omitting the config would misclassify real combinations", () => {
  const misclassified: string[] = []
  for (const c of combinations()) {
    const withDefaults = getComplianceLevel(evaluate(c))
    const withTypography = getComplianceLevel(evaluate(c, DEFAULT_TYPOGRAPHY_CONFIG))
    if (withDefaults !== withTypography) {
      misclassified.push(
        `${c.bg.name}/${c.text.name}/${c.buttonText.name} on ${c.buttonBg.name}: ` +
          `defaults said ${withDefaults}, checker says ${withTypography}`,
      )
    }
  }
  assert.ok(
    misclassified.length > 0,
    "expected the default config to disagree with the checker on this palette",
  )
  console.log(`      ${misclassified.length} combinations would have been misclassified`)
  console.log(`      e.g. ${misclassified[0]}`)
})

test("1.4.11: a bordered button is measured by its border, not its fill", () => {
  const page = "#ffffff", fill = "#ffffff", navy = "#1b2a4a"
  // White button on a white page: the fill alone is invisible.
  const withoutBorder = checkAllContrasts(page, "#000000", "#000000", "#000000", fill, "#000000")
  assert.equal(withoutBorder.buttonBgOnBg.aa, false)
  assert.equal(withoutBorder.buttonBgOnBg.ratio, 1)

  // The same button with a navy border is clearly identifiable.
  const withBorder = checkAllContrasts(page, "#000000", "#000000", "#000000", fill, "#000000",
    "#000000", {}, navy)
  assert.equal(withBorder.buttonBgOnBg.aa, true)
  assert.ok(withBorder.buttonBgOnBg.ratio > 3, `got ${withBorder.buttonBgOnBg.ratio}:1`)

  // The button text is still judged against the fill it sits on, not the border.
  assert.equal(withBorder.buttonTextOnButtonBg.ratio, withoutBorder.buttonTextOnButtonBg.ratio)
})

test("1.4.11: the boundary defaults to the fill when no border is given", () => {
  const filled = checkAllContrasts("#ffffff", "#000000", "#000000", "#000000", "#264653", "#ffffff")
  const explicit = checkAllContrasts("#ffffff", "#000000", "#000000", "#000000", "#264653", "#ffffff",
    "#000000", {}, "#264653")
  assert.equal(filled.buttonBgOnBg.ratio, explicit.buttonBgOnBg.ratio)
})

test("1.4.11: a low-contrast border still fails", () => {
  // A border that barely differs from the page does not identify the component.
  const r = checkAllContrasts("#ffffff", "#000000", "#000000", "#000000", "#ffffff", "#000000",
    "#000000", {}, "#f2f2f2")
  assert.equal(r.buttonBgOnBg.aa, false)
})
