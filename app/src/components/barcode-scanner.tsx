'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScanLine, X } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ open, onOpenChange, onScan }: Props) {
  const containerId = 'sf-barcode-reader'
  const scannerRef = useRef<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStarting(true)
    setError(null)

    ;(async () => {
      try {
        const mod = await import('html5-qrcode')
        if (cancelled) return
        const { Html5Qrcode } = mod
        const instance = new Html5Qrcode(containerId)
        scannerRef.current = instance
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => {
            onScan(decoded)
            void stop()
            onOpenChange(false)
          },
          () => {},
        )
        setStarting(false)
      } catch (e) {
        setStarting(false)
        setError(e instanceof Error ? e.message : 'Impossible d\u2019accéder à la caméra')
      }
    })()

    async function stop() {
      const inst = scannerRef.current as { stop?: () => Promise<void>; clear?: () => void } | null
      if (!inst) return
      try {
        await inst.stop?.()
        inst.clear?.()
      } catch {
        /* noop */
      }
      scannerRef.current = null
    }

    return () => {
      cancelled = true
      void stop()
    }
  }, [open, onOpenChange, onScan])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[var(--sf-primary,#2D4A1F)]" />
            Scanner code-barres / QR
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div
            id={containerId}
            className="w-full aspect-square bg-[var(--sf-ink,#1C1917)] rounded-lg overflow-hidden flex items-center justify-center text-[var(--sf-muted,#5C5346)] text-sm"
          >
            {starting && 'Initialisation de la caméra…'}
          </div>
          {error && (
            <div className="text-sm text-[var(--sf-danger-ink,#5A1F19)] bg-[var(--sf-danger-bg,#F4CCC8)] border border-[var(--sf-danger-border,#E29A92)] rounded-md p-3">
              {error}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
