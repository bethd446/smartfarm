import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import {
  Scale,
  Coins,
  TrendingDown,
  Package2,
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
  const { data: consoData } = await sb
    .from('consommations_aliment')
    .select('quantite_kg, cout, date, type_aliment_id, bande_id')
    .gte('date', dateFromISO)

  const conso = (consoData ?? []) as Array<{
    quantite_kg: number | null
    cout: number | null
    date: string
    type_aliment_id: string | null
    bande_id: string | null
  }>

  const totalKg = conso.reduce((s, r) => s + Number(r.quantite_kg ?? 0), 0)
  const totalCout = conso.reduce((s, r) => s + Number(r.cout ?? 0), 0)

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
        stockJours = `${Math.round(bestJours)} j`
      }
    }
  } catch {
    stockJours = '—'
  }

  /* ---------- Rendu ---------- */
  const cards = [
    {
      icon: Scale,
      label: 'Conso 30 j',
      value: `${fmtKg(totalKg)} kg`,
      hint: 'Total distribué sur la période',
      bg: 'var(--sf-success-bg, #D6E3CC)',
      ink: 'var(--sf-success-ink, #1F3B12)',
    },
    {
      icon: Coins,
      label: 'Coût 30 j',
      value: `${fmtXof(totalCout)} FCFA`,
      hint: 'Dépenses cumulées (FCFA)',
      bg: 'var(--sf-warning-bg, #F5E0B8)',
      ink: 'var(--sf-warning-ink, #5A3E0E)',
    },
    {
      icon: TrendingDown,
      label: 'IC moyen',
      value: ic,
      hint: 'kg aliment / kg vif produit',
      bg: 'var(--sf-bg, #F5F1E8)',
      ink: 'var(--sf-ink, #1a1a1a)',
    },
    {
      icon: Package2,
      label: 'Stock j restants',
      value: stockJours,
      hint: stockMatiereNom
        ? `${stockMatiereNom} — au rythme actuel`
        : 'Matière la + critique',
      bg: 'var(--sf-bg, #F5F1E8)',
      ink: 'var(--sf-ink, #1a1a1a)',
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
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: c.ink }}
                  >
                    {c.value}
                  </div>
                  <div
                    className="eyebrow text-[11px] mt-1"
                    style={{ color: c.ink }}
                  >
                    {c.label}
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
