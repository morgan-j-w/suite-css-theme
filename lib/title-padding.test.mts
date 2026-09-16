import test from "node:test"
import assert from "node:assert/strict"

import { splitTitlePadding, CONTENT_TOP_PADDING } from "./title-padding.ts"

/** Run with: pnpm test */

test("the worked examples from the brief", () => {
  // 14 -> header takes the remainder above the content's own 10px.
  assert.deepEqual(splitTitlePadding("14"), { headerPaddingBottom: 4, linkTextPaddingTop: 10 })
  // 8 -> header cannot go negative, so the text's padding shrinks instead.
  assert.deepEqual(splitTitlePadding("8"), { headerPaddingBottom: 0, linkTextPaddingTop: 8 })
})

test("the two values always sum to the requested padding", () => {
  for (let requested = 0; requested <= 60; requested++) {
    const { headerPaddingBottom, linkTextPaddingTop } = splitTitlePadding(String(requested))
    assert.equal(
      headerPaddingBottom + linkTextPaddingTop,
      requested,
      `split for ${requested} should sum back to ${requested}`,
    )
  }
})

test("neither value is ever negative", () => {
  for (const input of ["0", "1", "9", "10", "11", "100", "-5"]) {
    const { headerPaddingBottom, linkTextPaddingTop } = splitTitlePadding(input)
    assert.ok(headerPaddingBottom >= 0, `header negative for ${input}`)
    assert.ok(linkTextPaddingTop >= 0, `link text negative for ${input}`)
  }
})

test("the boundary at the content's own padding", () => {
  assert.deepEqual(splitTitlePadding("9"), { headerPaddingBottom: 0, linkTextPaddingTop: 9 })
  assert.deepEqual(splitTitlePadding("10"), { headerPaddingBottom: 0, linkTextPaddingTop: 10 })
  assert.deepEqual(splitTitlePadding("11"), { headerPaddingBottom: 1, linkTextPaddingTop: 10 })
  assert.equal(CONTENT_TOP_PADDING, 10)
})

test("zero collapses both", () => {
  assert.deepEqual(splitTitlePadding("0"), { headerPaddingBottom: 0, linkTextPaddingTop: 0 })
})

test("accepts a px suffix, whitespace, and numbers", () => {
  assert.deepEqual(splitTitlePadding("14px"), { headerPaddingBottom: 4, linkTextPaddingTop: 10 })
  assert.deepEqual(splitTitlePadding("  14  "), { headerPaddingBottom: 4, linkTextPaddingTop: 10 })
  assert.deepEqual(splitTitlePadding(14), { headerPaddingBottom: 4, linkTextPaddingTop: 10 })
})

test("unset or unparseable falls back to the default of 14", () => {
  for (const input of [undefined, "", "   ", "abc"]) {
    assert.deepEqual(
      splitTitlePadding(input),
      { headerPaddingBottom: 4, linkTextPaddingTop: 10 },
      `fallback failed for ${JSON.stringify(input)}`,
    )
  }
})

test("a negative value is treated as zero, not as missing", () => {
  assert.deepEqual(splitTitlePadding("-5"), { headerPaddingBottom: 0, linkTextPaddingTop: 0 })
})

test("decimals are preserved", () => {
  assert.deepEqual(splitTitlePadding("12.5"), { headerPaddingBottom: 2.5, linkTextPaddingTop: 10 })
})

/**
 * The intro sits between the heading and the quicklinks:
 *
 *   Heading / Intro / Quicklinks
 *
 * Each gap is a header-side value plus a content-side value, and both must come
 * to the padding the user asked for.
 */

test("the reported examples produce even gaps above and below the intro", () => {
  // 20 -> heading 10, intro 10/10
  const twenty = splitTitlePadding(20)
  assert.equal(twenty.headerPaddingBottom, 10)
  assert.equal(twenty.linkTextPaddingTop, 10)
  assert.equal(twenty.headerPaddingBottom, 10)

  // 44 -> heading 34, intro 10/34
  const fortyFour = splitTitlePadding(44)
  assert.equal(fortyFour.headerPaddingBottom, 34)
  assert.equal(fortyFour.linkTextPaddingTop, 10)
  assert.equal(fortyFour.headerPaddingBottom, 34)
})

test("both gaps equal the requested padding, at every value", () => {
  for (const requested of [0, 1, 5, 8, 9, 10, 11, 14, 20, 25, 44, 100]) {
    const s = splitTitlePadding(requested)
    const headingToIntro = s.headerPaddingBottom + s.linkTextPaddingTop
    const introToLinks = s.headerPaddingBottom + s.linkTextPaddingTop
    assert.equal(headingToIntro, requested, `heading->intro wrong at ${requested}`)
    assert.equal(introToLinks, requested, `intro->links wrong at ${requested}`)
  }
})

test("below the built-in amount the intro's top padding shrinks with it", () => {
  // Not a flat 10: at 8 there is no room for 10, and a hardcoded 10 would open
  // a larger gap above the intro than the user asked for.
  const eight = splitTitlePadding(8)
  assert.equal(eight.linkTextPaddingTop, 8)
  assert.equal(eight.headerPaddingBottom, 0)
  assert.equal(eight.headerPaddingBottom + eight.linkTextPaddingTop, 8)
})

test("an unset or unparseable padding still yields usable intro values", () => {
  for (const value of [undefined, "", "abc", "-5"]) {
    const s = splitTitlePadding(value)
    assert.ok(Number.isFinite(s.linkTextPaddingTop) && s.linkTextPaddingTop >= 0, `bad top for ${JSON.stringify(value)}`)
    assert.ok(Number.isFinite(s.headerPaddingBottom) && s.headerPaddingBottom >= 0, `bad bottom for ${JSON.stringify(value)}`)
  }
})
