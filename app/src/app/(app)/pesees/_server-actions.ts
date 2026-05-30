'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { peseeSchema } from './_schemas'
import type { CreerPeseeInput } from './_schemas'

export async function creerPesee(
  data: CreerPeseeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = peseeSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data

  const supabase = await createClient()

  // ferme_id (NOT NULL + RLS) — pattern declarerMortalite
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
    return { ok: false, error: 'Aucune ferme associée à votre compte' }
  }

  // La table `pesees` n'a PAS de colonne bande_id ; le CHECK exige animal_id OU
  // portee_id. La pesée par bande n'est donc pas supportée par le schéma actuel
  // (migration bande_id/portee_id requise — issue #21).
  if (d.type !== 'individuelle' || !d.animal_id) {
    return {
      ok: false,
      error:
        "Seules les pesées individuelles (par animal) sont supportées pour l'instant — la pesée par bande nécessite une évolution du schéma.",
    }
  }

  // Colonnes réelles uniquement (cf genesis pesees) ; `contexte` prend son DEFAULT 'controle'.
  const payload: Record<string, unknown> = {
    ferme_id: farmRow.ferme_id,
    animal_id: d.animal_id,
    date_pesee: d.date_pesee,
    poids_kg: d.poids_kg,
  }
  if (d.observations) payload.observations = d.observations

  const { error } = await supabase.from('pesees').insert(payload)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/pesees')
  return { ok: true }
}
