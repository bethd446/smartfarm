import type { SupabaseClient } from '@supabase/supabase-js'
import { getFermeId } from '@/lib/supabase/ferme-context'

/**
 * Smart Farm — Snapshot ferme pour le system prompt du chatbot.
 *
 * Récupère un état compact de la ferme à injecter dans le system prompt
 * (~800 tokens max). Format texte structuré.
 *
 * Tolérant aux erreurs : si une requête échoue (table absente, vue manquante),
 * on retourne une section vide plutôt que de casser le chat.
 *
 * SPRINT_2_FIX_RLS : on filtre maintenant sur la VRAIE ferme du user via
 * getFermeId() au lieu d'un DEMO_FERME_ID hardcodé. Couplé aux RLS, on a
 * deux couches de défense.
 */

export async function getContexteFerme(
  supabase: SupabaseClient
): Promise<string> {
  let fermeId: string
  try {
    fermeId = await getFermeId()
  } catch {
    // Pas de session / pas de ferme → contexte vide (le chat reste utilisable
    // sur les pages publiques).
    return `## État de la ferme (snapshot temps réel)\n\nAucun contexte ferme disponible.\n`
  }

  const [animauxRes, bandesRes, alertesRes, stockRes] = await Promise.all([
    supabase
      .from('animaux')
      .select('id', { count: 'exact', head: true })
      .eq('ferme_id', fermeId)
      .in('statut', ['actif', 'malade'])
      .is('deleted_at', null),
    supabase
      .from('bandes')
      .select('id, code, nom')
      .eq('ferme_id', fermeId)
      .eq('statut', 'active')
      .is('deleted_at', null),
    supabase
      .from('v_alertes_actives')
      .select('gravite, titre')
      .eq('ferme_id', fermeId)
      .limit(10),
    supabase
      .from('matieres_premieres')
      .select('nom, stock_actuel, seuil_alerte')
      .eq('ferme_id', fermeId)
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
