'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Props = {
  date: Date | string
  /** Préfixe avant la distance (default: "il y a "). Passer "" pour désactiver. */
  prefix?: string
  /** Utiliser addSuffix de date-fns (ajoute "il y a" automatiquement). Incompatible avec prefix non vide. */
  addSuffix?: boolean
}

/**
 * Smart Farm — Composant client `<RelativeTime>`
 * -------------------------------------------------------------------------
 * Fix hydration React #418 (B2 S2). Rend une date relative locale-dépendante
 * (ex: "il y a 2 heures") UNIQUEMENT côté client après hydration → 0 mismatch.
 *
 * Usage :
 * - `<RelativeTime date={new Date()} />` → "il y a X"
 * - `<RelativeTime date={date} prefix="" addSuffix />` → "il y a X" (date-fns natif)
 * - `<RelativeTime date={date} prefix="depuis " />` → "depuis X"
 *
 * Déplacé de `app/(app)/alertes/_components/` vers `components/ui/` (S3-B2-EXT)
 * pour réutilisation globale (dashboard, sanitaire, etc.).
 */
export function RelativeTime({ date, prefix = 'il y a ', addSuffix = false }: Props) {
  const [label, setLabel] = useState<string>('')
  
  useEffect(() => {
    const d = typeof date === 'string' ? new Date(date) : date
    const distance = formatDistanceToNow(d, { 
      locale: fr,
      addSuffix: addSuffix 
    })
    setLabel(distance)
  }, [date, addSuffix])

  // Ne rend rien au SSR ni au 1er render client → 0 mismatch
  if (!label) return null
  
  // Si addSuffix=true, date-fns ajoute déjà "il y a" → ignorer prefix
  if (addSuffix) return <>{label}</>
  
  return <>{prefix}{label}</>
}
