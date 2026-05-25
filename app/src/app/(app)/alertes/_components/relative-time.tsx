'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function RelativeTime({ date }: { date: Date }) {
  const [label, setLabel] = useState<string>('')
  useEffect(() => {
    setLabel(formatDistanceToNow(date, { locale: fr }))
  }, [date])
  // Ne rend rien au SSR ni au 1er render client → 0 mismatch
  return label ? <>il y a {label}</> : null
}
