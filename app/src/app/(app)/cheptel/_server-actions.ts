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

/**
 * Phase 4.A — Transfert automatique porcelets ≥24 kg vers Croissance
 * 
 * Transfert EN MASSE : tous les porcelets en démarrage avec poids_actuel_kg ≥ 24
 * sont basculés vers le bâtiment de type 'croissance' de la ferme.
 */
export async function transfererTousVersCroissance(): Promise<
  { ok: true; transfered: number } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const fermeId = await getFermeId()

  // 1. Trouver le bâtiment Croissance de la ferme
  const { data: batCroissance, error: errBat } = await supabase
    .from('batiments')
    .select('id, nom')
    .eq('ferme_id', fermeId)
    .eq('type', 'croissance')
    .is('deleted_at', null)
    .maybeSingle()

  if (errBat || !batCroissance) {
    return {
      ok: false,
      error: 'Aucun bâtiment de type Croissance configuré dans la ferme',
    }
  }

  // 2. Sélectionner les porcelets à transférer
  const { data: porcelets, error: errSelect } = await supabase
    .from('animaux')
    .select('id, tag, batiment_id, poids_actuel_kg, stade')
    .eq('ferme_id', fermeId)
    .in('stade', ['demarrage_1', 'demarrage_2'])
    .gte('poids_actuel_kg', 24)
    .eq('statut', 'actif')
    .is('deleted_at', null)

  if (errSelect) {
    return { ok: false, error: errSelect.message }
  }

  if (!porcelets || porcelets.length === 0) {
    return { ok: false, error: 'Aucun porcelet ≥24 kg en démarrage trouvé' }
  }

  // 3. Filtrer ceux qui ne sont pas déjà en Croissance
  const aTransferer = porcelets.filter((p: any) => p.batiment_id !== batCroissance.id)

  if (aTransferer.length === 0) {
    return {
      ok: false,
      error: 'Tous les porcelets éligibles sont déjà en bâtiment Croissance',
    }
  }

  // 4. Effectuer le transfert en batch
  const dateTransfert = new Date().toISOString().split('T')[0]
  const mouvements = aTransferer.map((p: any) => ({
    ferme_id: fermeId,
    animal_id: p.id,
    type: 'transfert',
    batiment_source_id: p.batiment_id,
    batiment_dest_id: batCroissance.id,
    date_mouvement: dateTransfert,
    effectif: 1,
    motif: 'Transfert automatique ≥24 kg → Croissance (Phase 4.A)',
  }))

  const { error: errMvt } = await supabase.from('mouvements').insert(mouvements)
  if (errMvt) {
    return { ok: false, error: errMvt.message }
  }

  // 5. Update animaux (batiment_id + stade)
  const idsTransferer = aTransferer.map((p: any) => p.id)
  const { error: errUpdate } = await supabase
    .from('animaux')
    .update({
      batiment_id: batCroissance.id,
      stade: 'croissance',
      updated_at: new Date().toISOString(),
    })
    .in('id', idsTransferer)

  if (errUpdate) {
    return { ok: false, error: errUpdate.message }
  }

  // 6. Revalidate
  revalidatePath('/cheptel')
  revalidatePath('/alertes')
  revalidatePath('/batiments')
  revalidatePath(`/batiments/${batCroissance.id}`)
  revalidatePath('/dashboard')

  return { ok: true, transfered: aTransferer.length }
}

/**
 * Phase 4.A — Transfert INDIVIDUEL d'un porcelet vers Croissance
 */
export async function transfererUnVersCroissance(
  animalId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const fermeId = await getFermeId()

  // 1. Vérifier que l'animal est éligible
  const { data: animal, error: errAnimal } = await supabase
    .from('animaux')
    .select('id, tag, stade, poids_actuel_kg, batiment_id')
    .eq('id', animalId)
    .eq('ferme_id', fermeId)
    .maybeSingle()

  if (errAnimal || !animal) {
    return { ok: false, error: 'Animal introuvable' }
  }

  const a = animal as any
  if (!['demarrage_1', 'demarrage_2'].includes(a.stade)) {
    return { ok: false, error: 'Animal non éligible (stade non démarrage)' }
  }
  if (!a.poids_actuel_kg || a.poids_actuel_kg < 24) {
    return { ok: false, error: 'Poids actuel < 24 kg' }
  }

  // 2. Trouver le bâtiment Croissance
  const { data: batCroissance, error: errBat } = await supabase
    .from('batiments')
    .select('id, nom')
    .eq('ferme_id', fermeId)
    .eq('type', 'croissance')
    .is('deleted_at', null)
    .maybeSingle()

  if (errBat || !batCroissance) {
    return { ok: false, error: 'Aucun bâtiment Croissance configuré' }
  }

  if (a.batiment_id === batCroissance.id) {
    return { ok: false, error: 'Animal déjà en bâtiment Croissance' }
  }

  // 3. Enregistrer mouvement
  const dateTransfert = new Date().toISOString().split('T')[0]
  const { error: errMvt } = await supabase.from('mouvements').insert({
    ferme_id: fermeId,
    animal_id: animalId,
    type: 'transfert',
    batiment_source_id: a.batiment_id,
    batiment_dest_id: batCroissance.id,
    date_mouvement: dateTransfert,
    effectif: 1,
    motif: 'Transfert individuel ≥24 kg → Croissance',
  })
  if (errMvt) {
    return { ok: false, error: errMvt.message }
  }

  // 4. Update animal
  const { error: errUpdate } = await supabase
    .from('animaux')
    .update({
      batiment_id: batCroissance.id,
      stade: 'croissance',
      updated_at: new Date().toISOString(),
    })
    .eq('id', animalId)

  if (errUpdate) {
    return { ok: false, error: errUpdate.message }
  }

  // 5. Revalidate
  revalidatePath('/cheptel')
  revalidatePath('/alertes')
  revalidatePath('/batiments')
  revalidatePath(`/cheptel/${animalId}`)
  revalidatePath(`/batiments/${batCroissance.id}`)
  if (a.batiment_id) revalidatePath(`/batiments/${a.batiment_id}`)

  return { ok: true }
}
