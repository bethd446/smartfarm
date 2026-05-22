'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { animalSchema } from './_schemas'
import type { CreerAnimalInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

export async function creerAnimal(
  data: CreerAnimalInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = animalSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const d = parsed.data

  const payload: Record<string, unknown> = {
    ferme_id: await getFermeId(),
    tag: d.tag,
    sexe: d.sexe,
    categorie: d.categorie,
  }
  if (d.nom) payload.nom = d.nom
  if (d.race_id) payload.race_id = d.race_id
  if (d.date_naissance) payload.date_naissance = d.date_naissance
  if (d.poids_naissance_kg !== '' && d.poids_naissance_kg !== undefined)
    payload.poids_naissance_kg = d.poids_naissance_kg
  if (d.observations) payload.observations = d.observations

  const supabase = sb()
  const { error } = await supabase.from('animaux').insert(payload)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cheptel')
  return { ok: true }
}
