"use client"

import { useState } from "react"
import { Check, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ThemeContextPanelProps {
  themeName?: string
  onThemeNameChange?: (name: string) => void
  usedInTemplates?: number
  isDirty?: boolean
  savedTimeAgo?: string
}

export const ThemeContextPanel = ({
  themeName = "Untitled Theme",
  onThemeNameChange,
  usedInTemplates = 12,
  isDirty = false,
  savedTimeAgo = "Saved 2 mins ago",
}: ThemeContextPanelProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(themeName)

  const handleSaveName = () => {
    if (editValue.trim()) {
      onThemeNameChange?.(editValue.trim())
    } else {
      setEditValue(themeName)
    }
    setIsEditing(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      {/* Theme Name and Metadata Row */}
      <div className="flex items-center justify-between gap-6">
        {/* Theme Name Section */}
        <div>
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") {
                    setEditValue(themeName)
                    setIsEditing(false)
                  }
                }}
                onBlur={handleSaveName}
                className="text-lg font-bold bg-white"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setEditValue(themeName)
                setIsEditing(true)
              }}
              className="group flex items-center gap-2 text-2xl font-bold text-slate-900 hover:text-slate-700 rounded-lg px-3 py-2 -mx-3 transition-all hover:bg-slate-100"
              title="Click to rename"
            >
              {themeName}
              <Pencil className="h-5 w-5 text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          )}
        </div>

        {/* Metadata Row - Right Aligned */}
        <div className="flex items-center gap-3">
          {/* Usage Pill */}
          <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-full">
            Used in <span className="ml-1 font-semibold text-slate-900">{usedInTemplates}</span> template{usedInTemplates !== 1 ? "s" : ""}
          </span>

          {/* Status Pill */}
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600" />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
              <Check className="h-3.5 w-3.5" />
              {savedTimeAgo}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
