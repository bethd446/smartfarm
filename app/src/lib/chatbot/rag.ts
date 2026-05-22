import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Smart Farm — Snapshot ferme pour le system prompt du chatbot.
 *
 * Récupère un état compact de la ferme à injecter dans le system prompt
 * (~800 tokens max). Format texte structuré.
 *
 * Tolérant aux erreurs : si une requête échoue (table absente, vue manquante),
 * on retourne une section vide plutôt que de casser le chat.
 *
 * P0-3 (defense-in-depth) : toutes les queries filtrent explicitement sur
 * DEMO_FERME_ID. La RLS Supabase ferait déjà le travail en prod multi-tenant,
 * mais en V1 single-tenant on veut être sûr de ne pas exposer des données
 * d'une autre ferme par accident si jamais la base était mutualisée.
 */

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

export async function getContexteFerme(
  supabase: SupabaseClient
): Promise<string> {
  const [animauxRes, bandesRes, alertesRes, stockRes] = await Promise.all([
    supabase
      .from('animaux')
      .select('id', { count: 'exact', head: true })
      .eq('ferme_id', DEMO_FERME_ID)
      .neq('statut', 'mort'),
    supabase
      .from('bandes')
      .select('id, code, nom')
      .eq('ferme_id', DEMO_FERME_ID)
      .eq('statut', 'active')
      .is('deleted_at', null),
    supabase
      .from('v_alertes_actives')
      .select('gravite, titre')
      .eq('ferme_id', DEMO_FERME_ID)
      .limit(10),
    supabase
      .from('matieres_premieres')
      .select('nom, stock_actuel, seuil_alerte')
      .eq('ferme_id', DEMO_FERME_ID)
      .not('seuil_alerte', 'is', null)
      .is('deleted_at', null)
      .limit(50),
  ])

  const nbAnimaux = animauxRes.count ?? 0
  const bandes = bandesRes.data ?? []
  const alertes = alertesRes.data ?? []
  const stocksCritiques = (stockRes.data ?? []).filter(
    (s) =>
      s.stock_actuel != null &&
      s.seuil_alerte != null &&
      Number(s.stock_actuel) < Number(s.seuil_alerte)
  )

  const bandesStr =
    bandes.length > 0
      ? bandes.map((b) => b.code ?? b.nom).join(', ')
      : 'aucune bande active'

  const alertesCount = alertes.length
  const alertesTop = alertes
    .slice(0, 5)
    .map((a) => `[${a.gravite}] ${a.titre}`)
    .join('\n  - ')

  const stocksStr =
    stocksCritiques.length > 0
      ? stocksCritiques
          .slice(0, 5)
          .map((s) => `${s.nom} (${s.stock_actuel}/${s.seuil_alerte})`)
          .join(', ')
      : 'aucun'

  return `## État de la ferme (snapshot temps réel)

Cheptel : ${nbAnimaux} animaux actifs
Bandes actives : ${bandesStr}
Alertes en cours : ${alertesCount}${alertesTop ? `\n  - ${alertesTop}` : ''}
Stocks critiques (en dessous du seuil) : ${stocksStr}
`
}
