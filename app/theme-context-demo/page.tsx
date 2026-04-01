"use client"

import { useState } from "react"
import { ThemeContextPanel } from "@/components/common/ThemeContextPanel"

export default function ThemeContextPanelDemo() {
  const [themeName, setThemeName] = useState("Elegant Dark")
  const [savedTime, setSavedTime] = useState("Saved 2 mins ago")
  const [isDirty, setIsDirty] = useState(false)

  // Simulate auto-save on name change
  const handleThemeNameChange = (name: string) => {
    setThemeName(name)
    setIsDirty(true)
    setSavedTime("Changed just now...")
    // Simulate save after 2 seconds
    setTimeout(() => {
      setSavedTime("Saved just now")
      setIsDirty(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Theme Context Panel Demo</h1>

        {/* Panel Demo */}
        <ThemeContextPanel
          themeName={themeName}
          onThemeNameChange={handleThemeNameChange}
          savedTimeAgo={savedTime}
          usedInDocuments={8}
          isDirty={isDirty}
        />

        {/* Instructions */}
        <div className="mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Interactions</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <strong className="text-slate-900">Click the theme name</strong> to inline edit it
              </li>
              <li>
                <strong className="text-slate-900">Press Enter or click away</strong> to save changes
              </li>
              <li>
                <strong className="text-slate-900">Press Escape</strong> to cancel editing
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Design Features</h2>
            <ul className="space-y-2 text-sm text-blue-900">
              <li>✨ Clean, minimal design</li>
              <li>✨ Large, bold theme name with inline editing</li>
              <li>✨ Status line shows usage and save state</li>
              <li>✨ Amber dot indicator for unsaved changes</li>
              <li>✨ Shows clean "Saved just now" when synced</li>
              <li>✨ Responsive layout</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
