'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

/**
 * PROD-B — Saisie BCS rapide 1-tap depuis la fiche /cheptel/[id].
 * Stockée dans `observations_bcs` (table légère créée par migration).
 * NB : service_role car écriture côté serveur (RLS V2 permissive,
 *      pattern identique aux autres _actions.ts du module).
 */
function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function saisirBcsRapide(formData: FormData) {
  const animal_id = String(formData.get('animal_id') ?? '')
  const bcs = parseFloat(String(formData.get('bcs') ?? '0'))
  if (!animal_id || !Number.isFinite(bcs) || bcs < 1 || bcs > 5) return

  const supabase = sb()

  // Récupère ferme_id de l'animal (RLS-friendly, multi-fermes)
  const { data: animal } = await supabase
    .from('animaux')
    .select('ferme_id')
    .eq('id', animal_id)
    .maybeSingle()

  if (!animal?.ferme_id) return

  await supabase.from('observations_bcs').insert({
    animal_id,
    ferme_id: animal.ferme_id,
    bcs,
  })

  revalidatePath(`/cheptel/${animal_id}`)
}
