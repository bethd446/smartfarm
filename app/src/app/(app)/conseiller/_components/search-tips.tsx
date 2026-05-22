'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

/**
 * Smart Farm — SearchTips (C2-SCHEMA)
 * Champ recherche client qui pousse `?q=...` dans l'URL avec debounce 300 ms.
 * Le filtrage réel est server-side (`ilike` sur titre + resume + tags).
 */
export function SearchTips({ initial = '' }: { initial?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initial)
  const [, startTransition] = useTransition()

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      // Toujours revenir page 1 quand la recherche change
      params.delete('page')
      const next = params.toString()
      startTransition(() => {
        router.replace(next ? `${pathname}?${next}` : pathname)
      })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sf-muted,#5C5346)]"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Rechercher un conseil par titre, résumé ou tag…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-ink,#1a1a1a)] hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
