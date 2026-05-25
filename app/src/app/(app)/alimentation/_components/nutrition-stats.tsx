import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import {
  Scale,
  Coins,
  TrendingDown,
  Package2,
  AlertTriangle,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  KPI Dashboard alimentation                                                 */
/*  4 indicateurs sur 30 j glissants :                                         */
/*   1. Conso 30 j (kg total) — somme consommations_aliment                    */
/*   2. Coût 30 j (FCFA)      — somme cout                                     */
/*   3. IC moyen              — kg aliment / kg vif produit (si pesées dispo) */
/*   4. Stock j restants      — pour la matière la + utilisée :                */
/*                              stock_actuel / conso_moyenne_jour              */
/* -------------------------------------------------------------------------- */

function fmtKg(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}
function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export async function NutritionStats() {
  const sb = await createClient()

  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 30)
  const dateFromISO = dateFrom.toISOString().slice(0, 10)

  /* ---------- 1+2 : conso & coût 30 j ---------- */
  // FIX BUG-SC12 : colonnes réelles `qte_kg` / `formule_id` (pas
  // `quantite_kg` / `cout` / `type_aliment_id`). Le coût est dérivé via
  // `formules.cout_kg_fcfa × qte_kg`.
  const { data: consoData } = await sb
    .from('consommations_aliment')
    .select('qte_kg, date, formule_id, bande_id, formule:formule_id(cout_kg_fcfa)')
    .is('deleted_at', null)
    .gte('date', dateFromISO)

  const conso = (consoData ?? []) as unknown as Array<{
    qte_kg: number | null
    date: string
    formule_id: string | null
    bande_id: string | null
    formule: { cout_kg_fcfa: number | null } | null
  }>

  const totalKg = conso.reduce((s, r) => s + Number(r.qte_kg ?? 0), 0)
  const totalCout = conso.reduce((s, r) => {
    const c = Number(r.formule?.cout_kg_fcfa ?? 0) * Number(r.qte_kg ?? 0)
    return s + (Number.isFinite(c) ? c : 0)
  }, 0)

  /* ---------- 3 : IC = kg aliment / kg vif produit ---------- */
  // Approximation : sur les bandes concernées, différence entre les pesées
  // les + récentes et les + anciennes dans la fenêtre. Si pas de données → '—'.
  let ic: string = '—'
  try {
    const bandesIds = Array.from(
      new Set(conso.map((c) => c.bande_id).filter(Boolean)),
    ) as string[]
    if (bandesIds.length > 0) {
      const { data: pesees } = await sb
        .from('pesees')
        .select('bande_id, date_pesee, poids_kg, nb_animaux')
        .in('bande_id', bandesIds)
        .gte('date_pesee', dateFromISO)
        .order('date_pesee', { ascending: true })

      const byBande = new Map<
        string,
        Array<{ date: string; poids_total: number }>
      >()
      for (const p of (pesees ?? []) as Array<{
        bande_id: string
        date_pesee: string
        poids_kg: number
        nb_animaux: number | null
      }>) {
        const arr = byBande.get(p.bande_id) ?? []
        arr.push({
          date: p.date_pesee,
          poids_total: Number(p.poids_kg) * (p.nb_animaux ?? 1),
        })
        byBande.set(p.bande_id, arr)
      }
      let gainTotal = 0
      for (const [, arr] of byBande) {
        if (arr.length >= 2) {
          gainTotal += arr[arr.length - 1].poids_total - arr[0].poids_total
        }
      }
      if (gainTotal > 0) {
        ic = (totalKg / gainTotal).toFixed(2)
      }
    }
  } catch {
    ic = '—'
  }

  /* ---------- 4 : Stock j restants matière + utilisée ---------- */
  let stockJours: string = '—'
  let stockMatiereNom: string = ''
  let stockJoursNum: number | null = null
  try {
    // On approxime : matière la + utilisée = type_aliment_id dominant
    // (en l'absence d'un lien direct conso → matière première).
    // On regarde matieres_premieres : on prend celle avec la conso moy / j la +
    // élevée parmi les types qu'on peut matcher par nom (best effort).
    const { data: matieres } = await sb
      .from('matieres_premieres')
      .select('id, nom, stock_actuel')
      .is('deleted_at', null)

    if (matieres && matieres.length > 0 && totalKg > 0) {
      // Pas de lien direct conso ↔ matiere : on prend la matière dont le stock
      // est le + bas (proxy "à surveiller") et on calcule un nombre de jours
      // sur la conso moyenne globale / nb matières actives → indicatif.
      const consoMoyJour = totalKg / 30
      // Choix : matière dont (stock_actuel) / (consoMoyJour) est le plus bas
      // = celle qui s'épuise en premier au rythme actuel.
      let bestId: string | null = null
      let bestJours = Infinity
      for (const m of matieres as Array<{
        id: string
        nom: string
        stock_actuel: number | null
      }>) {
        const stock = Number(m.stock_actuel ?? 0)
        if (stock <= 0) continue
        // approximation : on suppose qu'une part de la conso passe par cette matière
        const j = stock / Math.max(consoMoyJour, 0.001)
        if (j < bestJours) {
          bestJours = j
          bestId = m.id
          stockMatiereNom = m.nom
        }
      }
      if (bestId && Number.isFinite(bestJours)) {
        stockJoursNum = Math.round(bestJours)
        stockJours = `${stockJoursNum} j`
      }
    }
  } catch {
    stockJours = '—'
    stockJoursNum = null
  }

  /* ---------- Seuil critique stock : < 7 j ---------- */
  const stockCritique = stockJoursNum !== null && stockJoursNum < 7

  /* ---------- Rendu ---------- */
  const cards = [
    {
      icon: Scale,
      label: 'Conso 30 j',
      value: `${fmtKg(totalKg)} kg`,
      hint: 'Total distribué sur la période',
      bg: 'var(--sf-success-bg, #D6E3CC)',
      ink: 'var(--sf-success-ink, #1F3B12)',
      critical: false,
    },
    {
      icon: Coins,
      label: 'Coût 30 j',
      value: `${fmtXof(totalCout)} FCFA`,
      hint: 'Dépenses cumulées (FCFA)',
      bg: 'var(--sf-warning-bg, #F5E0B8)',
      ink: 'var(--sf-warning-ink, #5A3E0E)',
      critical: false,
    },
    {
      icon: TrendingDown,
      label: 'IC moyen',
      value: ic,
      hint: 'kg aliment / kg vif produit',
      bg: 'var(--sf-bg, #F5F1E8)',
      ink: 'var(--sf-ink, #1a1a1a)',
      critical: false,
    },
    {
      icon: Package2,
      label: 'Stock j restants',
      value: stockJours,
      hint: stockMatiereNom
        ? `${stockMatiereNom} — au rythme actuel`
        : 'Matière la + critique',
      bg: stockCritique
        ? 'var(--sf-danger-bg, #F5D9D2)'
        : 'var(--sf-bg, #F5F1E8)',
      ink: stockCritique
        ? 'var(--sf-danger-ink, #7A2A1F)'
        : 'var(--sf-ink, #1a1a1a)',
      critical: stockCritique,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <Card
            key={i}
            style={{ background: c.bg, color: c.ink }}
            // a11y : la card stock critique signale une alerte
            {...(c.critical ? { role: 'alert', 'aria-live': 'polite' as const } : {})}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div
                    className="text-2xl font-bold tabular-nums flex items-center gap-2"
                    style={{ color: c.ink }}
                  >
                    {c.critical ? (
                      <AlertTriangle
                        className="h-5 w-5"
                        style={{ color: c.ink }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {c.value}
                  </div>
                  <div
                    className="eyebrow text-[11px] mt-1"
                    style={{ color: c.ink }}
                  >
                    {c.label}
                    {c.critical ? (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--sf-danger-ink,#7A2A1F)] text-white">
                        Stock critique
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="text-[11px] mt-2 opacity-70"
                    style={{ color: c.ink }}
                  >
                    {c.hint}
                  </div>
                </div>
                <Icon className="h-5 w-5 opacity-70" style={{ color: c.ink }} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
