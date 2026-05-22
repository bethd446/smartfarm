'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { saillieSchema, diagnosticSchema } from './_schemas'
import type { CreerSaillieInput, CreerDiagnosticInput } from './_schemas'

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

export async function creerSaillie(
  data: CreerSaillieInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = saillieSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data

  const supabase = sb()
  const { error } = await supabase.from('saillies').insert({
    ferme_id: DEMO_FERME_ID,
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
  })
  // trigger SQL auto crée diagnostics_gestation J+15 et J+28 dans evenements_prevus
  if (error) return { ok: false, error: error.message }
  revalidatePath('/reproduction')
  revalidatePath('/calendrier')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function creerDiagnostic(
  data: CreerDiagnosticInput
): Promise<{ ok: true } | { ok: false; error: string }> {
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
