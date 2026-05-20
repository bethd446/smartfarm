'use client'

import { useEffect, useState } from 'react'
import { Contrast } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'sf-contrast'

export function ContrastToggle() {
  const [high, setHigh] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const initial = stored === 'high'
    setHigh(initial)
    if (initial) document.documentElement.setAttribute('data-contrast', 'high')
  }, [])

  const toggle = () => {
    const next = !high
    setHigh(next)
    if (next) {
      document.documentElement.setAttribute('data-contrast', 'high')
      window.localStorage.setItem(STORAGE_KEY, 'high')
    } else {
      document.documentElement.removeAttribute('data-contrast')
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={high}
      aria-label="Basculer le mode haut contraste"
      className={cn(
        'w-full flex items-center gap-3 px-3 h-12 rounded-md text-base transition-colors',
        high
          ? 'bg-amber-500 text-slate-900 font-semibold shadow-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      )}
    >
      <Contrast className="h-5 w-5 shrink-0" />
      <span>{high ? 'Contraste élevé' : 'Mode haut contraste'}</span>
    </button>
  )
}
