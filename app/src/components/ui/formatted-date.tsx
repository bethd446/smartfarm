'use client'
import { useEffect, useState } from 'react'
import { formatDateCivile } from '@/lib/format/dates'

type Props = {
  date: string | Date
  /** Date civile (JJ/MM/AAAA), format court (dd/MM/yy HH:mm) ou complet (toLocaleString) */
  format?: 'date' | 'short' | 'long'
}

/**
 * Smart Farm — Composant client `<FormattedDateTime>`
 * -------------------------------------------------------------------------
 * Fix hydration React (B2-EXT S3). Rend une date formatée locale-dépendante
 * UNIQUEMENT côté client après hydration → 0 mismatch.
 *
 * Usage :
 * - `<FormattedDateTime date={date} />` → "01/05/26 14:30"
 * - `<FormattedDateTime date={date} format="long" />` → "1 mai 2026 à 14:30:00"
 *
 * Pattern identique à `<RelativeTime>` mais pour dates absolues (pas relatives).
 */
export function FormattedDateTime({ date, format = 'short' }: Props) {
  const [label, setLabel] = useState<string>('')
  
  useEffect(() => {
    const d = typeof date === 'string' ? new Date(date) : date
    if (format === 'date') {
      setLabel(formatDateCivile(d))
    } else if (format === 'short') {
      setLabel(d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }))
    } else {
      setLabel(d.toLocaleString('fr-FR'))
    }
  }, [date, format])

  // Ne rend rien au SSR ni au 1er render client → 0 mismatch
  return label ? <>{label}</> : null
}
