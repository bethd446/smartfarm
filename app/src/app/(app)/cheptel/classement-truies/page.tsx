import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Trophy, PiggyBank } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * H1 — Classement reproducteur des truies (vue v_score_truie).
 *
 * - Tableau Rang | Tag | Nom | NV moy | Vitalité | Survie | Portées | Score | Action
 * - Top 3 surlignés (médailles 🥇🥈🥉)
 * - Filtre implicite : truies actives uniquement (vue déjà filtrée)
 */

type ScoreRow = {
  truie_id: string
  ferme_id: string
  tag: string
  nom: string | null
  photo_url: string | null
  nb_portees: number
  nb_sevrages: number
  nes_vivants_moyen: number | null
  vitalite: number | null
  surv_hors_ecrases: number | null
  issf_jours: number | null
  tmm_pct: number | null
  score_global: number | null
  classement: number
  total_truies_ferme: number
}

function medal(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return '—'
  return Number(n).toFixed(digits)
}

export default async function ClassementTruiesPage() {
  const sb = await createClient()

  const { data: rows } = await sb
    .from('v_score_truie')
    .select('*')
    .order('classement', { ascending: true })

  const truies = (rows ?? []) as ScoreRow[]
  const totalFerme = truies[0]?.total_truies_ferme ?? truies.length

  const eyebrowCls =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold'

  return (
    <div className="space-y-6 pb-12">
      {/* === Header === */}
      <div>
        <div className="mb-2">
          <Link
            href="/cheptel"
            className="inline-flex items-center gap-2 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour au cheptel
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)] uppercase"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              <Trophy className="h-8 w-8 text-[var(--sf-primary)]" aria-hidden />
              Classement des truies
            </h1>
            <p className="text-sm text-[var(--sf-muted)] mt-1">
              Score composite IFIP — {totalFerme} truie{totalFerme > 1 ? 's' : ''} active{totalFerme > 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>

      {/* === Détail pondération === */}
      <Card>
        <CardHeader>
          <div className={eyebrowCls}>Méthodologie du score (total 100 pts)</div>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-[var(--sf-ink)] space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <li>
              <strong>30 pts</strong> — Nés vivants moyens / portée (cible 14)
            </li>
            <li>
              <strong>20 pts</strong> — Vitalité (NV − mort-nés, cible 13)
            </li>
            <li>
              <strong>25 pts</strong> — Survie en maternité hors écrasés
            </li>
            <li>
              <strong>15 pts</strong> — ISSF (sevrage → saillie féc., bonus ≤ 8 j)
            </li>
            <li>
              <strong>10 pts</strong> — Longévité (nb portées, plafond 8)
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* === Tableau === */}
      {truies.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Aucune truie active"
          description="Le classement nécessite au moins une truie active dans le cheptel."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--sf-line)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sf-surface-2)]">
              <tr className="text-left">
                <th className={`p-3 ${eyebrowCls}`}>Rang</th>
                <th className={`p-3 ${eyebrowCls}`}>Truie</th>
                <th className={`p-3 ${eyebrowCls} text-right`}>NV moy.</th>
                <th className={`p-3 ${eyebrowCls} text-right`}>Vitalité</th>
                <th className={`p-3 ${eyebrowCls} text-right`}>Survie</th>
                <th className={`p-3 ${eyebrowCls} text-right`}>Portées</th>
                <th className={`p-3 ${eyebrowCls} text-right`}>Score</th>
                <th className={`p-3 ${eyebrowCls}`}>Fiche</th>
              </tr>
            </thead>
            <tbody>
              {truies.map((t) => {
                const m = medal(t.classement)
                const isTop = t.classement <= 3
                return (
                  <tr
                    key={t.truie_id}
                    className={
                      isTop
                        ? 'bg-[var(--sf-surface-1)] border-t border-[var(--sf-line)]'
                        : 'border-t border-[var(--sf-line)]'
                    }
                  >
                    <td className="p-3 font-mono tabular-nums font-bold text-[var(--sf-ink)]">
                      {m ? <span aria-hidden className="mr-1">{m}</span> : null}#{t.classement}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md overflow-hidden bg-[var(--sf-surface-2)] border border-[var(--sf-line)] flex items-center justify-center shrink-0">
                          {t.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.photo_url} alt={t.tag} className="object-cover h-full w-full" />
                          ) : (
                            <PiggyBank className="h-4 w-4 text-[var(--sf-muted)]" aria-hidden />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono tabular-nums font-bold text-[var(--sf-ink)]">
                            {t.tag}
                          </span>
                          {t.nom ? (
                            <span className="text-xs text-[var(--sf-muted)]">{t.nom}</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{fmt(t.nes_vivants_moyen)}</td>
                    <td className="p-3 text-right tabular-nums">{fmt(t.vitalite)}</td>
                    <td className="p-3 text-right tabular-nums">
                      {t.surv_hors_ecrases !== null
                        ? `${(Number(t.surv_hors_ecrases) * 100).toFixed(0)} %`
                        : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums">{t.nb_portees}</td>
                    <td className="p-3 text-right">
                      <Badge variant={isTop ? 'success' : 'outline'} className="font-mono tabular-nums">
                        {fmt(t.score_global)} / 100
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Link href={`/cheptel/${t.truie_id}`}>
                        <Button variant="outline" size="sm">
                          Voir fiche
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
