'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  table: string
  label?: string
}

export function ExportButton({ table, label = 'Exporter CSV' }: ExportButtonProps) {
  const handleClick = () => {
    const token = process.env.NEXT_PUBLIC_DEMO_API_TOKEN ?? ''
    const qs = token ? `?token=${encodeURIComponent(token)}` : ''
    window.open(`/api/export/${table}${qs}`, '_blank', 'noopener,noreferrer')
  }
  return (
    <Button variant="outline" onClick={handleClick}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}
