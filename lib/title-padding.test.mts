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
