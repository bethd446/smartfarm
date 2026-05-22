'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { exportKpiPDF } from './_actions-pdf'

/**
 * Bouton d'export PDF mensuel KPI.
 * Génère côté serveur via weasyprint puis trigger download client.
 */
export function ExportPdfButton() {
  const [pending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      try {
        const result = await exportKpiPDF()
        // Convertit base64 → Blob → download
        const binary = atob(result.base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error('Erreur export PDF:', e)
        alert('Erreur lors de la génération du PDF. Réessaye dans un instant.')
      }
    })
  }

  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      variant="outline"
      className="min-h-[44px]"
    >
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Génération…</>
      ) : (
        <><Download className="h-4 w-4 mr-2" />Exporter PDF mensuel</>
      )}
    </Button>
  )
}
