"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, Copy, AlertCircle, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface CSSValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface DevInformationModalProps {
  isOpen: boolean
  onClose: () => void
  onCopyCss: () => void
  onCopyHtml: () => void
  onCopyMediaQuery: () => void
  onCopyImport: () => void
  copiedCss: boolean
  copiedHtml: boolean
  copiedMediaQuery: boolean
  copiedImport: boolean
  cssValidationResult?: CSSValidationResult | null
}

export const DevInformationModal = ({
  isOpen,
  onClose,
  onCopyCss,
  onCopyHtml,
  onCopyMediaQuery,
  onCopyImport,
  copiedCss,
  copiedHtml,
  copiedMediaQuery,
  copiedImport,
  cssValidationResult,
}: DevInformationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dev Information</DialogTitle>
          <DialogDescription>Copy export options for development</DialogDescription>
        </DialogHeader>
        
        {/* CSS Validation Results */}
        {cssValidationResult && (
          <div className="space-y-3 mb-4">
            {cssValidationResult.errors && cssValidationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>CSS Errors ({cssValidationResult.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    {cssValidationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {cssValidationResult.warnings && cssValidationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>CSS Warnings ({cssValidationResult.warnings.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    {cssValidationResult.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {cssValidationResult.isValid && cssValidationResult.warnings.length === 0 && (
              <Alert>
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">CSS Valid</AlertTitle>
                <AlertDescription className="text-green-700">
                  No CSS syntax errors detected
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          <Button
            onClick={onCopyHtml}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12"
          >
            {copiedHtml ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied HTML!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Export HTML</span>
              </>
            )}
          </Button>
          <Button
            onClick={onCopyImport}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12"
          >
            {copiedImport ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied @import!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Export @import</span>
              </>
            )}
          </Button>
          <Button
            onClick={onCopyCss}
            variant="outline"
            className={`w-full flex items-center justify-center gap-2 h-12 ${
              cssValidationResult?.errors?.length ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={cssValidationResult?.errors?.length ? true : false}
          >
            {copiedCss ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied CSS!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Export CSS</span>
              </>
            )}
          </Button>
          <Button
            onClick={onCopyMediaQuery}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12"
          >
            {copiedMediaQuery ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied Media Query!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Export media query</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
