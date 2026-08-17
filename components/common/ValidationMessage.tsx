import { AlertCircle } from "lucide-react"

/**
 * The standard validation error shown next to the fields it refers to.
 *
 * Deliberately mirrors the destructive toast in components/ui/toaster.tsx: same
 * icon, palette and text treatment, so the two error surfaces read as one
 * system. The toast is for an action that was refused; this is for a problem
 * that persists until the user fixes it.
 *
 * Renders nothing when there is no message.
 */
export const ValidationMessage = ({
  message,
  title,
}: {
  message?: string
  title?: string
}) => {
  if (!message) return null

  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold text-red-800">{title}</p>}
        <p className="text-sm font-medium text-red-700">{message}</p>
      </div>
    </div>
  )
}
