"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, Copy } from "lucide-react"

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
}: DevInformationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dev Information</DialogTitle>
          <DialogDescription>Copy export options for development</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <Button
            onClick={onCopyCss}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12"
          >
            {copiedCss ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied CSS!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy CSS</span>
              </>
            )}
          </Button>
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
                <span>Copy HTML</span>
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
                <span>Copy Media Query</span>
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
                <span>Copy @import</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
