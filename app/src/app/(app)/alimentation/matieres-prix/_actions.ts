'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { prixSchema, type PrixInput } from './_schemas'

type ActionResult = { ok: true } | { ok: false; error: string }

export async function ajouterPrixMatiere(
  data: PrixInput,
): Promise<ActionResult> {
  const parsed = prixSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data
  const supabase = await createClient()
  const fermeId = await getFermeId()
  const { error } = await supabase.from('prix_matieres_historique').insert({
    ferme_id: fermeId,
    matiere_id: d.matiere_id,
    date_releve: d.date_releve,
    prix_xof_kg: d.prix_xof_kg,
    source: d.source || null,
    observations: d.observations || null,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres-prix')
  // Trigger SQL met à jour matieres_premieres.prix_indicatif_xof_kg
  revalidatePath('/alimentation/matieres')
  return { ok: true }
}

export async function supprimerPrixMatiere(
  id: string,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('prix_matieres_historique')
    .delete()
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres-prix')
  return { ok: true }
}
