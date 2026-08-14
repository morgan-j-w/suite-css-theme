/**
 * The single source of truth for font weight options.
 *
 * Step 3 and Step 4 previously carried their own lists — Step 4 offered only
 * 300-800 with different labels — so the two drifted apart (issue #71). Both
 * now render from here.
 */
export interface FontWeightOption {
  value: string
  label: string
}

export const FONT_WEIGHT_OPTIONS: FontWeightOption[] = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra bold" },
  { value: "900", label: "Black" },
]

const LABELS_BY_VALUE = new Map(FONT_WEIGHT_OPTIONS.map((o) => [o.value, o.label]))

/**
 * Every weight Step 4 used to offer (300-800) is present above, so themes saved
 * against the old list still resolve — only the labels shown changed. An
 * unrecognised value is echoed back rather than dropped.
 */
export const getFontWeightLabel = (value: string | undefined): string =>
  LABELS_BY_VALUE.get(value ?? "") ?? value ?? ""
