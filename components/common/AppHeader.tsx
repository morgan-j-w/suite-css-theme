"use client"

import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  onResetSettings: () => void
  onLogout: () => void
}

export const AppHeader = ({ onResetSettings, onLogout }: AppHeaderProps) => {
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
      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
        <Button onClick={onResetSettings} variant="outline" className="bg-white text-slate-900 hover:bg-slate-100 text-xs md:text-sm py-2 md:py-2 px-4 md:px-4 w-full md:w-auto">
          Reset All Settings
        </Button>
        <Button 
          onClick={onLogout} 
          variant="outline" 
          className="text-white transition-colors text-xs md:text-sm py-2 md:py-2 px-4 md:px-4 w-full md:w-auto"
          style={{ backgroundColor: '#ec333c', borderColor: '#ec333c', color: 'white' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E7000B'
            e.currentTarget.style.borderColor = '#E7000B'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ec333c'
            e.currentTarget.style.borderColor = '#ec333c'
          }}
        >
          Logout
        </Button>
      </div>
    </header>
  )
}
