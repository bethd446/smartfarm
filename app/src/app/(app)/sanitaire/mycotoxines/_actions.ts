'use server'

/**
 * V2-F — Server actions Mycotoxines (lots matières premières).
 * Seuils UE porcs : aflatoxine B1 ≤ 20 ppb, ZEA ≤ 250 ppb, DON ≤ 900 ppb.
 * Le champ `conforme` est GENERATED ALWAYS AS — ne pas l'insérer.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

export type LotInput = {
  matiere_premiere_id: string
  reference_lot: string
  date_reception: string
  quantite_kg: number | string
  origine?: string
  analyse_aflatoxine_b1_ppb?: number | string | ''
  analyse_zearalenone_ppb?: number | string | ''
  analyse_don_ppb?: number | string | ''
  date_analyse?: string
  observations?: string
}

function nonEmpty(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function toNumOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export async function enregistrerLotMatierePremiere(
  data: LotInput,
): Promise<ActionResult> {
  if (!data) return { ok: false, error: 'Payload manquant' }
  const mpId = nonEmpty(data.matiere_premiere_id)
  if (!mpId || !UUID_RE.test(mpId)) {
    return { ok: false, error: 'Matière première requise' }
  }
  const ref = nonEmpty(data.reference_lot)
  if (!ref) return { ok: false, error: 'Référence lot requise' }
  const dateReception = nonEmpty(data.date_reception)
  if (!dateReception) {
    return { ok: false, error: 'Date de réception requise' }
  }
  const quantite = toNumOrNull(data.quantite_kg)
  if (quantite === null || quantite < 0) {
    return { ok: false, error: 'Quantité invalide' }
  }

  const payload = {
    ferme_id: (await getFermeId()),
    matiere_premiere_id: mpId,
    reference_lot: ref,
    date_reception: dateReception,
    quantite_kg: quantite,
    origine: nonEmpty(data.origine),
    analyse_aflatoxine_b1_ppb: toNumOrNull(data.analyse_aflatoxine_b1_ppb),
    analyse_zearalenone_ppb: toNumOrNull(data.analyse_zearalenone_ppb),
    analyse_don_ppb: toNumOrNull(data.analyse_don_ppb),
    date_analyse: nonEmpty(data.date_analyse),
    observations: nonEmpty(data.observations),
  }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('lots_matieres_premieres')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/sanitaire/mycotoxines')
  revalidatePath('/sanitaire')
  return { ok: true, id: inserted?.id as string | undefined }
}
