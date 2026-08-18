import test from "node:test"
import assert from "node:assert/strict"

import {
  STYLE_COLOUR_FIELDS,
  buildStyleDescription,
  renameColourInStyles,
} from "./colour-references.ts"

/** Run with: pnpm test */

const style = (over: Record<string, unknown> = {}) =>
  ({
    id: "s1",
    name: "Style 1",
    description: "White background with black headings and buttons",
    background: "White",
    textColor: "Black",
    headingColor: "Black",
    buttonBg: "Black",
    buttonText: "White",
    buttonBgHover: "Black",
    buttonTextHover: "White",
    linkColor: "Black",
    buttonBorderColor: "none",
    buttonBorderColorHover: "Black",
    iconColor: "#000000",
    ...over,
  }) as never

test("the field list covers every name-holding field", () => {
  assert.equal(STYLE_COLOUR_FIELDS.length, 10)
  assert.equal(new Set(STYLE_COLOUR_FIELDS).size, 10)
  // iconColor holds a hex, not a name, so it must not be in the list.
  assert.ok(!(STYLE_COLOUR_FIELDS as readonly string[]).includes("iconColor"))
})

test("a rename rewrites every reference to the old name", () => {
  const [s] = renameColourInStyles([style()], "White", "Ivory")
  assert.equal(s.background, "Ivory")
  assert.equal(s.buttonText, "Ivory")
  assert.equal(s.buttonTextHover, "Ivory")
  // Fields that referred to a different colour are untouched.
  assert.equal(s.headingColor, "Black")
  assert.equal(s.buttonBg, "Black")
})

test("matching is case-insensitive, like the hex lookup", () => {
  const [s] = renameColourInStyles([style()], "white", "Ivory")
  assert.equal(s.background, "Ivory")
  const [t] = renameColourInStyles([style({ background: "WHITE" })], "White", "Ivory")
  assert.equal(t.background, "Ivory")
})

test("the sentinel for no border colour is never renamed", () => {
  const [s] = renameColourInStyles([style()], "none", "Ivory")
  assert.equal(s.buttonBorderColor, "none")
})

test("a generated description is refreshed", () => {
  const [s] = renameColourInStyles([style()], "White", "Ivory")
  assert.equal(s.description, "Ivory background with black headings and buttons")
})

test("a generated description keeps its No padding prefix", () => {
  const withPrefix = style({
    noPadding: true,
    description: "No padding - White background with black headings and buttons",
  })
  const [s] = renameColourInStyles([withPrefix], "White", "Ivory")
  assert.equal(s.description, "No padding - Ivory background with black headings and buttons")
})

test("a hand-edited description is left alone", () => {
  const custom = style({ description: "Our hero banner treatment" })
  const [s] = renameColourInStyles([custom], "White", "Ivory")
  assert.equal(s.description, "Our hero banner treatment", "the wording survives")
  assert.equal(s.background, "Ivory", "but the colour reference is still fixed")
})

test("renaming a colour the style does not use changes nothing", () => {
  const original = style()
  const [s] = renameColourInStyles([original], "Verdigris", "Teal")
  assert.equal(s, original, "the same object is returned")
})

test("no-op renames are ignored", () => {
  const styles = [style()]
  assert.equal(renameColourInStyles(styles, "White", "White"), styles, "same name")
  assert.equal(renameColourInStyles(styles, "White", "   "), styles, "blank new name")
  assert.equal(renameColourInStyles(styles, "", "Ivory"), styles, "blank old name")
})

test("every style referencing the colour is updated", () => {
  const styles = [style({ id: "a" }), style({ id: "b" }), style({ id: "c", background: "Black" })]
  const out = renameColourInStyles(styles, "White", "Ivory")
  assert.equal(out[0].background, "Ivory")
  assert.equal(out[1].background, "Ivory")
  assert.equal(out[2].background, "Black", "this one never used White as its background")
  assert.equal(out[2].buttonText, "Ivory", "but it did use it elsewhere")
})

test("buildStyleDescription matches the wizard's wording", () => {
  assert.equal(
    buildStyleDescription({ background: "White", headingColor: "Black", buttonBg: "Black" }),
    "White background with black headings and buttons",
  )
  assert.equal(
    buildStyleDescription({ background: "White", headingColor: "Black", buttonBg: "Red" }),
    "White background with black headings and red buttons",
  )
})
