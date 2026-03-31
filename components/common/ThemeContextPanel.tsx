"use client"

import { useState } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ThemeContextPanelProps {
  themeName?: string
  onThemeNameChange?: (name: string) => void
  savedTimeAgo?: string
  usedInTemplates?: number
  isDirty?: boolean
  onDirtyStateChange?: (dirty: boolean) => void
}

export const ThemeContextPanel = ({
  themeName = "Untitled Theme",
  onThemeNameChange,
  savedTimeAgo = "Saved 2 mins ago",
  usedInTemplates = 12,
  isDirty = false,
  onDirtyStateChange,
}: ThemeContextPanelProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(themeName)
  const [localDirty, setLocalDirty] = useState(isDirty)

  const handleSaveName = () => {
    if (editValue.trim()) {
      onThemeNameChange?.(editValue.trim())
    } else {
      setEditValue(themeName)
    }
    setIsEditing(false)
  }

  const handleTestDirtyState = () => {
    const newState = !localDirty
    setLocalDirty(newState)
    onDirtyStateChange?.(newState)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      {/* Theme Name Section */}
      <div className="mb-5">
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
            className="text-2xl font-bold text-slate-900 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-2 py-1 -mx-2"
            title="Click to rename"
          >
            {themeName}
          </button>
        )}
      </div>

      {/* Metadata Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* Saved Status */}
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-sm text-slate-600">{savedTimeAgo}</span>
        </div>

        {/* Usage Count */}
        <div className="text-sm text-slate-600">
          Used in <span className="font-medium text-slate-900">{usedInTemplates}</span> template{usedInTemplates !== 1 ? "s" : ""}
        </div>

        {/* Dirty State Indicator */}
        {localDirty && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-sm text-slate-600">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Demo Button */}
      <button
        onClick={handleTestDirtyState}
        className="mt-4 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
      >
        Toggle Dirty State (Demo)
      </button>
    </div>
  )
}
