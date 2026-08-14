"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { formatFontForCSS } from "@/lib/utils/helpers"

/**
 * Shared inputs for the Advanced Theme Designer wizard.
 *
 * Both fields exist to solve the same problem: every field in the wizard renders
 * through a `value || fallback` chain, so an empty string is falsy and the
 * fallback is substituted the instant the user clears the box. The field can
 * never hold "empty", which makes replacing a value impossible without partial
 * edits. Each field below keeps the in-progress text in local draft state so
 * empty is representable while typing, and only reapplies the default on blur.
 */

type DraftState = string | null

const useDraft = (value: string) => {
  const [draft, setDraft] = React.useState<DraftState>(null)
  // While the user is typing, `draft` wins. Once committed it is dropped and
  // the parent-controlled `value` takes over again.
  return { shown: draft ?? value, draft, setDraft }
}

const clampToMin = (raw: string, min: number): string => {
  if (raw === "") return ""
  const parsed = Number(raw)
  // A lone "-" or other partial input parses as NaN; treat it as empty so the
  // field stays clearable rather than snapping back.
  if (Number.isNaN(parsed)) return ""
  if (parsed < min) return String(min)
  // Return the raw text, not the parsed number, so "07" or "1." survive typing.
  return raw
}

type NumberFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "min"
> & {
  /** Display value, already stripped of any unit by the caller. */
  value: string
  /** Restored on blur when the field is left empty. */
  fallback: string
  /** Receives the display value; the caller reapplies its own unit suffix. */
  onValueChange: (next: string) => void
  min?: number
}

export function NumberField({
  value,
  fallback,
  onValueChange,
  min = 0,
  onBlur,
  ...props
}: NumberFieldProps) {
  const { shown, draft, setDraft } = useDraft(value)

  return (
    <Input
      {...props}
      type="number"
      min={min}
      value={shown}
      onChange={(e) => {
        const next = clampToMin(e.target.value, min)
        setDraft(next)
        // Don't push an empty value up: the parent's fallback chain would
        // immediately echo a default back down. The last good value stays in
        // state so the CSS preview never sees a half-typed field.
        if (next !== "") onValueChange(next)
      }}
      onBlur={(e) => {
        const committed = draft === null || draft.trim() === "" ? fallback : draft
        setDraft(null)
        onValueChange(committed)
        onBlur?.(e)
      }}
    />
  )
}

type FontFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> & {
  value: string
  /** Restored on blur when the field is left empty. */
  fallback: string
  onValueChange: (next: string) => void
}

export function FontField({
  value,
  fallback,
  onValueChange,
  onBlur,
  ...props
}: FontFieldProps) {
  const { shown, draft, setDraft } = useDraft(value)

  return (
    <Input
      {...props}
      value={shown}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        if (next.trim() !== "") onValueChange(next)
      }}
      onBlur={(e) => {
        const committed = draft === null || draft.trim() === "" ? fallback : draft
        setDraft(null)
        onValueChange(formatFontForCSS(committed))
        onBlur?.(e)
      }}
    />
  )
}
