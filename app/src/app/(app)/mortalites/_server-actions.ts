'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { mortaliteSchema, type DeclarerMortaliteInput } from './_schemas'

/**
 * B10 — Déclarer une mortalité (individuelle ou masse/bande).
 *
 * Le trigger SQL `tg_mortalite_marque_animal_mort` bascule automatiquement
 * `animaux.statut='mort'` quand animal_id NOT NULL → pas de double saisie côté
 * server action.
 */
export async function declarerMortalite(
  data: DeclarerMortaliteInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const parsed = mortaliteSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const d = parsed.data

    const supabase = await createClient()

    // 1. Récupérer ferme_id + user_id pour traçabilité
    const {
      data: { user },
      error: errUser,
    } = await supabase.auth.getUser()
    if (errUser || !user) {
      return { ok: false, error: 'Session expirée — merci de vous reconnecter' }
    }

    const { data: farmRow, error: errFarm } = await supabase
      .from('user_farms')
      .select('ferme_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (errFarm || !farmRow) {
      return {
        ok: false,
        error: 'Aucune ferme associée à votre compte',
      }
    }

    // 2. Construit payload selon cible
    const payload: Record<string, unknown> = {
      ferme_id: farmRow.ferme_id,
      animal_id: d.cible === 'animal' ? d.animal_id : null,
      bande_id: d.cible === 'bande' ? d.bande_id : null,
      nb_animaux: d.cible === 'animal' ? 1 : d.nb_animaux,
      motif: d.motif,
      motif_libre:
        d.motif === 'autre' && d.motif_libre
          ? d.motif_libre.trim()
          : null,
      date_mortalite: d.date_mortalite,
      observations:
        d.observations && d.observations !== ''
          ? d.observations
          : null,
      declarer_user_id: user.id,
    }

    const { data: inserted, error } = await supabase
      .from('mortalites')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      // Renvoie le message Postgres en clair (chk_* contraintes parlent FR métier)
      return { ok: false, error: error.message }
    }

    revalidatePath('/mortalites')
    revalidatePath('/cheptel')
    revalidatePath('/dashboard')
    revalidatePath('/alertes')

    return { ok: true, id: inserted.id as string }
  } catch (e) {
    console.error('[declarerMortalite] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}
