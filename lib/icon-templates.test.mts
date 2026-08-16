import test from "node:test"
import assert from "node:assert/strict"

import { buildIconTemplates, SHARE_ICONS, mergeTag } from "./icon-templates.ts"

/**
 * The merge-tag braces must reach the export as literal `{` and `}`.
 *
 * A downstream consumer was seen with `href="%7B!EMAIL_SHARE_DOC!%7D"`, which
 * does not resolve. These tests prove the encoding is not introduced here.
 *
 * Run with: pnpm test
 */

const STYLES = [{ iconColor: "#000000" }, { iconColor: "#264653" }]

test("merge tags use literal braces", () => {
  assert.equal(mergeTag("FORWARD_SHARE_DOC"), "{!FORWARD_SHARE_DOC!}")
})

test("no percent-encoded or HTML-escaped braces anywhere in the markup", () => {
  const markup = buildIconTemplates(STYLES, { iconStyle: "material-rounded", iconSize: "25" })
  for (const forbidden of ["%7B", "%7b", "%7D", "%7d", "&#123;", "&#125;", "&lbrace;", "&rbrace;"]) {
    assert.ok(!markup.includes(forbidden), `markup must not contain ${forbidden}`)
  }
  assert.ok(markup.includes("{!"), "markup must contain a literal {!")
  assert.ok(markup.includes("!}"), "markup must contain a literal !}")
})

test("every share icon emits its token once per style, brace-wrapped", () => {
  const markup = buildIconTemplates(STYLES)
  for (const icon of SHARE_ICONS) {
    const occurrences = markup.split(`href="{!${icon.variable}!}"`).length - 1
    assert.equal(occurrences, STYLES.length, `${icon.variable} should appear once per style`)
  }
})

test("the forward icon uses FORWARD_SHARE_DOC, not EMAIL_SHARE_DOC", () => {
  const markup = buildIconTemplates([{ iconColor: "#000000" }])
  assert.ok(markup.includes('href="{!FORWARD_SHARE_DOC!}"'))
  assert.ok(!markup.includes("EMAIL_SHARE_DOC"))
  // The class has always said forward; keep the two in step.
  assert.ok(markup.includes('class="sd-forward"'))
})

test("href attributes contain only the merge tag", () => {
  const markup = buildIconTemplates(STYLES)
  const hrefs = [...markup.matchAll(/href="([^"]*)"/g)].map((m) => m[1])
  assert.equal(hrefs.length, SHARE_ICONS.length * STYLES.length)
  for (const href of hrefs) {
    assert.match(href, /^\{![A-Z_]+!\}$/, `unexpected href: ${href}`)
  }
})

test("icon style and size are honoured, and X swaps rounded for sharp", () => {
  const markup = buildIconTemplates([{ iconColor: "#ffffff" }], {
    iconStyle: "material-rounded",
    iconSize: "25",
  })
  assert.ok(markup.includes('width="25"'))
  assert.ok(markup.includes("/material-rounded/96/ffffff/facebook.png"))
  // X's rounded and sharp are swapped in icons8's naming.
  assert.ok(markup.includes("/material-sharp/96/ffffff/twitterx--v1.png"))
})

test("defaults apply when no options are given", () => {
  const markup = buildIconTemplates([{}])
  assert.ok(markup.includes('width="18"'))
  assert.ok(markup.includes("/material-sharp/96/000000/facebook.png"))
})

test("no styles produces no markup", () => {
  assert.equal(buildIconTemplates([]), "")
})
