'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

/**
 * Error boundary segment-level pour `/cheptel/[id]`.
 *
 * Évite le crash visuel « This page couldn't load » et affiche un message
 * lisible avec bouton « Réessayer » + lien retour vers la liste cheptel.
 *
 * Cf. .audit/DIAGNOSTIC_P0.md — Bug #1.
 */
export default function CheptelDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[cheptel/[id]] crash:', error)
  }, [error])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-9 w-9 shrink-0 text-[var(--sf-danger,#b91c1c)]" />
        <div>
          <h1
            className="font-[family-name:var(--sf-font-display)] text-2xl text-[var(--sf-ink)]"
          >
            Impossible de charger la fiche animal
          </h1>
          <p
            className="text-sm text-[var(--sf-muted)] mt-1"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            Une erreur est survenue pendant le chargement des données.
          </p>
        </div>
      </div>

      <pre className="overflow-x-auto rounded border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/40 p-3 text-xs text-[var(--sf-ink-soft)]">
        {error?.message ?? 'Erreur inconnue'}
        {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
      </pre>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--sf-line)] bg-[var(--sf-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Réessayer
        </button>
        <Link
          href="/cheptel"
          className="rounded border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-ink)] hover:bg-[var(--sf-surface-2)]/40"
        >
          Retour au cheptel
        </Link>
      </div>
    </div>
  )
}
