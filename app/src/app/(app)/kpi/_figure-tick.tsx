'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Number-tick de la figure dominante (grammaire Stat-Led).
 * Compte de 0 vers la cible sur ~500 ms à l'apparition, easing out.
 * Respecte prefers-reduced-motion (affiche la valeur finale, pas de tick).
 * Server-safe value : on rend la valeur finale au premier paint pour 0 CLS / SSR.
 */
export function FigureTick({
  value,
  digits = 1,
  className,
  style,
}: {
  value: number | null
  digits?: number
  className?: string
  style?: React.CSSProperties
}) {
  const target = value
  const [display, setDisplay] = useState<number | null>(target)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current || target === null) return
    ran.current = true

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setDisplay(target)
      return
    }

    const duration = 500
    const start = performance.now()
    let raf = 0
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplay(target * ease(t))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    setDisplay(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <span className={className} style={style}>
      {display === null ? '—' : display.toFixed(digits)}
    </span>
  )
}
