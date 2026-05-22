import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bâtiments — Smart Farm',
}

/**
 * Page liste des bâtiments.
 * Chaque carte est cliquable et mène vers /batiments/[id].
 * Affiche occupation actuelle (animaux statut='actif' présents) et taux %.
 */
export default async function BatimentsPage() {
  const sb = await createClient()
  const { data: batiments } = await sb
    .from('batiments')
    .select(`
      *,
      cases(id, numero, capacite, type, animaux(id, tag, statut, sexe, categorie))
    `)
    .order('nom')

  // Calcul occupation côté serveur
  const enriched = (batiments ?? []).map((b: any) => {
    const animauxActifs = (b.cases ?? [])
      .flatMap((c: any) => c.animaux ?? [])
      .filter((a: any) => a.statut === 'actif')
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

      {/* === Grid cards cliquables === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enriched.map((b: any) => {
          const tauxArrondi = Math.round(b.taux)
          // Variant badge selon taux
          let tauxVariant: 'success' | 'warning' | 'danger' = 'success'
          if (tauxArrondi >= 90) tauxVariant = 'danger'
          else if (tauxArrondi >= 70) tauxVariant = 'warning'

          return (
            <Link
              key={b.id}
              href={`/batiments/${b.id}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] rounded-md"
            >
              <Card className="hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.02))] transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{b.nom}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {b.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--sf-muted)]">Capacité</span>
                    <span className="font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                      {b.capacite ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--sf-muted)]">Surface</span>
                    <span className="font-mono tabular-nums text-[var(--sf-ink)]">
                      {b.surface_m2 ?? '—'} m²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--sf-muted)]">Cases</span>
                    <span className="font-mono font-bold tabular-nums text-[var(--sf-primary)]">
                      {b.cases?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--sf-line,rgba(0,0,0,0.08))]">
                    <span className="text-[var(--sf-muted)]">Occupation</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                        {b.animauxActifs.length} / {b.capacite ?? '—'}
                      </span>
                      <Badge variant={tauxVariant}>{tauxArrondi}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {enriched.length === 0 && (
          <div className="col-span-full text-sm text-[var(--sf-muted)] py-6 text-center">
            Aucun bâtiment enregistré.
          </div>
        )}
      </div>
    </div>
  )
}
