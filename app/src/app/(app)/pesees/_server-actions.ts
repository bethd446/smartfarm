'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { peseeSchema } from './_schemas'
import type { CreerPeseeInput } from './_schemas'

export async function creerPesee(
  data: CreerPeseeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = peseeSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data

  const payload: Record<string, unknown> = {
    type: d.type,
    date_pesee: d.date_pesee,
    poids_kg: d.poids_kg,
    nb_animaux: d.nb_animaux,
  }
  if (d.animal_id) payload.animal_id = d.animal_id
  if (d.bande_id) payload.bande_id = d.bande_id
  if (d.observations) payload.observations = d.observations

  const supabase = await createClient()
  const { error } = await supabase.from('pesees').insert(payload)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/pesees')
  return { ok: true }
}
