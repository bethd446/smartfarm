import { createClient } from '@/lib/supabase/server'
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
/*                                                                             */
/*  D2-L2 : grille de cards hero-metric (fonds colorés) → bandeau registre     */
/*  dense (hairlines + tabular-nums), tons sémantiques portés par l'icône/     */
/*  valeur, 0 fond de card coloré. Alerte stock critique <7j préservée.        */
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

  /* ---------- Rendu : bandeau registre dense ---------- */
  const cells = [
    {
      icon: Scale,
      tone: 'var(--sf-success-ink, #1F3B12)',
      period: '30 j',
      label: 'Conso',
      value: `${fmtKg(totalKg)} kg`,
      sub: 'Total distribué',
      critical: false,
    },
    {
      icon: Coins,
      tone: 'var(--sf-warning-ink, #5A3E0E)',
      period: '30 j',
      label: 'Coût',
      value: `${fmtXof(totalCout)} FCFA`,
      sub: 'Dépenses cumulées',
      critical: false,
    },
    {
      icon: TrendingDown,
      tone: 'var(--sf-ink, #1a1a1a)',
      period: 'moyen',
      label: 'IC',
      value: ic,
      sub: 'kg aliment / kg vif',
      critical: false,
    },
    {
      icon: stockCritique ? AlertTriangle : Package2,
      tone: stockCritique ? 'var(--sf-danger-ink, #7A2A1F)' : 'var(--sf-ink, #1a1a1a)',
      period: stockCritique ? 'critique' : 'restants',
      label: 'Stock jours',
      value: stockJours,
      sub: stockMatiereNom ? `${stockMatiereNom} — au rythme actuel` : 'Matière la + critique',
      critical: stockCritique,
    },
  ]

  return (
    <section
      aria-label="Indicateurs alimentation"
      className="border-t-2 border-b border-[var(--sf-line)]"
      style={{ borderTopColor: 'var(--sf-primary)' }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map((c, i) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className={[
                'min-h-[44px] px-3 py-3 sm:px-4',
                'border-[var(--sf-line)]',
                i % 2 === 1 ? 'border-l' : '',
                'lg:border-l',
                i % 4 === 0 ? 'lg:border-l-0' : '',
                i >= 2 ? 'border-t lg:border-t-0' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              // a11y : la cellule stock critique signale une alerte
              {...(c.critical ? { role: 'alert', 'aria-live': 'polite' as const } : {})}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-4 w-4 shrink-0" style={{ color: c.tone }} />
                <span
                  className="text-[10px] uppercase tracking-[0.16em] shrink-0"
                  style={{
                    color: c.critical ? c.tone : 'var(--sf-subtle, #8A7F6D)',
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {c.period}
                </span>
              </div>
              <div
                className="mt-1.5 text-2xl font-bold tabular-nums leading-tight"
                style={{ color: c.tone }}
              >
                {c.value}
              </div>
              <div
                className="mt-1 text-[11px] uppercase tracking-[0.12em] leading-tight"
                style={{
                  color: 'var(--sf-muted, #5C5346)',
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {c.label}
              </div>
              <div
                className="mt-0.5 text-[11px] tabular-nums leading-tight line-clamp-1"
                style={{ color: 'var(--sf-subtle, #8A7F6D)' }}
              >
                {c.sub}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
