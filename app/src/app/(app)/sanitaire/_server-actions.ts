'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { schemaVaccin, schemaSoin, schemaPerte } from './_schemas'
import type { VaccinInput, SoinInput, PerteInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type ActionResult = { ok: true; dedup?: boolean } | { ok: false; error: string }

function clean<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined || v === null) continue
    out[k] = v
  }
  return out as Partial<T>
}

// F2 P0-9 : helper idempotency error detection
function isIdempotencyDup(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return (
    err.code === '23505' &&
    !!err.message &&
    (err.message.includes('idempotency') || err.message.includes('idempotency_key'))
  )
}

/* -------------------------------------------------------------------------- */
/*  ACTIONS                                                                   */
/* -------------------------------------------------------------------------- */

export async function creerVaccination(data: VaccinInput): Promise<ActionResult> {
  try {
    const parsed = schemaVaccin.safeParse(data)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }
    const supabase = sb()
    const idempotencyKey =
      parsed.data.idempotency_key && parsed.data.idempotency_key !== ''
        ? parsed.data.idempotency_key
        : null
    const payload = clean({
      animal_id: parsed.data.animal_id || null,
      bande_id: parsed.data.bande_id || null,
      date_vaccination: parsed.data.date_vaccination,
      produit: parsed.data.produit,
      lot: parsed.data.lot || null,
      dose_ml:
        typeof parsed.data.dose_ml === 'number' ? parsed.data.dose_ml : null,
      veterinaire: parsed.data.veterinaire || null,
      observations: parsed.data.observations || null,
      idempotency_key: idempotencyKey,
    })
    const { error } = await supabase.from('vaccinations').insert(payload)
    if (error) {
      if (isIdempotencyDup(error)) return { ok: true, dedup: true }
      return { ok: false, error: error.message }
    }
    revalidatePath('/sanitaire')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    console.error('[creerVaccination] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function creerTraitement(data: SoinInput): Promise<ActionResult> {
  try {
    const parsed = schemaSoin.safeParse(data)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }
    const supabase = sb()
    const idempotencyKey =
      parsed.data.idempotency_key && parsed.data.idempotency_key !== ''
        ? parsed.data.idempotency_key
        : null
    const payload = clean({
      animal_id: parsed.data.animal_id || null,
      bande_id: parsed.data.bande_id || null,
      date_debut: parsed.data.date_debut,
      date_fin: parsed.data.date_fin || null,
      motif: parsed.data.motif,
      produit: parsed.data.produit || null,
      posologie: parsed.data.posologie || null,
      voie: parsed.data.voie || null,
      veterinaire: parsed.data.veterinaire || null,
      cout: typeof parsed.data.cout === 'number' ? parsed.data.cout : null,
      observations: parsed.data.observations || null,
      idempotency_key: idempotencyKey,
    })
    const { error } = await supabase.from('traitements').insert(payload)
    if (error) {
      if (isIdempotencyDup(error)) return { ok: true, dedup: true }
      return { ok: false, error: error.message }
    }
    revalidatePath('/sanitaire')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    console.error('[creerTraitement] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

/**
 * G2 P0-3 — creerMortalite : RPC atomique
 *
 * Avant : INSERT mortalité + UPDATE animaux.statut séparés → animal zombie si
 *   UPDATE fail mais INSERT déjà commité.
 * Après : RPC `enregistrer_mortalite_atomique` qui fait les 2 en transaction
 *   PG unique avec idempotency. P0-6 : ferme_id résolu via getFermeId() helper.
 */
export async function creerMortalite(data: PerteInput): Promise<ActionResult> {
  try {
    const parsed = schemaPerte.safeParse(data)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }
    const supabase = sb()
    const idempotencyKey =
      parsed.data.idempotency_key && parsed.data.idempotency_key !== ''
        ? parsed.data.idempotency_key
        : null
    const ferme_id = await getFermeId()

    // RPC atomique : insert mortalité + update animaux.statut='mort'
    const { data: rpcRes, error } = await supabase.rpc('enregistrer_mortalite_atomique', {
      p_ferme_id: ferme_id,
      p_date_mort: parsed.data.date_mort,
      p_cause: parsed.data.cause,
      p_animal_id: parsed.data.animal_id || null,
      p_bande_id: parsed.data.bande_id || null,
      p_diagnostic: parsed.data.diagnostic || null,
      p_autopsie: parsed.data.autopsie ?? false,
      p_observations: parsed.data.observations || null,
      p_idempotency_key: idempotencyKey,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const res = rpcRes as { ok: boolean; dedup?: boolean; error?: string } | null
    if (!res || res.ok !== true) {
      const errCode = res?.error ?? 'rpc_error'
      const msgFr =
        errCode === 'animal_introuvable' ? 'Animal introuvable dans cette ferme.' :
        errCode === 'animal_deja_mort'   ? 'Animal déjà marqué comme mort.' :
        errCode === 'parametres_manquants' ? 'Paramètres mortalité manquants.' :
        `Erreur mortalité : ${errCode}`
      return { ok: false, error: msgFr }
    }

    revalidatePath('/sanitaire')
    revalidatePath('/dashboard')
    revalidatePath('/cheptel')
    return { ok: true, dedup: !!res.dedup }
  } catch (e) {
    console.error('[creerMortalite] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}
