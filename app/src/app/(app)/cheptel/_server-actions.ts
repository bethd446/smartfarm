'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { animalSchema } from './_schemas'
import type { CreerAnimalInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'

export async function creerAnimal(
  data: CreerAnimalInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = animalSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data

  const payload: Record<string, unknown> = {
    ferme_id: await getFermeId(),
    tag: d.tag,
    sexe: d.sexe,
    categorie: d.categorie,
  }
  if (d.nom) payload.nom = d.nom
  if (d.race_id) payload.race_id = d.race_id
  if (d.date_naissance) payload.date_naissance = d.date_naissance
  if (d.poids_naissance_kg !== '' && d.poids_naissance_kg !== undefined)
    payload.poids_naissance_kg = d.poids_naissance_kg
  if (d.observations) payload.observations = d.observations

  const supabase = await createClient()
  const { error } = await supabase.from('animaux').insert(payload)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cheptel')
  return { ok: true }
}

/**
 * F3 — Déplacer un animal d'un bâtiment vers un autre.
 * Insert mouvements (type='transfert') AVANT update animaux.batiment_id
 * pour garantir l'atomicité. Si l'update échoue, rollback du mouvement.
 */
export async function deplacerAnimal(input: {
  animalId: string
  batimentDestId: string
  date: string
  motif?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.animalId) return { ok: false, error: 'Animal manquant' }
  if (!input.batimentDestId)
    return { ok: false, error: 'Bâtiment de destination requis' }
  if (!input.date) return { ok: false, error: 'Date requise' }

  const supabase = await createClient()
  const fermeId = await getFermeId()

  const { data: animal, error: errAnimal } = await supabase
    .from('animaux')
    .select('id, tag, batiment_id, ferme_id')
    .eq('id', input.animalId)
    .maybeSingle()
  if (errAnimal || !animal) {
    return { ok: false, error: errAnimal?.message ?? 'Animal introuvable' }
  }

  const batimentSourceId: string | null = (animal as any).batiment_id ?? null
  if (batimentSourceId === input.batimentDestId) {
    return { ok: false, error: "L'animal est déjà dans ce bâtiment" }
  }

  const mouvementPayload: Record<string, unknown> = {
    ferme_id: fermeId,
    animal_id: input.animalId,
    type: 'transfert',
    batiment_source_id: batimentSourceId,
    batiment_dest_id: input.batimentDestId,
    date_mouvement: input.date,
    effectif: 1,
  }
  if (input.motif && input.motif.trim()) {
    mouvementPayload.motif = input.motif.trim()
  }

  const { data: mvt, error: errMvt } = await supabase
    .from('mouvements')
    .insert(mouvementPayload)
    .select('id')
    .single()
  if (errMvt || !mvt) {
    return {
      ok: false,
      error: errMvt?.message ?? 'Erreur enregistrement mouvement',
    }
  }

  const { error: errUpdate } = await supabase
    .from('animaux')
    .update({ batiment_id: input.batimentDestId })
    .eq('id', input.animalId)
  if (errUpdate) {
    await supabase.from('mouvements').delete().eq('id', (mvt as any).id)
    return { ok: false, error: errUpdate.message }
  }

  revalidatePath('/cheptel')
  revalidatePath(`/cheptel/${input.animalId}`)
  revalidatePath('/batiments')
  if (batimentSourceId) revalidatePath(`/batiments/${batimentSourceId}`)
  revalidatePath(`/batiments/${input.batimentDestId}`)
  revalidatePath('/dashboard')

  return { ok: true }
}
