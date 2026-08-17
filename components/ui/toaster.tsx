'use client'

import { AlertCircle } from 'lucide-react'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isError = props.variant === 'destructive'
        return (
          <Toast
            key={id}
            {...props}
            // The destructive variant is unreadable with this project's tokens:
            // --destructive-foreground is defined as the same colour as
            // --destructive, so it renders red text on a red background. One ink
            // for icon, title and body, matching ValidationMessage; hierarchy
            // comes from weight rather than from three shades of red.
            className={
              isError
                ? 'border-red-200 bg-red-50 text-red-700 [&>button]:text-red-700 [&>button]:opacity-60 [&>button]:hover:opacity-100'
                : undefined
            }
          >
            <div className="flex items-start gap-3">
              {isError && (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              )}
              <div className="grid gap-1">
                {title && (
                  <ToastTitle className={isError ? 'text-red-700' : undefined}>
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className={isError ? 'text-red-700 opacity-100' : undefined}>
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      {/*
        Anchored top-right rather than the shadcn default of bottom-right, so a
        validation message appears next to the Save Theme button that triggered
        it. The top padding clears the sticky app header.
      */}
      <ToastViewport className="sm:top-0 sm:bottom-auto sm:flex-col pt-20 md:pt-28 pr-4" />
    </ToastProvider>
  )
}
