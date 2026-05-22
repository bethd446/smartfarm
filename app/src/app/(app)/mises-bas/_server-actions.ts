'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { miseBasSchema, sevrageSchema } from './_schemas'
import type { CreerMiseBasInput, CreerSevrageInput } from './_schemas'

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

export async function creerMiseBas(
  data: CreerMiseBasInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
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

  const supabase = sb()

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

  const payload: Record<string, unknown> = {
    saillie_id: d.saillie_id,
    truie_id: saillie.truie_id,
    bande_id: saillie.bande_id,
    date_mise_bas: d.date_mise_bas,
    nes_totaux: d.nes_totaux,
    nes_vivants: d.nes_vivants,
    nes_morts: d.nes_morts,
    momifies: d.momifies,
    ecrases: d.ecrases,
    assistance: d.assistance,
    idempotency_key: idempotencyKey,
  }
  if (d.poids_portee_kg !== '' && d.poids_portee_kg !== undefined)
    payload.poids_portee_kg = d.poids_portee_kg
  if (d.duree_minutes !== '' && d.duree_minutes !== undefined)
    payload.duree_minutes = d.duree_minutes
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
}

export async function creerSevrage(
  data: CreerSevrageInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
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

  const supabase = sb()

  // Récupérer truie_id + bande_id depuis la mise-bas
  const { data: mb, error: errMb } = await supabase
    .from('mises_bas')
    .select('truie_id, bande_id')
    .eq('id', d.mise_bas_id)
    .single()

  if (errMb || !mb) {
    return { ok: false, error: errMb?.message ?? 'Portée introuvable' }
  }

  const payload: Record<string, unknown> = {
    mise_bas_id: d.mise_bas_id,
    truie_id: mb.truie_id,
    bande_id: mb.bande_id,
    date_sevrage: d.date_sevrage,
    nb_sevres: d.nb_sevres,
    idempotency_key: idempotencyKey,
  }
  if (d.poids_total_kg !== '' && d.poids_total_kg !== undefined)
    payload.poids_total_kg = d.poids_total_kg
  if (d.age_jours !== '' && d.age_jours !== undefined)
    payload.age_jours = d.age_jours
  if (d.bcs_truie !== '' && d.bcs_truie !== undefined)
    payload.bcs_truie = d.bcs_truie
  if (d.observations) payload.observations = d.observations

  const { error } = await supabase.from('sevrages').insert(payload)
  // trigger SQL : marque sevrage_prevu + tarissement comme realises
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
}
