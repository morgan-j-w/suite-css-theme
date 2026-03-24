"use client"

export const AppFooter = () => {
  const currentYear = new Date().getFullYear()
  const version = "1.0.0"

  return (
    <footer className="bg-slate-900 text-slate-400 py-6 px-4 md:px-8 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm">
            <p>&copy; {currentYear} Swift Digital. All rights reserved.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 text-sm">
            <a 
              href="https://swiftdigital.com.au/support" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Support & Feedback
            </a>
            <span className="text-slate-600">v{version}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
