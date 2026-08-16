/**
 * The standard validation error block used across the wizard.
 *
 * The same markup was repeated inline at each call site; QA supplied it again
 * for the Import colours error in issue #21, so it lives here now.
 * Renders nothing when there is no message.
 */
export const ValidationMessage = ({ message }: { message?: string }) => {
  if (!message) return null

  return (
    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm font-medium text-red-700">{message}</p>
    </div>
  )
}
