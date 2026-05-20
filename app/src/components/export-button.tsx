'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  table: string
  label?: string
}

export function ExportButton({ table, label = 'Exporter CSV' }: ExportButtonProps) {
  const handleClick = () => {
    window.open(`/api/export/${table}`, '_blank', 'noopener,noreferrer')
  }
  return (
    <Button variant="outline" onClick={handleClick}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}
