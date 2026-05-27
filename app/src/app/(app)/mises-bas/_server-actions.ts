'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { miseBasSchema, sevrageSchema, adoptionSchema } from './_schemas'
import type {
  CreerMiseBasInput,
  CreerSevrageInput,
  CreerAdoptionInput,
} from './_schemas'

export async function creerMiseBas(
  data: CreerMiseBasInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
  try {
    const parsed = miseBasSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const d = parsed.data
    const idempotencyKey =
      d.idempotency_key && d.idempotency_key !== '' ? d.idempotency_key : null

    const supabase = await createClient()

    // Récupérer truie_id + bande_id depuis la saillie
    const { data: saillie, error: errSaillie } = await supabase
      .from('saillies')
      .select('truie_id, bande_id')
      .eq('id', d.saillie_id)
      .single()

    if (errSaillie || !saillie) {
      return {
        ok: false,
        error: errSaillie?.message ?? 'Montée introuvable',
      }
    }

    // Phase A compat : les colonnes legacy (date_mise_bas, nes_morts, nes_totaux,
    // duree_minutes) sont GENERATED ALWAYS côté BDD → non-insertables.
    // On insère dans les colonnes physiques (date_mb, morts_nes, duree_mb_minutes).
    // nes_totaux est recalculé côté BDD via une colonne GENERATED.
    const payload: Record<string, unknown> = {
      saillie_id: d.saillie_id,
      truie_id: saillie.truie_id,
      bande_id: saillie.bande_id,
      date_mb: d.date_mise_bas,
      nes_vivants: d.nes_vivants,
      morts_nes: d.nes_morts,
      momifies: d.momifies,
      ecrases: d.ecrases,
      assistance: d.assistance,
      idempotency_key: idempotencyKey,
    }
    if (d.poids_portee_kg !== '' && d.poids_portee_kg !== undefined)
      payload.poids_portee_kg = d.poids_portee_kg
    if (d.duree_minutes !== '' && d.duree_minutes !== undefined)
      payload.duree_mb_minutes = d.duree_minutes
    if (d.bcs_truie !== '' && d.bcs_truie !== undefined)
      payload.bcs_truie = d.bcs_truie
    if (d.observations) payload.observations = d.observations

    const { error } = await supabase.from('mises_bas').insert(payload)
    // trigger SQL : marque mise_bas_prevue comme realise, crée tarissement J+21, recalcule sevrage
    if (error) {
      if (
        error.code === '23505' &&
        (error.message.includes('idempotency') ||
          error.message.includes('idempotency_key'))
      ) {
        return { ok: true, dedup: true }
      }
      return { ok: false, error: error.message }
    }

    revalidatePath('/mises-bas')
    revalidatePath('/calendrier')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    console.error('[creerMiseBas] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function creerSevrage(
  data: CreerSevrageInput
): Promise<
  | { ok: true; dedup?: boolean; sevrageId?: string; porceletsCreated?: number }
  | { ok: false; error: string }
> {
  try {
    const parsed = sevrageSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const d = parsed.data
    const idempotencyKey =
      d.idempotency_key && d.idempotency_key !== '' ? d.idempotency_key : null

    const supabase = await createClient()

    // Récupérer truie_id + bande_id + ferme_id depuis la mise-bas
    const { data: mb, error: errMb } = await supabase
      .from('mises_bas')
      .select('truie_id, bande_id, ferme_id, date_mb')
      .eq('id', d.mise_bas_id)
      .single()

    if (errMb || !mb) {
      return { ok: false, error: errMb?.message ?? 'Portée introuvable' }
    }

    const payload: Record<string, unknown> = {
      mb_id: d.mise_bas_id,
      truie_id: mb.truie_id,
      bande_id: mb.bande_id,
      date_sevrage: d.date_sevrage,
      effectif_sevre: d.nb_sevres,
      idempotency_key: idempotencyKey,
    }
    if (d.poids_total_kg !== '' && d.poids_total_kg !== undefined)
      payload.poids_total_kg = d.poids_total_kg
    if (d.age_jours !== '' && d.age_jours !== undefined)
      payload.age_jours = d.age_jours
    if (d.bcs_truie !== '' && d.bcs_truie !== undefined)
      payload.bcs_truie = d.bcs_truie
    if (d.observations) payload.observations = d.observations

    // 1. INSERT sevrage
    const { data: sevrage, error: e1 } = await supabase
      .from('sevrages')
      .insert(payload)
      .select()
      .single()
    // trigger SQL : marque sevrage_prevu + tarissement comme realises
    if (e1) {
      if (
        e1.code === '23505' &&
        (e1.message.includes('idempotency') ||
          e1.message.includes('idempotency_key'))
      ) {
        return { ok: true, dedup: true }
      }
      return { ok: false, error: e1.message }
    }

    if (!sevrage?.id) {
      return { ok: false, error: 'Sevrage créé mais ID manquant' }
    }

    // 2. Créer N porcelets en batch
    const porceletsToCreate = Array.from(
      { length: d.nb_sevres },
      (_, i) => ({
        ferme_id: mb.ferme_id,
        tag: `P-${sevrage.id.slice(0, 8)}-${i + 1}`,
        nom: null,
        sexe: i % 2 === 0 ? 'F' : 'M', // Répartition 50/50 F/M
        categorie: 'porcelet_sevre',
        stade: 'demarrage_1',
        statut: 'actif',
        batiment_id: d.batiment_destination_id,
        date_naissance: mb.date_mb,
        portee_id: d.mise_bas_id,
        date_entree: d.date_sevrage,
        observations: `Sevrage ${sevrage.id.slice(0, 8)}`,
      })
    )

    const { error: e2 } = await supabase
      .from('animaux')
      .insert(porceletsToCreate)

    if (e2) {
      // ROLLBACK : supprimer le sevrage créé
      console.error('[creerSevrage] rollback sevrage après échec porcelets:', e2)
      await supabase.from('sevrages').delete().eq('id', sevrage.id)
      return {
        ok: false,
        error: `Échec création porcelets : ${e2.message}`,
      }
    }

    revalidatePath('/mises-bas')
    revalidatePath('/calendrier')
    revalidatePath('/dashboard')
    revalidatePath('/cheptel')
    revalidatePath(`/batiments/${d.batiment_destination_id}`)
    return {
      ok: true,
      sevrageId: sevrage.id,
      porceletsCreated: d.nb_sevres,
    }
  } catch (e) {
    console.error('[creerSevrage] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

// ─── C9 — Adoption / egalisation portees ──────────────────────────────────
// Transfert N porcelets d'une MB source vers une MB destination, meme ferme.
// Verifie : source ≠ destination, capacite source, motif valide.
// Le trigger BDD ajuste mises_bas.nes_vivants source/destination + valide
// la coherence ferme (anti cross-ferme malgre RLS).
export async function creerAdoption(
  data: CreerAdoptionInput
): Promise<{ ok: true; adoptionId: string } | { ok: false; error: string }> {
  try {
    const parsed = adoptionSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const d = parsed.data

    const supabase = await createClient()

    // 1. Auth + ferme courante
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { ok: false, error: 'Non authentifié' }
    }
    const { data: fermeId, error: errFerme } = await supabase.rpc(
      'current_farm_id'
    )
    if (errFerme || !fermeId) {
      return {
        ok: false,
        error: errFerme?.message ?? 'Ferme courante introuvable',
      }
    }

    // 2. Verif metier coherente avant INSERT (UI plus parlante qu'erreur trigger)
    const [{ data: mbSource, error: e1 }, { data: mbDest, error: e2 }] =
      await Promise.all([
        supabase
          .from('mises_bas')
          .select('id, ferme_id, nes_vivants, date_mb')
          .eq('id', d.mb_source_id)
          .single(),
        supabase
          .from('mises_bas')
          .select('id, ferme_id, nes_vivants, date_mb')
          .eq('id', d.mb_destination_id)
          .single(),
      ])

    if (e1 || !mbSource) {
      return { ok: false, error: e1?.message ?? 'Portée source introuvable' }
    }
    if (e2 || !mbDest) {
      return {
        ok: false,
        error: e2?.message ?? 'Portée destination introuvable',
      }
    }
    if (mbSource.ferme_id !== mbDest.ferme_id) {
      return {
        ok: false,
        error: 'Les deux portées doivent appartenir à la même ferme',
      }
    }
    if (d.nb_porcelets > (mbSource.nes_vivants ?? 0)) {
      return {
        ok: false,
        error: `Source n'a que ${mbSource.nes_vivants ?? 0} porcelets vivants`,
      }
    }

    // 3. INSERT adoption (triggers BDD : valide ferme + ajuste compteurs)
    const payload: Record<string, unknown> = {
      ferme_id: fermeId,
      mb_source_id: d.mb_source_id,
      mb_destination_id: d.mb_destination_id,
      nb_porcelets: d.nb_porcelets,
      motif_adoption: d.motif_adoption,
      date_adoption: d.date_adoption,
      operateur_user_id: user.id,
    }
    if (d.motif_libre && d.motif_libre !== '')
      payload.motif_libre = d.motif_libre
    if (d.observations && d.observations !== '')
      payload.observations = d.observations

    const { data: ins, error } = await supabase
      .from('adoptions')
      .insert(payload)
      .select('id')
      .single()

    if (error || !ins) {
      console.error('[creerAdoption] insert error:', error)
      return {
        ok: false,
        error: error?.message ?? 'Échec création adoption',
      }
    }

    revalidatePath('/mises-bas')
    revalidatePath('/cheptel')
    revalidatePath('/dashboard')
    return { ok: true, adoptionId: ins.id }
  } catch (e) {
    console.error('[creerAdoption] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}
