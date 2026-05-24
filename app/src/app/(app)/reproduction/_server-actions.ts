'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { saillieSchema, diagnosticSchema } from './_schemas'
import type { CreerSaillieInput, CreerDiagnosticInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'

export async function creerSaillie(
  data: CreerSaillieInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
  try {
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

    const supabase = await createClient()
    // FIX 2026-05-23 : colonnes rang_porte / bcs_truie / idempotency_key
    // n'existent PAS dans la table saillies en prod → on les ignore côté insert
    // (suivi métier dans observations si nécessaire). Idempotence gérée par
    // unique index métier (truie+date).
    const obsExtras: string[] = []
    if (d.rang_porte !== '' && d.rang_porte !== undefined && d.rang_porte !== null) {
      obsExtras.push(`Rang portée: ${d.rang_porte}`)
    }
    if (d.bcs_truie !== '' && d.bcs_truie !== undefined && d.bcs_truie !== null) {
      obsExtras.push(`BCS truie: ${d.bcs_truie}`)
    }
    const observationsFinal = [d.observations || '', ...obsExtras]
      .filter(Boolean)
      .join(' · ') || null
    void idempotencyKey // conservé pour debug, non envoyé (col absente)

    const insertPayload = {
      ferme_id: await getFermeId(),
      truie_id: d.truie_id,
      verrat_id: d.verrat_id || null,
      bande_id: d.bande_id || null,
      date_saillie: d.date_saillie,
      methode: d.methode,
      observations: observationsFinal,
    }
    const { error } = await supabase.from('saillies').insert(insertPayload)
    // trigger SQL auto crée diagnostics_gestation J+15 et J+28 dans evenements_prevus
    if (error) {
      console.error('[creerSaillie] supabase insert error:', error)
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
  } catch (e) {
    console.error('[creerSaillie] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function creerDiagnostic(
  data: CreerDiagnosticInput
): Promise<{ ok: true; dedup?: boolean } | { ok: false; error: string }> {
  try {
    const parsed = diagnosticSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const d = parsed.data

    const supabase = await createClient()
    const { error } = await supabase.from('diagnostics_gestation').insert({
      saillie_id: d.saillie_id,
      date_diag: d.date_diagnostic,
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
  } catch (e) {
    console.error('[creerDiagnostic] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}
