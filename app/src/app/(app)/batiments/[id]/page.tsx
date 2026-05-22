import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2, ArrowLeft, Boxes } from 'lucide-react'
import type { Metadata } from 'next'

/**
 * Page détail d'un bâtiment.
 * Affiche :
 *  - Header avec nom, type, capacité, surface, retour
 *  - 4 KPI : animaux présents, capacité, taux occupation, nb cases
 *  - Liste des cases avec animaux présents (statut='actif')
 */
export default async function BatimentDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = await createClient()

  const { data: batiment } = await sb
    .from('batiments')
    .select(`
      *,
      cases(
        id, numero, capacite, type, salle_id,
        animaux(id, tag, nom, sexe, categorie, statut, date_naissance, races(nom))
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!batiment) notFound()

  // Tri cases par numero
  const cases = ((batiment.cases ?? []) as any[]).slice().sort((a, b) => {
    const na = String(a.numero ?? '')
    const nb = String(b.numero ?? '')
    return na.localeCompare(nb, undefined, { numeric: true })
  })

  const totalAnimaux = cases
    .flatMap((c: any) => c.animaux ?? [])
    .filter((a: any) => a.statut === 'actif')

  const tauxOccupation = batiment.capacite
    ? Math.round((totalAnimaux.length / batiment.capacite) * 100)
    : 0

  let tauxVariant: 'success' | 'warning' | 'danger' = 'success'
  if (tauxOccupation >= 90) tauxVariant = 'danger'
  else if (tauxOccupation >= 70) tauxVariant = 'warning'

  return (
    <div className="space-y-6">
      {/* === Retour === */}
      <div>
        <Link
          href="/batiments"
          className="inline-flex items-center gap-1 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Tous les bâtiments
        </Link>
      </div>

      {/* === Header === */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <Building2 className="h-8 w-8 text-[var(--sf-primary)]" />
            {batiment.nom}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-[var(--sf-muted)]">
            <Badge variant="outline" className="capitalize">
              {batiment.type}
            </Badge>
            <span>Capacité {batiment.capacite ?? '—'}</span>
            <span>·</span>
            <span>{batiment.surface_m2 ?? '—'} m²</span>
            <span>·</span>
            <span>{totalAnimaux.length} animaux présents</span>
          </div>
        </div>
      </div>

      {/* === 4 KPI cards === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] font-[family-name:var(--sf-font-display)]">
              Animaux présents
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-[var(--sf-ink)] mt-1">
              {totalAnimaux.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] font-[family-name:var(--sf-font-display)]">
              Capacité totale
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-[var(--sf-ink)] mt-1">
              {batiment.capacite ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] font-[family-name:var(--sf-font-display)]">
              Taux occupation
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-3xl font-bold font-mono tabular-nums text-[var(--sf-ink)]">
                {tauxOccupation}%
              </div>
              <Badge variant={tauxVariant}>
                {tauxOccupation < 70 ? 'OK' : tauxOccupation < 90 ? 'Élevé' : 'Saturé'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] font-[family-name:var(--sf-font-display)]">
              Cases
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-[var(--sf-primary)] mt-1">
              {cases.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Liste cases + animaux === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[var(--sf-primary)]" />
            Cases ({cases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cases.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aucune case configurée"
              description="Ajouter des cases pour ce bâtiment depuis les paramètres."
            />
          ) : (
            cases.map((c: any) => {
              const animauxCase = ((c.animaux ?? []) as any[]).filter(
                (a: any) => a.statut === 'actif'
              )
              const capCase = c.capacite ?? 0
              const surcharge = capCase > 0 && animauxCase.length > capCase

              return (
                <div
                  key={c.id}
                  className="border border-[var(--sf-line,rgba(0,0,0,0.08))] rounded-md p-3"
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="font-semibold text-[var(--sf-ink)]">
                      Case {c.numero}
                      {c.type && (
                        <span className="text-sm text-[var(--sf-muted)] font-normal ml-2">
                          ({c.type})
                        </span>
                      )}
                    </div>
                    <Badge variant={surcharge ? 'danger' : 'secondary'}>
                      {animauxCase.length} / {capCase || '?'}
                    </Badge>
                  </div>
                  {animauxCase.length === 0 ? (
                    <p className="text-xs text-[var(--sf-muted)] italic">Case vide</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {animauxCase.map((a: any) => (
                        <li key={a.id} className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/cheptel/${a.id}`}
                            className="font-mono hover:underline text-[var(--sf-primary)] font-semibold"
                          >
                            {a.tag}
                          </Link>
                          {a.nom && (
                            <span className="text-[var(--sf-muted)]">{a.nom}</span>
                          )}
                          <Badge variant="secondary">{a.sexe}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {a.categorie}
                          </Badge>
                          {a.races?.nom && (
                            <span className="text-xs text-[var(--sf-muted)]">
                              {a.races.nom}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sb = await createClient()
  const { data } = await sb.from('batiments').select('nom').eq('id', id).single()
  return {
    title: data?.nom ? `${data.nom} — Bâtiment — Smart Farm` : 'Bâtiment — Smart Farm',
  }
}
