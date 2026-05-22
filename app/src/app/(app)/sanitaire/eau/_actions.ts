'use server'

/**
 * V2-F — Server actions Suivi consommation eau.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SOURCES = ['compteur_global', 'compteur_bande', 'manuel'] as const
export type SourceEau = (typeof SOURCES)[number]

export type ConsoEauInput = {
  date: string
  litres: number | string
  nb_animaux?: number | string | ''
  bande_id?: string | ''
  batiment_id?: string | ''
  source?: string
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

function toIntOrNull(v: unknown): number | null {
  const n = toNumOrNull(v)
  return n === null ? null : Math.trunc(n)
}

export async function enregistrerConsoEau(
  data: ConsoEauInput,
): Promise<ActionResult> {
  if (!data) return { ok: false, error: 'Payload manquant' }
  const date = nonEmpty(data.date)
  if (!date) return { ok: false, error: 'Date requise' }
  const litres = toNumOrNull(data.litres)
  if (litres === null || litres < 0) {
    return { ok: false, error: 'Litres invalides (≥0 requis)' }
  }

  const bandeId = nonEmpty(data.bande_id)
  if (bandeId && !UUID_RE.test(bandeId)) {
    return { ok: false, error: 'Bande invalide' }
  }
  const batimentId = nonEmpty(data.batiment_id)
  if (batimentId && !UUID_RE.test(batimentId)) {
    return { ok: false, error: 'Bâtiment invalide' }
  }
  const source = nonEmpty(data.source)
  if (source && !SOURCES.includes(source as SourceEau)) {
    return { ok: false, error: 'Source invalide' }
  }

  const payload = {
    ferme_id: (await getFermeId()),
    date,
    litres,
    nb_animaux: toIntOrNull(data.nb_animaux),
    bande_id: bandeId,
    batiment_id: batimentId,
    source,
    observations: nonEmpty(data.observations),
  }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('consommations_eau')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    // Doublon (unique index ferme/bande/date)
    if (error.code === '23505') {
      return {
        ok: false,
        error:
          'Un relevé existe déjà pour cette ferme/bande/date. Modifiez-le plutôt.',
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/sanitaire/eau')
  revalidatePath('/sanitaire')
  return { ok: true, id: inserted?.id as string | undefined }
}
