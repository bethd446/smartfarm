'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

/**
 * Server actions CHANT-D — Sexage + Transit phase d'une bande.
 *
 * Utilise le service_role pour garantir l'écriture (les RLS sur bandes/
 * bande_animaux/transits_phase restent permissives ou désactivées en V2).
 */
function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * sexerBande — Marque la bande `sexee=true` et attribue `sous_groupe`
 * sur chaque ligne bande_animaux (M/F) selon le sexe de l'animal.
 *
 * Règle métier Christophe : à ~60 j post-sevrage, séparer mâles/femelles
 * pour éviter la consanguinité.
 */
export async function sexerBande(formData: FormData) {
  const bande_id = String(formData.get('bande_id') ?? '')
  if (!bande_id) return

  const s = sb()

  // 1. Marquer la bande sexée
  await s.from('bandes').update({ sexee: true }).eq('id', bande_id)

  // 2. Récupérer les animaux de la bande encore présents
  const { data: animaux } = await s
    .from('bande_animaux')
    .select('animal_id, animaux:animal_id(sexe)')
    .eq('bande_id', bande_id)
    .is('date_sortie', null)

  // 3. Attribuer le sous_groupe selon le sexe de l'animal
  for (const ba of (animaux ?? []) as any[]) {
    const sexe = ba.animaux?.sexe
    if (sexe === 'M' || sexe === 'F') {
      await s
        .from('bande_animaux')
        .update({ sous_groupe: sexe })
        .eq('bande_id', bande_id)
        .eq('animal_id', ba.animal_id)
    }
  }

  revalidatePath(`/bandes/${bande_id}`)
  revalidatePath('/bandes')
  revalidatePath('/alertes')
}

/**
 * transitPhase — Enregistre le transit d'une bande vers une nouvelle phase
 * (démarrage → croissance → finition / engraissement).
 *
 * Champs saisis : nb_males, nb_femelles, poids moyens M/F.
 * Calcule poids_total_kg = nb_M × poids_M + nb_F × poids_F côté serveur.
 * Met à jour `bandes.phase_courante`.
 */
export async function transitPhase(formData: FormData) {
  const bande_id = String(formData.get('bande_id') ?? '')
  const phase_avant = String(formData.get('phase_avant') ?? '')
  const phase_apres = String(formData.get('phase_apres') ?? '')
  const nb_males = parseInt(String(formData.get('nb_males') ?? '0')) || 0
  const nb_femelles = parseInt(String(formData.get('nb_femelles') ?? '0')) || 0
  const poids_moyen_m_raw = parseFloat(String(formData.get('poids_moyen_m_kg') ?? ''))
  const poids_moyen_f_raw = parseFloat(String(formData.get('poids_moyen_f_kg') ?? ''))
  const poids_moyen_m_kg = Number.isFinite(poids_moyen_m_raw) && poids_moyen_m_raw > 0
    ? poids_moyen_m_raw
    : null
  const poids_moyen_f_kg = Number.isFinite(poids_moyen_f_raw) && poids_moyen_f_raw > 0
    ? poids_moyen_f_raw
    : null
  const observations = String(formData.get('observations') ?? '') || null

  if (!bande_id || !phase_apres) return

  // Poids total auto-calculé
  const totalM = (poids_moyen_m_kg ?? 0) * nb_males
  const totalF = (poids_moyen_f_kg ?? 0) * nb_femelles
  const totalSum = totalM + totalF
  const poids_total_kg = totalSum > 0 ? totalSum : null

  const s = sb()
  const { data: bande } = await s
    .from('bandes')
    .select('ferme_id')
    .eq('id', bande_id)
    .single()
  if (!bande) return

  await s.from('transits_phase').insert({
    bande_id,
    ferme_id: bande.ferme_id,
    phase_avant: phase_avant || 'inconnu',
    phase_apres,
    nb_males,
    nb_femelles,
    poids_moyen_m_kg,
    poids_moyen_f_kg,
    poids_total_kg,
    observations,
  })

  await s.from('bandes').update({ phase_courante: phase_apres }).eq('id', bande_id)

  revalidatePath(`/bandes/${bande_id}`)
  revalidatePath('/bandes')
}
