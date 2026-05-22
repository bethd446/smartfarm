'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { exportTableCsv } from '@/lib/exports/server-actions'

interface ExportButtonProps {
  table: string
  label?: string
}

/**
 * R7-P1 V1 — ExportButton via Server Action (plus de token client-side).
 *
 * Le CSV est généré côté serveur (service_role) et retourné en base64.
 * Le client convertit en Blob et déclenche le download natif.
 */
export function ExportButton({ table, label = 'Exporter CSV' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await exportTableCsv(table)
      if (!res.ok) {
        toast.error('Export impossible', { description: res.error })
        return
      }
      // Décode base64 → Blob → download
      const binary = atob(res.base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: res.contentType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error('Erreur export', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      <Download className="h-4 w-4 mr-2" />
      {loading ? 'Export…' : label}
    </Button>
  )
}
