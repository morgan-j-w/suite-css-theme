"use client"

import { Button } from "@/components/ui/button"
import { Loader, Check } from "lucide-react"
import { useState, useEffect } from "react"

interface AppHeaderProps {
  onSaveTheme: () => void
  onExit: () => void
  hasUnsavedChanges?: boolean
  isSaving?: boolean
}

export const AppHeader = ({ onSaveTheme, onExit, hasUnsavedChanges, isSaving }: AppHeaderProps) => {
  const [showSavedConfirm, setShowSavedConfirm] = useState(false)

  const handleSaveClick = () => {
    onSaveTheme()
    // Show confirmation after save completes
    setTimeout(() => {
      if (!isSaving) {
        setShowSavedConfirm(true)
        setTimeout(() => setShowSavedConfirm(false), 3000)
      }
    }, 600)
  }

  return (
    <header className="text-white shadow-lg p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-4" style={{ backgroundColor: "#21292C" }}>
      <div className="flex items-center gap-2 md:gap-4">
        <a href="https://swiftdigital.com.au/" target="_blank" rel="noopener noreferrer" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src="https://prod-swiftdigital-staticassets.s3-ap-southeast-2.amazonaws.com/sd_images/zzzz5705ed8cb762d381zzzz6836acb89a771304" 
            alt="Swift Digital Logo"
            className="h-8 md:h-12 w-auto"
          />
        </a>
        <h1 className="text-lg md:text-3xl font-bold">CSS Theme Generator</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
        <Button 
          onClick={onExit} 
          variant="outline" 
          className="text-slate-700 hover:bg-slate-50 text-xs md:text-sm py-2 md:py-2 px-4 md:px-4 w-full md:w-auto bg-white border-slate-300 disabled:opacity-50"
          disabled={isSaving}
        >
          Exit to Theme Dashboard
        </Button>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            onClick={handleSaveClick} 
            className="text-white text-xs md:text-sm py-2 md:py-2 px-4 md:px-4 flex-1 md:flex-none disabled:opacity-50 flex items-center justify-center gap-2" 
            style={{ backgroundColor: '#EC2076' }} 
            onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#d41864')} 
            onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#EC2076')}
            disabled={isSaving}
          >
            {isSaving && <Loader className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Theme'}
          </Button>
          {showSavedConfirm && (
            <div className="flex items-center gap-1 text-green-600 font-medium text-xs md:text-sm whitespace-nowrap animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in forwards;
        }
      `}</style>
    </header>
  )
}
