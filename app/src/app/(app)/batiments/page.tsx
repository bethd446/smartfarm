import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Plus, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bâtiments',
}

/**
 * Page liste des bâtiments.
 * Chaque carte est cliquable et mène vers /batiments/[id].
 * Affiche occupation actuelle (animaux statut='actif' présents) et taux %.
 */
export default async function BatimentsPage() {
  const sb = await createClient()
  // V2 : on évite le JOIN sur `cases` (table vide en début de cycle → certaines configs
  // RLS bloquent la query entière). On charge bâtiments + animaux séparément.
  const [{ data: batiments }, { data: animauxActifsAll }] = await Promise.all([
    sb.from('batiments').select('*').is('deleted_at', null).order('nom'),
    sb.from('animaux').select('id, tag, statut, sexe, categorie, batiment_id').eq('statut', 'actif').is('deleted_at', null),
  ])

  // Calcul occupation côté serveur (groupBy batiment_id)
  const enriched = (batiments ?? []).map((b: any) => {
    const animauxActifs = (animauxActifsAll ?? []).filter((a: any) => a.batiment_id === b.id)
    const capacite = b.capacite ?? 0
    const taux = capacite > 0 ? (animauxActifs.length / capacite) * 100 : 0
    return { ...b, animauxActifs, taux }
  })

  return (
    <div className="space-y-6">
      {/* === Header de page === */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <Building2 className="h-8 w-8 text-[var(--sf-primary)]" />
            Bâtiments
          </h1>
          <p
            className="text-sm text-[var(--sf-muted)] mt-1"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            {enriched.length} bâtiments
          </p>
        </div>
        <Button variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bâtiment
        </Button>
      </div>

      {/* === Registre bâtiments : liste dense hairline (ex-grid de cards identiques) === */}
      {enriched.length === 0 ? (
        <div className="border border-[var(--sf-line)] bg-[var(--sf-surface-1)] py-8 px-4 text-center text-sm text-[var(--sf-muted)]">
          Aucun bâtiment enregistré.
        </div>
      ) : (
        <section
          className="border-t-2"
          style={{ borderTopColor: 'var(--sf-primary)' }}
        >
          {/* En-tête de colonnes — desktop uniquement */}
          <div
            className="hidden md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_6rem_5.5rem_4.5rem_9rem_1.25rem] md:gap-3 items-end px-2 pb-2 pt-3 text-[10px] text-[var(--sf-subtle)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <span aria-hidden="true"></span>
            <span>Bâtiment</span>
            <span className="text-right">Capacité</span>
            <span className="text-right">Surface</span>
            <span className="text-right">Cases</span>
            <span className="text-right">Occupation</span>
            <span aria-hidden="true"></span>
          </div>

          <ul>
            {enriched.map((b: any, i: number) => {
              const tauxArrondi = Math.round(b.taux)
              let tauxVariant: 'success' | 'warning' | 'danger' = 'success'
              if (tauxArrondi >= 90) tauxVariant = 'danger'
              else if (tauxArrondi >= 70) tauxVariant = 'warning'

              return (
                <li key={b.id} className="border-t border-[var(--sf-line)]">
                  <Link
                    href={`/batiments/${b.id}`}
                    className="group block md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_6rem_5.5rem_4.5rem_9rem_1.25rem] md:gap-3 md:items-center min-h-[44px] px-2 py-3 transition-colors hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]"
                  >
                    {/* ---- MOBILE : bloc 2 lignes dense ---- */}
                    <div className="md:hidden">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="tabular-nums text-[var(--sf-subtle)] text-sm font-semibold shrink-0"
                          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="min-w-0 truncate text-[15px] font-semibold leading-tight text-[var(--sf-ink)] tracking-[0.01em]"
                          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                        >
                          {b.nom}
                        </span>
                        <Badge variant="outline" className="capitalize shrink-0 ml-auto">
                          {b.type}
                        </Badge>
                      </div>
                      <div className="mt-1.5 pl-7 flex items-center justify-between gap-3 text-xs text-[var(--sf-muted)]">
                        <span className="font-mono tabular-nums">
                          {b.surface_m2 ?? '—'} m² · {b.cases?.length ?? 0} cases · cap.{' '}
                          <span className="font-bold text-[var(--sf-ink)]">{b.capacite ?? '—'}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-bold tabular-nums text-sm text-[var(--sf-ink)]">
                            {b.animauxActifs.length} / {b.capacite ?? '—'}
                          </span>
                          <Badge variant={tauxVariant}>{tauxArrondi}%</Badge>
                        </span>
                      </div>
                    </div>

                    {/* ---- DESKTOP : colonnes tabulaires ---- */}
                    <span
                      className="hidden md:block tabular-nums text-[var(--sf-subtle)] text-sm font-semibold"
                      style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="hidden md:flex md:items-center md:gap-2 md:min-w-0">
                      <span
                        className="truncate text-[15px] font-semibold leading-tight text-[var(--sf-ink)] tracking-[0.01em]"
                        style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                      >
                        {b.nom}
                      </span>
                      <Badge variant="outline" className="capitalize shrink-0">
                        {b.type}
                      </Badge>
                    </div>
                    <span className="hidden md:block text-right font-mono font-bold tabular-nums text-sm text-[var(--sf-ink)]">
                      {b.capacite ?? '—'}
                    </span>
                    <span className="hidden md:block text-right font-mono tabular-nums text-sm text-[var(--sf-ink)]">
                      {b.surface_m2 ?? '—'} m²
                    </span>
                    <span className="hidden md:block text-right font-mono font-bold tabular-nums text-sm text-[var(--sf-primary)]">
                      {b.cases?.length ?? 0}
                    </span>
                    <span className="hidden md:flex md:items-center md:justify-end md:gap-2">
                      <span className="font-mono font-bold tabular-nums text-sm text-[var(--sf-ink)]">
                        {b.animauxActifs.length} / {b.capacite ?? '—'}
                      </span>
                      <Badge variant={tauxVariant}>{tauxArrondi}%</Badge>
                    </span>
                    <ChevronRight className="hidden md:block h-4 w-4 shrink-0 text-[var(--sf-subtle)] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
