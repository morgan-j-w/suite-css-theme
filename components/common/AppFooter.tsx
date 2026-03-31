"use client"

export const AppFooter = () => {
  const currentYear = new Date().getFullYear()
  const version = "1.0.0"

  return (
    <footer className="py-6 px-4 md:px-8 border-t" style={{ backgroundColor: '#21292C' }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm" style={{ color: '#9baec6' }}>
          <p>&copy; {currentYear} Swift Digital. All rights reserved.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 text-sm">
          <span style={{ color: '#9baec6' }}>v{version}</span>
        </div>
      </div>
    </footer>
  )
}
