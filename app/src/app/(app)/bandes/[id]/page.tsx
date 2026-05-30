import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Layers, Users, ArrowRightLeft, Sparkles } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

import { FormattedDateTime } from '@/components/ui/formatted-date'

import { sexerBande } from './_actions'
import { DialogTransitPhase } from './_dialog-transit'

/**
 * Détail bande — CHANT-D
 * ----------------------------------------------------------------------
 * - Header : nom, code, statut, phase courante, sexée
 * - KPI : effectif total / nb M / nb F / sous-groupe M / sous-groupe F / âge
 * - Action sexer (form simple) si bande non sexée ET >= 60 j
 * - Action transit phase (Dialog client)
 * - Historique transits
 */
export default async function BandeDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = await createClient()

  const { data: bande } = await sb
    .from('v_bande_effectif')
    .select('*')
    .eq('bande_id', id)
    .single()

  if (!bande) notFound()

  const { data: transits } = await sb
    .from('transits_phase')
    .select('*')
    .eq('bande_id', id)
    .is('deleted_at', null)
    .order('date_transit', { ascending: false })

  const ageBande = Number(bande.age_bande_jours ?? 0)
  const peutEtreSexee = !bande.sexee && ageBande >= 60
  const statutLabel: Record<string, string> = {
    preparation: 'Préparation',
    active: 'Active',
    sevree: 'Sevrée',
    engraissement: 'Engraissement',
    finie: 'Finie',
  }

  const phasesOrder = [
    'post_sevrage',
    'demarrage',
    'croissance',
    'finition',
    'engraissement',
  ]
  const phasesLabel: Record<string, string> = {
    post_sevrage: 'Post-sevrage',
    demarrage: 'Démarrage',
    croissance: 'Croissance',
    finition: 'Finition',
    engraissement: 'Engraissement',
  }

  return (
    <div className="space-y-6">
      {/* Retour */}
      <div>
        <Link
          href="/bandes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--mut)] hover:text-[var(--ink)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Toutes les bandes
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 tracking-[-0.02em] text-[var(--ink)] font-[family-name:var(--disp)]">
            <Layers className="h-8 w-8 text-[var(--sage)]" />
            {bande.nom}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-[var(--mut)] flex-wrap">
            <span className="font-mono">{bande.code}</span>
            <span>·</span>
            <Badge variant="outline">
              {statutLabel[bande.statut] ?? bande.statut}
            </Badge>
            <Badge variant="outline" className="capitalize">
              Phase : {bande.phase_courante ? phasesLabel[bande.phase_courante] ?? bande.phase_courante : '—'}
            </Badge>
            <Badge variant={bande.sexee ? 'success' : 'warning'}>
              {bande.sexee ? 'Sexée' : 'Non sexée'}
            </Badge>
            <span>· {ageBande} j d&apos;âge</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {peutEtreSexee && (
            <form action={sexerBande}>
              <input type="hidden" name="bande_id" value={bande.bande_id} />
              <Button type="submit" variant="default">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Sexer cette bande
              </Button>
            </form>
          )}
          <DialogTransitPhase
            bandeId={bande.bande_id}
            phaseActuelle={bande.phase_courante}
            nbMales={Number(bande.nb_males ?? 0)}
            nbFemelles={Number(bande.nb_femelles ?? 0)}
          />
        </div>
      </div>

      {/* Bannière R22 si applicable */}
      {peutEtreSexee && (
        <div className="live warn">
          <span className="lv-ic"><Sparkles className="h-[17px] w-[17px]" /></span>
          <div>
            <b>Sexage requis</b>
            <small>
              Cette bande a plus de 60 jours et n&apos;est pas encore sexée.
              Séparer mâles et femelles évite la consanguinité (règle R22).
            </small>
          </div>
        </div>
      )}

      {/* 6 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Effectif total', value: bande.effectif_total ?? 0, accent: 'text-[var(--sage-d)]' },
          { label: 'Nb mâles', value: bande.nb_males ?? 0 },
          { label: 'Nb femelles', value: bande.nb_femelles ?? 0 },
          { label: 'Sous-groupe M', value: bande.sous_groupe_m ?? 0 },
          { label: 'Sous-groupe F', value: bande.sous_groupe_f ?? 0 },
          { label: 'Âge (jours)', value: ageBande },
        ].map((k) => (
          <div className="kpi" key={k.label}>
            <div className="k">{k.label}</div>
            <div className={`v tabular-nums ${k.accent ?? ''}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Historique transits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--disp)]">
            <ArrowRightLeft className="h-5 w-5 text-[var(--sage)]" />
            Historique des transits ({transits?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!transits || transits.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="Aucun transit enregistré"
              description="Enregistrer le passage à la phase suivante (démarrage → croissance → engraissement)."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>De → Vers</th>
                    <th className="num">M</th>
                    <th className="num">F</th>
                    <th className="num">Poids M</th>
                    <th className="num">Poids F</th>
                    <th className="num">Total kg</th>
                    <th>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {transits.map((t: any) => (
                    <tr key={t.id}>
                      <td className="font-mono">
                        <FormattedDateTime date={t.date_transit} format="date" />
                      </td>
                      <td>
                        <span className="capitalize">
                          {phasesLabel[t.phase_avant] ?? t.phase_avant}
                        </span>
                        <span className="mx-1 text-[var(--mut)]">→</span>
                        <span className="capitalize font-semibold">
                          {phasesLabel[t.phase_apres] ?? t.phase_apres}
                        </span>
                      </td>
                      <td className="num font-mono tabular-nums">{t.nb_males}</td>
                      <td className="num font-mono tabular-nums">{t.nb_femelles}</td>
                      <td className="num font-mono tabular-nums">{t.poids_moyen_m_kg ?? '—'}</td>
                      <td className="num font-mono tabular-nums">{t.poids_moyen_f_kg ?? '—'}</td>
                      <td className="num font-mono tabular-nums font-semibold">{t.poids_total_kg ?? '—'}</td>
                      <td className="text-[var(--mut)]">{t.observations ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--disp)]">
            <Users className="h-5 w-5 text-[var(--mut)]" />
            Rappel métier
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--mut)] space-y-1">
          <p>
            <strong>Sexage (≈60 j post-sevrage)</strong> : séparer mâles et
            femelles en sous-groupes pour éviter la consanguinité et adapter
            l&apos;alimentation.
          </p>
          <p>
            <strong>Transits de phase</strong> : {phasesOrder.join(' → ')}. À
            chaque transit, saisir le nombre de sujets et leur poids moyen
            (M et F séparés).
          </p>
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
  const { data } = await sb.from('bandes').select('nom,code').eq('id', id).single()
  return {
    title: data?.nom
      ? `${data.nom} — Bande — Smart Farm`
      : 'Bande',
  }
}
