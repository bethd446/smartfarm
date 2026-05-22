'use server'

/**
 * V2-B — Server actions calendrier sanitaire PORCELETS.
 *
 * Ces actes proviennent de la vue `v_calendrier_sanitaire_porcelets`. Ils sont
 * marqués "faits" en insérant une ligne dans :
 *   - `vaccinations` pour les vaccins (Mycoplasmose H1/H2)
 *   - `traitements`  pour le Fer, la castration, la pesée
 *
 * On n'a pas de cible animal individuelle (les porcelets ne sont pas tagués au
 * jour 1) → on rattache à la `bande_id` de la mise-bas. Si pas de bande, on
 * fallback sur la truie (animal_id = truie_id) avec un libellé explicite.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toastError(msg: string): never {
  redirect(
    `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(msg)}`,
  )
}

export async function marquerActePorceletFait(formData: FormData): Promise<void> {
  const miseBasId = String(formData.get('mise_bas_id') ?? '')
  const acte = String(formData.get('acte') ?? '')
  const type = String(formData.get('type') ?? '') as 'vaccination' | 'traitement'

  if (!UUID_RE.test(miseBasId)) toastError('mise_bas_id invalide')
  if (!acte) toastError('acte manquant')
  if (type !== 'vaccination' && type !== 'traitement') {
    toastError('type acte invalide')
  }

  const supabase = await createClient()

  // Récupérer le contexte mise-bas (truie + bande)
  const { data: mb, error: mbErr } = await supabase
    .from('mises_bas')
    .select('id, truie_id, bande_id, date_mise_bas')
    .eq('id', miseBasId)
    .maybeSingle()
  if (mbErr || !mb) toastError('Mise-bas introuvable')

  const today = new Date().toISOString().slice(0, 10)

  if (type === 'vaccination') {
    // Tenter de retrouver un protocole vaccinal correspondant au libellé.
    // Le seed utilise "Mycoplasma" (sans -ose) → on tente plusieurs variantes.
    const isH2 = /H2|rappel/i.test(acte)
    const protoQuery = isH2 ? '%rappel%' : '%primo%'
    let { data: proto } = await supabase
      .from('protocoles_vaccinaux')
      .select('id, produit, dose_ml, voie')
      .ilike('nom', `%Mycoplasma%`)
      .ilike('nom', protoQuery)
      .limit(1)
      .maybeSingle()
    if (!proto) {
      const fallback = await supabase
        .from('protocoles_vaccinaux')
        .select('id, produit, dose_ml, voie')
        .ilike('nom', '%Mycoplasma%')
        .limit(1)
        .maybeSingle()
      proto = fallback.data ?? null
    }

    const payload: Record<string, unknown> = {
      animal_id: null,
      bande_id: mb!.bande_id ?? null,
      protocole_id: proto?.id ?? null,
      date_vaccination: today,
      produit: proto?.produit ?? acte,
      dose_ml: typeof proto?.dose_ml === 'number' ? proto.dose_ml : null,
      observations: `Acte porcelets — mise-bas ${mb!.date_mise_bas} (calendrier sanitaire V2-B)`,
    }
    const { error } = await supabase.from('vaccinations').insert(payload)
    if (error) toastError(`INSERT vaccination : ${error.message}`)
  } else {
    // Traitement : Fer, castration, pesée → table `traitements`
    const payload: Record<string, unknown> = {
      animal_id: null,
      bande_id: mb!.bande_id ?? null,
      date_debut: today,
      motif: acte,
      produit:
        acte.toLowerCase().includes('fer')
          ? 'Fer dextran 200 mg'
          : null,
      voie:
        acte.toLowerCase().includes('fer') ? 'IM' : null,
      observations: `Acte porcelets — mise-bas ${mb!.date_mise_bas} (calendrier sanitaire V2-B)`,
    }
    const { error } = await supabase.from('traitements').insert(payload)
    if (error) toastError(`INSERT traitement : ${error.message}`)
  }

  revalidatePath('/sanitaire')
  revalidatePath('/sanitaire/calendrier')
  redirect(
    `/sanitaire/calendrier?toast=success&msg=${encodeURIComponent(
      `Acte « ${acte} » enregistré`,
    )}`,
  )
}
