import test from "node:test"
import assert from "node:assert/strict"

import { escapeCssString, toCssPx, formatFontForCSS, commitOnBlur } from "./helpers.ts"

/** Run with: pnpm test */

test("escapeCssString protects a single-quoted CSS string", () => {
  // An unescaped apostrophe closes the string early and can take the next rule
  // with it during the browser's error recovery.
  assert.equal(escapeCssString("Bob's white background"), "Bob\\'s white background")
  assert.equal(escapeCssString("plain description"), "plain description")
  assert.equal(escapeCssString("two's and three's"), "two\\'s and three\\'s")
})

test("escapeCssString handles backslashes before quotes", () => {
  assert.equal(escapeCssString("back\\slash"), "back\\\\slash")
  // The backslash is doubled first, so it cannot swallow the quote escape.
  assert.equal(escapeCssString("a\\'b"), "a\\\\\\'b")
})

test("escapeCssString folds newlines, which are illegal in a CSS string", () => {
  assert.equal(escapeCssString("line one\nline two"), "line one line two")
  assert.equal(escapeCssString("line one\r\nline two"), "line one line two")
})

test("toCssPx accepts a value with or without its unit", () => {
  assert.equal(toCssPx("10", "20"), "10px")
  assert.equal(toCssPx("10px", "20"), "10px", "already carries the unit")
  assert.equal(toCssPx("", "20"), "20px", "falls back")
  assert.equal(toCssPx(undefined, "20"), "20px")
  assert.equal(toCssPx("1.5", "20"), "1.5px", "decimals survive")
})

test("formatFontForCSS quotes multi-word families", () => {
  assert.equal(formatFontForCSS("Hubot Sans, sans-serif"), "'Hubot Sans', sans-serif")
  assert.equal(formatFontForCSS("Arial, sans-serif"), "Arial, sans-serif")
  assert.equal(formatFontForCSS(undefined), "'Arial', sans-serif")
})

/**
 * A font stack must never carry a semicolon, an unescaped apostrophe or a brace
 * into the declaration. Each of those ends the declaration early and the email
 * client drops the rest of the rule.
 */
const CSS_BREAKERS = /[;{}]/

test("a second font stack after a semicolon is dropped, not quoted", () => {
  // Reported by a tester: the generated CSS read
  //   font-family: Inter, 'sans-serif; Montserrat', sans-serif;
  // which does not parse, so the theme's fonts were lost in the email.
  assert.equal(
    formatFontForCSS("Inter, sans-serif; Montserrat, sans-serif"),
    "Inter, sans-serif",
  )
  assert.equal(formatFontForCSS("Inter, sans-serif;Montserrat"), "Inter, sans-serif")
  // A trailing semicolon on its own is not a second stack.
  assert.equal(formatFontForCSS("Arial, sans-serif;"), "Arial, sans-serif")
  assert.equal(
    formatFontForCSS("font-family: Inter, sans-serif; Montserrat, sans-serif;"),
    "Inter, sans-serif",
  )
})

test("a value already stored in the broken form is repaired", () => {
  // FontField formats on blur and stores the result, so testers already have
  // the mangled string in localStorage. Reformatting it has to recover.
  assert.equal(
    formatFontForCSS("Inter, 'sans-serif; Montserrat', sans-serif"),
    "Inter, sans-serif",
  )
})

test("an apostrophe in a family name is escaped, not left to close the quote", () => {
  assert.equal(formatFontForCSS("Jo's Font, sans-serif"), "'Jo\\'s Font', sans-serif")
  assert.ok(!CSS_BREAKERS.test(formatFontForCSS("Jo's Font, sans-serif")))
})

test("braces and newlines cannot escape the rule", () => {
  for (const attack of ["}\n.evil{color:red", "Arial}\n.x{y:z", "a{b}c, sans-serif"]) {
    const out = formatFontForCSS(attack)
    assert.ok(!CSS_BREAKERS.test(out), `breaker survived in ${JSON.stringify(attack)}`)
    assert.ok(!/[\r\n]/.test(out), `newline survived in ${JSON.stringify(attack)}`)
  }
})

test("generic families stay unquoted so they keep their meaning", () => {
  // Quoting sans-serif asks for a font named "sans-serif" instead of the keyword.
  for (const generic of ["sans-serif", "serif", "monospace", "cursive", "system-ui"]) {
    assert.equal(formatFontForCSS(`Arial, ${generic}`), `Arial, ${generic}`)
  }
})

test("formatting is idempotent, because the result is stored and reformatted", () => {
  const inputs = [
    "Inter, sans-serif; Montserrat, sans-serif",
    "Hubot Sans, sans-serif",
    "Jo's Font, sans-serif",
    "'Hubot Sans', sans-serif",
    'Inter, "Helvetica Neue", sans-serif',
    "Arial, sans-serif",
  ]
  for (const input of inputs) {
    const once = formatFontForCSS(input)
    assert.equal(formatFontForCSS(once), once, `not stable for ${JSON.stringify(input)}`)
    assert.ok(!CSS_BREAKERS.test(once), `breaker in output for ${JSON.stringify(input)}`)
  }
})

test("double quotes are normalised to single quotes", () => {
  assert.equal(formatFontForCSS('Inter, "Helvetica Neue", sans-serif'), "Inter, 'Helvetica Neue', sans-serif")
})

test("a value with nothing usable falls back rather than emitting an empty stack", () => {
  assert.equal(formatFontForCSS(";"), "'Arial', sans-serif")
  assert.equal(formatFontForCSS("  "), "'Arial', sans-serif")
  assert.equal(formatFontForCSS(","), "'Arial', sans-serif")
  assert.equal(formatFontForCSS(""), "'Arial', sans-serif")
})

/**
 * Blur handling for the draft fields. A field that was focused but never typed
 * in must commit nothing, or leaving it puts the default back over an edit.
 */

test("a field that was focused but never typed in commits nothing", () => {
  // The reported bug: set padding to 44, click in again, click away without
  // typing, and the field went back to 25.
  assert.equal(commitOnBlur(null, "25"), null)
  assert.equal(commitOnBlur(null, "Arial, sans-serif"), null)
})

test("a field the user actually cleared falls back", () => {
  assert.equal(commitOnBlur("", "25"), "25")
  assert.equal(commitOnBlur("   ", "25"), "25", "whitespace only counts as cleared")
})

test("an edited field commits what was typed", () => {
  assert.equal(commitOnBlur("44", "25"), "44")
  assert.equal(commitOnBlur("0", "25"), "0", "zero is a real value, not empty")
  assert.equal(commitOnBlur("Inter, sans-serif", "Arial, sans-serif"), "Inter, sans-serif")
})

test("the three cases stay distinct", () => {
  // Collapsing never-typed into cleared is exactly what caused the revert.
  const neverTyped = commitOnBlur(null, "25")
  const cleared = commitOnBlur("", "25")
  assert.notEqual(neverTyped, cleared)
})
