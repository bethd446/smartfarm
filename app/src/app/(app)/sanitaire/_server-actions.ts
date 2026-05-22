'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { schemaVaccin, schemaSoin, schemaPerte } from './_schemas'
import type { VaccinInput, SoinInput, PerteInput } from './_schemas'

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

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
}

export async function creerTraitement(data: SoinInput): Promise<ActionResult> {
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
}

export async function creerMortalite(data: PerteInput): Promise<ActionResult> {
  const parsed = schemaPerte.safeParse(data)
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
    ferme_id: DEMO_FERME_ID,
    date_mort: parsed.data.date_mort,
    cause: parsed.data.cause,
    diagnostic: parsed.data.diagnostic || null,
    autopsie: parsed.data.autopsie ?? false,
    observations: parsed.data.observations || null,
    idempotency_key: idempotencyKey,
  })
  const { error } = await supabase.from('mortalites').insert(payload)
  if (error) {
    if (isIdempotencyDup(error)) return { ok: true, dedup: true }
    return { ok: false, error: error.message }
  }

  // Si la perte concerne un animal identifié → marquer l'animal comme mort
  if (parsed.data.animal_id) {
    const { error: updErr } = await supabase
      .from('animaux')
      .update({ statut: 'mort' })
      .eq('id', parsed.data.animal_id)
    if (updErr) {
      // L'INSERT a réussi : on remonte l'avertissement mais on ne fail pas.
      return { ok: false, error: `Mortalité enregistrée mais statut animal non mis à jour : ${updErr.message}` }
    }
  }

  revalidatePath('/sanitaire')
  revalidatePath('/dashboard')
  revalidatePath('/cheptel')
  return { ok: true }
}
