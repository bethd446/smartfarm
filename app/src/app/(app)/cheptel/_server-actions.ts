'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { animalSchema } from './_schemas'
import type { CreerAnimalInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'
import {
  TOUS_LES_STADES,
  stadesAutorisesPour,
  type StadeAnimal,
} from '@/lib/stades-animaux'

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

/**
 * S5 Lane 1 — Bulk transition stade pour N animaux.
 *
 * Pattern : SELECT animaux par IDs → valide stade cible ∈ stadesAutorisesPour(categorie)
 * pour chaque → UPDATE batch → INSERT audit_log batch (1 ligne/animal + batch_id commun).
 *
 * Filtres charte §10 règle 9 : statut='actif' AND deleted_at IS NULL.
 * Exclusion verrat (categorie='verrat' immutable, cf [id]/_actions.ts:61).
 * Bascule catégorie auto NON gérée ici (out of scope, cf nouvelleCategoriePourStade).
 */
const schemaChangerStadeBatch = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Au moins 1 animal').max(100, 'Max 100 par batch'),
  nouveau_stade: z.enum(TOUS_LES_STADES as [StadeAnimal, ...StadeAnimal[]]),
  motif: z.string().max(500, 'Motif trop long (500 max)').optional().or(z.literal('')),
})

export async function changerStadeBatch(input: {
  ids: string[]
  nouveau_stade: string
  motif?: string
}): Promise<
  | { ok: true; count: number; batch_id: string }
  | { ok: false; error: string }
> {
  const parsed = schemaChangerStadeBatch.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation échouée' }
  }
  const { ids, nouveau_stade, motif } = parsed.data
  const supabase = await createClient()

  // 1. SELECT animaux ciblés (filtre charte §10 règle 9)
  const { data: animaux, error: errSelect } = await supabase
    .from('animaux')
    .select('id, tag, categorie, stade, ferme_id')
    .in('id', ids)
    .eq('statut', 'actif')
    .is('deleted_at', null)

  if (errSelect) {
    return { ok: false, error: `SELECT échoué : ${errSelect.message}` }
  }
  if (!animaux || animaux.length === 0) {
    return { ok: false, error: 'Aucun animal accessible (réformé, supprimé, ou hors ferme)' }
  }
  if (animaux.length !== ids.length) {
    return {
      ok: false,
      error: `${animaux.length}/${ids.length} animaux accessibles (réformés, supprimés, ou hors ferme)`,
    }
  }

  // 2. Validation cross-catégorie : nouveau_stade ∈ stadesAutorisesPour(cat) pour chaque.
  //    Skip silencieux idempotent : si déjà au stade cible, on n'inclut pas dans l'UPDATE.
  const animauxAUpdater: typeof animaux = []
  for (const a of animaux as Array<{ id: string; tag: string; categorie: string; stade: string; ferme_id: string }>) {
    if (a.categorie === 'verrat') {
      return { ok: false, error: `Animal ${a.tag} (verrat) — stade immutable, retirer de la sélection` }
    }
    if (a.stade === nouveau_stade) {
      continue // idempotent : déjà au bon stade, skip silencieux
    }
    const autorises = stadesAutorisesPour(a.categorie)
    if (!autorises.includes(nouveau_stade as StadeAnimal)) {
      return {
        ok: false,
        error: `Animal ${a.tag} (${a.categorie}) ne peut transitionner vers ${nouveau_stade}`,
      }
    }
    animauxAUpdater.push(a)
  }

  if (animauxAUpdater.length === 0) {
    return { ok: false, error: `Tous les animaux sélectionnés sont déjà en ${nouveau_stade}` }
  }

  // 3. UPDATE batch (seulement ceux à updater)
  const idsAUpdater = animauxAUpdater.map((a) => (a as { id: string }).id)
  const { error: errUpdate } = await supabase
    .from('animaux')
    .update({ stade: nouveau_stade })
    .in('id', idsAUpdater)

  if (errUpdate) {
    return { ok: false, error: `UPDATE échoué : ${errUpdate.message}` }
  }

  // 4. INSERT audit_log batch (1 ligne/animal updaté + batch_id commun)
  //    Nécessite migration 'STADE_CHANGE_BATCH' dans enum action_audit (cf migration 20260525*)
  const batch_id = crypto.randomUUID()
  const auditRows = (animauxAUpdater as Array<{ id: string; categorie: string; stade: string; ferme_id: string }>).map((a) => ({
    table_name: 'animaux',
    row_id: a.id,
    action: 'STADE_CHANGE_BATCH',
    ferme_id: a.ferme_id,
    before_data: { stade: a.stade, categorie: a.categorie, batch_id },
    after_data: {
      stade: nouveau_stade,
      categorie: a.categorie,
      batch_id,
      motif: motif && motif.length > 0 ? motif : null,
    },
  }))

  const { error: errAudit } = await supabase.from('audit_log').insert(auditRows)
  if (errAudit) {
    // Non bloquant — UPDATE déjà passé, trigger BDD a tracé l'event UPDATE générique
    console.error('[changerStadeBatch] audit_log batch (non bloquant)', errAudit)
  }

  revalidatePath('/cheptel')
  revalidatePath('/dashboard')
  revalidatePath('/batiments')

  return { ok: true, count: animauxAUpdater.length, batch_id }
}

// ============================================================================
// S6 Lane 1 (B6) — BULK TRANSFERT BÂTIMENT
// ============================================================================
//
// Pattern identique changerStadeBatch :
//  1. parse Zod (ids min 1, max 100, batiment_dest_id uuid, date ISO, motif optionnel)
//  2. SELECT animaux + filtre statut='actif' + deleted_at NULL (RLS = isolation ferme)
//  3. SELECT batiment_dest (vérifier existe + même ferme + non deleted)
//  4. Bloque verrats (cf changerStadeBatch convention)
//  5. Filter ceux déjà au batiment_dest_id (skip silencieux idempotent)
//  6. INSERT mouvements batch (1 ligne/animal, type='transfert')
//  7. UPDATE animaux SET batiment_id
//  8. INSERT audit_log batch (action='UPDATE' car enum action_audit ne contient PAS
//     'TRANSFERT_BATCH'; le marker batch_id + action_type sont dans after_data.
//     Migration enum hors scope brief B6.)
//  9. revalidatePath /cheptel + /batiments + /dashboard
//
const schemaTransfertBatch = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Au moins 1 animal').max(100, 'Max 100 par batch'),
  batiment_dest_id: z.string().uuid('Bâtiment invalide'),
  date: z.string().min(1, 'Date requise'),
  motif: z.string().max(500, 'Motif trop long (500 max)').optional().or(z.literal('')),
})

export async function transfererBatch(input: {
  ids: string[]
  batiment_dest_id: string
  date: string
  motif?: string
}): Promise<
  | { ok: true; count: number; batch_id: string }
  | { ok: false; error: string }
> {
  const parsed = schemaTransfertBatch.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation échouée' }
  }
  const { ids, batiment_dest_id, date, motif } = parsed.data

  const supabase = await createClient()
  const fermeId = await getFermeId()

  // 1. Vérifier bâtiment de destination (même ferme, non deleted)
  const { data: batDest, error: errBat } = await supabase
    .from('batiments')
    .select('id, nom, ferme_id')
    .eq('id', batiment_dest_id)
    .eq('ferme_id', fermeId)
    .is('deleted_at', null)
    .maybeSingle()

  if (errBat || !batDest) {
    return {
      ok: false,
      error: errBat?.message ?? 'Bâtiment de destination introuvable',
    }
  }

  // 2. SELECT animaux ciblés (filtre charte §10 règle 9)
  const { data: animaux, error: errSelect } = await supabase
    .from('animaux')
    .select('id, tag, categorie, batiment_id, ferme_id')
    .in('id', ids)
    .eq('statut', 'actif')
    .is('deleted_at', null)

  if (errSelect) {
    return { ok: false, error: `SELECT échoué : ${errSelect.message}` }
  }
  if (!animaux || animaux.length === 0) {
    return { ok: false, error: 'Aucun animal accessible (réformé, supprimé, ou hors ferme)' }
  }
  if (animaux.length !== ids.length) {
    return {
      ok: false,
      error: `${animaux.length}/${ids.length} animaux accessibles (réformés, supprimés, ou hors ferme)`,
    }
  }

  // 3. Bloque verrats + skip idempotent ceux déjà au batiment_dest
  const animauxATransferer: Array<{
    id: string
    tag: string
    categorie: string
    batiment_id: string | null
    ferme_id: string
  }> = []
  for (const a of animaux as Array<{
    id: string
    tag: string
    categorie: string
    batiment_id: string | null
    ferme_id: string
  }>) {
    if (a.categorie === 'verrat') {
      return {
        ok: false,
        error: `Animal ${a.tag} (verrat) — bloqué, retirer de la sélection`,
      }
    }
    if (a.batiment_id === batiment_dest_id) {
      continue // idempotent : déjà à destination
    }
    animauxATransferer.push(a)
  }

  if (animauxATransferer.length === 0) {
    return { ok: false, error: 'Tous les animaux sélectionnés sont déjà dans ce bâtiment' }
  }

  const batch_id = crypto.randomUUID()
  const motifFinal = motif && motif.length > 0 ? motif : null

  // 4. INSERT mouvements batch
  const mouvementRows = animauxATransferer.map((a) => ({
    ferme_id: a.ferme_id,
    animal_id: a.id,
    type: 'transfert' as const,
    batiment_source_id: a.batiment_id,
    batiment_dest_id: batiment_dest_id,
    date_mouvement: date,
    effectif: 1,
    motif: motifFinal,
  }))

  const { error: errMvt } = await supabase.from('mouvements').insert(mouvementRows)
  if (errMvt) {
    return { ok: false, error: `Mouvements échoué : ${errMvt.message}` }
  }

  // 5. UPDATE animaux SET batiment_id (batch)
  const idsATransferer = animauxATransferer.map((a) => a.id)
  const { error: errUpdate } = await supabase
    .from('animaux')
    .update({ batiment_id: batiment_dest_id, updated_at: new Date().toISOString() })
    .in('id', idsATransferer)

  if (errUpdate) {
    return { ok: false, error: `UPDATE échoué : ${errUpdate.message}` }
  }

  // 6. INSERT audit_log batch (action='UPDATE' car enum n'a pas TRANSFERT_BATCH —
  //    cf S5 R4 fix migration 20260525215015 qui n'ajoute que STADE_CHANGE_BATCH).
  //    Marker action_type + batch_id dans after_data pour traçabilité.
  const auditRows = animauxATransferer.map((a) => ({
    table_name: 'animaux',
    row_id: a.id,
    action: 'UPDATE',
    ferme_id: a.ferme_id,
    before_data: {
      batiment_id: a.batiment_id,
      batch_id,
      action_type: 'TRANSFERT_BATCH',
    },
    after_data: {
      batiment_id: batiment_dest_id,
      batiment_dest_nom: (batDest as { nom: string }).nom,
      batch_id,
      action_type: 'TRANSFERT_BATCH',
      date_mouvement: date,
      motif: motifFinal,
    },
  }))

  const { error: errAudit } = await supabase.from('audit_log').insert(auditRows)
  if (errAudit) {
    console.error('[transfererBatch] audit_log batch (non bloquant)', errAudit)
  }

  revalidatePath('/cheptel')
  revalidatePath('/batiments')
  revalidatePath(`/batiments/${batiment_dest_id}`)
  revalidatePath('/dashboard')

  return { ok: true, count: animauxATransferer.length, batch_id }
}

// ============================================================================
// S6 Lane 1 (B6) — BULK MORTALITÉ (épisode maladie, etc.)
// ============================================================================
//
// Colonnes table mortalites (cf migration 20260527180000_mortalites.sql) :
//   ferme_id, animal_id, bande_id, nb_animaux, motif (enum motif_mortalite),
//   motif_libre, date_mortalite, observations, declarer_user_id, created_at.
//
// Trigger SQL `tg_mortalite_marque_animal_mort` AFTER INSERT bascule
// animaux.statut='mort' + deleted_at=now() + cause_sortie + date_sortie quand
// animal_id NOT NULL. DONC on ne fait PAS d'UPDATE animaux côté server action,
// le trigger BDD le fait (1 INSERT par animal individuel = 1 bascule).
//
// motif='autre' → motif_libre obligatoire (CHECK constraint BDD).
//
const schemaMortaliteBatch = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Au moins 1 animal').max(100, 'Max 100 par batch'),
  date_deces: z.string().min(1, 'Date requise'),
  motif: z.enum([
    'asphyxie',
    'ecrasement',
    'hypothermie',
    'diarrhee',
    'malformation',
    'ppa_suspect',
    'pneumonie',
    'septicemie',
    'cannibalisme',
    'predateur',
    'indetermine',
    'autre',
  ]),
  motif_libre: z.string().max(200, 'Précision trop longue (200 max)').optional().or(z.literal('')),
  observations: z.string().max(2000).optional().or(z.literal('')),
})

export async function enregistrerMortaliteBatch(input: {
  ids: string[]
  date_deces: string
  motif: string
  motif_libre?: string
  observations?: string
}): Promise<
  | { ok: true; count: number; batch_id: string }
  | { ok: false; error: string }
> {
  const parsed = schemaMortaliteBatch.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation échouée' }
  }
  const { ids, date_deces, motif, motif_libre, observations } = parsed.data

  // Refus si motif='autre' sans motif_libre (CHECK BDD le bloquerait sinon)
  if (motif === 'autre' && (!motif_libre || motif_libre.trim().length === 0)) {
    return { ok: false, error: 'Précision requise quand motif = Autre' }
  }

  // Date ≤ today (la BDD n'a pas de CHECK non-immutable sur date future)
  const today = new Date().toISOString().slice(0, 10)
  if (date_deces > today) {
    return { ok: false, error: 'Date ne peut pas être future' }
  }

  const supabase = await createClient()

  // 1. Récupérer user pour declarer_user_id (cf pattern declarerMortalite)
  const {
    data: { user },
    error: errUser,
  } = await supabase.auth.getUser()
  if (errUser || !user) {
    return { ok: false, error: 'Session expirée — merci de vous reconnecter' }
  }

  // 2. SELECT animaux ciblés (filtre charte §10 règle 9 + RLS isolation ferme)
  const { data: animaux, error: errSelect } = await supabase
    .from('animaux')
    .select('id, tag, categorie, ferme_id')
    .in('id', ids)
    .eq('statut', 'actif')
    .is('deleted_at', null)

  if (errSelect) {
    return { ok: false, error: `SELECT échoué : ${errSelect.message}` }
  }
  if (!animaux || animaux.length === 0) {
    return { ok: false, error: 'Aucun animal accessible (réformé, supprimé, ou hors ferme)' }
  }
  if (animaux.length !== ids.length) {
    return {
      ok: false,
      error: `${animaux.length}/${ids.length} animaux accessibles (réformés, supprimés, ou hors ferme)`,
    }
  }

  // 3. Bloque verrats (cohérence changerStadeBatch)
  for (const a of animaux as Array<{ id: string; tag: string; categorie: string }>) {
    if (a.categorie === 'verrat') {
      return {
        ok: false,
        error: `Animal ${a.tag} (verrat) — bloqué, retirer de la sélection`,
      }
    }
  }

  const batch_id = crypto.randomUUID()
  const motifLibreFinal =
    motif === 'autre' && motif_libre ? motif_libre.trim() : null
  const observationsFinal =
    observations && observations.trim().length > 0 ? observations.trim() : null

  // 4. INSERT mortalites batch (1 ligne/animal, nb_animaux=1 obligatoire car
  //    chk_mortalite_cible_exclusive : animal_id NOT NULL → nb_animaux=1)
  const mortaliteRows = (animaux as Array<{ id: string; ferme_id: string }>).map(
    (a) => ({
      ferme_id: a.ferme_id,
      animal_id: a.id,
      bande_id: null,
      nb_animaux: 1,
      motif,
      motif_libre: motifLibreFinal,
      date_mortalite: date_deces,
      observations: observationsFinal,
      declarer_user_id: user.id,
    }),
  )

  const { error: errInsert } = await supabase.from('mortalites').insert(mortaliteRows)
  if (errInsert) {
    return { ok: false, error: `INSERT mortalites échoué : ${errInsert.message}` }
  }

  // 5. INSERT audit_log batch (action='UPDATE' car enum n'a pas MORTALITE_BATCH.
  //    Le trigger BDD AFTER INSERT mortalites bascule animaux.statut=mort,
  //    on trace ici le contexte batch.)
  const auditRows = (animaux as Array<{ id: string; ferme_id: string }>).map((a) => ({
    table_name: 'animaux',
    row_id: a.id,
    action: 'UPDATE',
    ferme_id: a.ferme_id,
    before_data: {
      statut: 'actif',
      batch_id,
      action_type: 'MORTALITE_BATCH',
    },
    after_data: {
      statut: 'mort',
      batch_id,
      action_type: 'MORTALITE_BATCH',
      motif,
      motif_libre: motifLibreFinal,
      date_mortalite: date_deces,
    },
  }))

  const { error: errAudit } = await supabase.from('audit_log').insert(auditRows)
  if (errAudit) {
    console.error('[enregistrerMortaliteBatch] audit_log batch (non bloquant)', errAudit)
  }

  revalidatePath('/cheptel')
  revalidatePath('/mortalites')
  revalidatePath('/dashboard')
  revalidatePath('/alertes')

  return { ok: true, count: animaux.length, batch_id }
}
