'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { saillieSchema, diagnosticSchema } from './_schemas'
import type { CreerSaillieInput, CreerDiagnosticInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

export async function creerSaillie(
  data: CreerSaillieInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
  const parsed = saillieSchema.safeParse(data)
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
  const { error } = await supabase.from('saillies').insert({
    ferme_id: await getFermeId(),
    truie_id: d.truie_id,
    verrat_id: d.verrat_id || null,
    bande_id: d.bande_id || null,
    date_saillie: d.date_saillie,
    methode: d.methode,
    rang_porte:
      d.rang_porte === '' || d.rang_porte === undefined ? null : d.rang_porte,
    bcs_truie:
      d.bcs_truie === '' || d.bcs_truie === undefined ? null : d.bcs_truie,
    observations: d.observations || null,
    idempotency_key: idempotencyKey,
  })
  // trigger SQL auto crée diagnostics_gestation J+15 et J+28 dans evenements_prevus
  if (error) {
    // F2 P0-9 : idempotency replay → succès silencieux
    if (
      error.code === '23505' &&
      (error.message.includes('idempotency') ||
        error.message.includes('idempotency_key'))
    ) {
      return { ok: true, dedup: true }
    }
    // F2 P0-1 : doublon métier (même truie, même jour)
    if (
      error.code === '23505' &&
      error.message.includes('idx_saillies_unique_truie_date_active')
    ) {
      return {
        ok: false,
        error: 'Saillie déjà enregistrée pour cette truie aujourd\u2019hui',
      }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/reproduction')
  revalidatePath('/calendrier')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function creerDiagnostic(
  data: CreerDiagnosticInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
  const parsed = diagnosticSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data

  const supabase = sb()
  const { error } = await supabase.from('diagnostics_gestation').insert({
    saillie_id: d.saillie_id,
    date_diagnostic: d.date_diagnostic,
    resultat: d.resultat,
    methode: d.methode || null,
    observations: d.observations || null,
  })
  // trigger SQL : si positif → crée évts transfert_maternite J+107, mise_bas_prevue J+114, sevrage_prevu
  if (error) return { ok: false, error: error.message }
  revalidatePath('/reproduction')
  revalidatePath('/calendrier')
  revalidatePath('/dashboard')
  return { ok: true }
}
