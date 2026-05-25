'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AnimalResult {
  id: string
  tag: string
  nom: string | null
  categorie: string
  stade: string | null
  batiment_nom: string | null
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnimalResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Raccourci clavier Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        document.getElementById('global-search-input')?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Debounce recherche
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const handler = setTimeout(async () => {
      const sb = createClient()
      const { data, error } = await sb.rpc('search_animaux_by_tag', { query: query.trim() })
      if (!error && data) setResults(data as AnimalResult[])
      setLoading(false)
    }, 200)
    return () => clearTimeout(handler)
  }, [query])

  const handleSelect = (id: string) => {
    router.push(`/cheptel/${id}`)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Champ desktop (sticky top-bar) */}
      <div className="relative w-full max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sf-muted)]" />
        <input
          id="global-search-input"
          type="search"
          placeholder="Rechercher une boucle… (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="h-10 w-full rounded-md border border-[var(--sf-line)] bg-[var(--sf-surface-1)] pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30"
          aria-label="Rechercher un animal par boucle"
        />
        {open && (results.length > 0 || loading) && (
          <ResultsList results={results} loading={loading} onSelect={handleSelect} onClose={() => setOpen(false)} />
        )}
      </div>

      {/* Icône mobile (toggle overlay) */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-[var(--sf-surface-2)]"
        aria-label="Rechercher"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-[var(--sf-surface-1)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              autoFocus
              type="search"
              placeholder="Tag ou nom…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 flex-1 rounded-md border border-[var(--sf-line)] px-3"
            />
            <button onClick={() => { setOpen(false); setQuery('') }} className="h-11 w-11 inline-flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <ResultsList results={results} loading={loading} onSelect={handleSelect} mobile />
        </div>
      )}
    </>
  )
}

function ResultsList({ results, loading, onSelect, onClose, mobile }: {
  results: AnimalResult[]
  loading: boolean
  onSelect: (id: string) => void
  onClose?: () => void
  mobile?: boolean
}) {
  if (loading) return <div className={mobile ? "py-8 text-center" : "absolute top-full mt-1 w-full bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-md p-3 shadow-lg z-50"}>Recherche…</div>
  if (results.length === 0) return <div className={mobile ? "py-8 text-center text-[var(--sf-muted)]" : "absolute top-full mt-1 w-full bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-md p-3 shadow-lg z-50 text-[var(--sf-muted)] text-sm"}>Aucun résultat</div>
  return (
    <ul className={mobile ? "space-y-1" : "absolute top-full mt-1 w-full bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"}>
      {results.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => onSelect(r.id)}
            className="w-full text-left p-3 hover:bg-[var(--sf-surface-2)] flex items-center gap-3 min-h-11"
          >
            <span className="font-mono font-bold tabular-nums">{r.tag}</span>
            {r.nom && <span className="text-[var(--sf-muted)]">{r.nom}</span>}
            <span className="ml-auto text-xs text-[var(--sf-muted)] capitalize">{r.categorie}</span>
            {r.batiment_nom && <span className="text-xs text-[var(--sf-muted)]">{r.batiment_nom}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
