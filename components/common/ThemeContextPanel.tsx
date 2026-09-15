"use client"

import { useState } from "react"
import { Check, Pencil, Mail, Monitor } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  sanitiseThemeName,
  THEME_NAME_MAX_LENGTH,
  DEFAULT_THEME_TYPE,
  type ThemeType,
} from "@/lib/validators/theme-validator"

/**
 * Badge appearance per theme type. Label, icon and colours all come from this
 * one lookup, keyed by the same strings the generators compare against, so the
 * badge cannot describe one theme type while the output is built for the other.
 *
 * Violet and blue are used rather than green so the type badge cannot be
 * mistaken for the emerald "Saved" status pill sitting beside it.
 *
 * `satisfies` is what keeps this honest: adding a third theme type to
 * THEME_TYPES fails to compile until its badge is defined here.
 */
const THEME_TYPE_BADGE = {
  composer: {
    label: "Email Composer",
    Icon: Mail,
    className: "text-violet-700 bg-violet-100",
  },
  events: {
    label: "Landing Pages and Events Desk",
    Icon: Monitor,
    className: "text-blue-700 bg-blue-100",
  },
} as const satisfies Record<ThemeType, { label: string; Icon: typeof Mail; className: string }>

interface ThemeContextPanelProps {
  themeName?: string
  onThemeNameChange?: (name: string) => void
  isDirty?: boolean
  savedTimeAgo?: string
  themeType?: ThemeType
}

export const ThemeContextPanel = ({
  themeName = "Untitled Theme",
  onThemeNameChange,
  isDirty = false,
  savedTimeAgo = "Saved 2 mins ago",
  themeType = DEFAULT_THEME_TYPE,
}: ThemeContextPanelProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(themeName)

  // The fallback covers a value arriving from untyped JavaScript, so the badge
  // degrades to composer exactly as the generators do.
  const badge = THEME_TYPE_BADGE[themeType] ?? THEME_TYPE_BADGE[DEFAULT_THEME_TYPE]

  const handleSaveName = () => {
    // Sanitised again on commit: maxLength caps typing but not every paste path,
    // and a name restored from storage may predate this rule.
    const cleaned = sanitiseThemeName(editValue).trim()
    if (cleaned) {
      onThemeNameChange?.(cleaned)
    } else {
      setEditValue(themeName)
    }
    setIsEditing(false)
  }

  return (
    <div className="bg-white border border-slate-200 p-6 shadow-sm">
      {/* Theme Name and Metadata Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
        {/* Theme Name Section. min-w-0 lets it shrink instead of squeezing the
            badges beside it, which is what forced the type badge to wrap. */}
        <div className="min-w-0 lg:flex-1">
          {isEditing ? (
            <div className="flex gap-2 items-center w-full">
              <Input
                value={editValue}
                maxLength={THEME_NAME_MAX_LENGTH}
                onChange={(e) => setEditValue(sanitiseThemeName(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") {
                    setEditValue(themeName)
                    setIsEditing(false)
                  }
                }}
                onBlur={handleSaveName}
                className="text-lg font-bold bg-white min-w-96"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setEditValue(themeName)
                setIsEditing(true)
              }}
              className="group flex items-start gap-2 w-full text-left text-2xl font-bold text-slate-900 hover:text-slate-700 rounded-lg px-3 py-2 -mx-3 transition-all hover:bg-slate-100"
              title="Click to rename"
            >
              {/* text-left is load-bearing: a button centres its text by
                  default, which only shows once a name is long enough to wrap. */}
              <span className="min-w-0 break-words">{themeName}</span>
              <Pencil className="h-5 w-5 shrink-0 mt-1 text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          )}
        </div>

        {/* Metadata Row - Right Aligned */}
        {/* shrink-0 keeps the badges at their natural width however long the
            name is; without it they are compressed until their labels wrap. */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:shrink-0 lg:justify-end">
          {/* Theme Type Badge, resolved through THEME_TYPE_BADGE above. */}
          {themeType && (
            <span
              className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${badge.className}`}
            >
              <badge.Icon className="h-3.5 w-3.5" />
              {badge.label}
            </span>
          )}
          {/* Status Pill */}
          {isDirty ? (
            <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600" />
              Unsaved changes
            </span>
          ) : savedTimeAgo ? (
            <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
              <Check className="h-3.5 w-3.5" />
              {savedTimeAgo}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
