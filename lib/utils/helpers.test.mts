import test from "node:test"
import assert from "node:assert/strict"

import { escapeCssString, toCssPx, formatFontForCSS } from "./helpers.ts"

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
