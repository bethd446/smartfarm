'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const schemaMarquerFait = z.object({
  protocoleId: z.string().uuid('protocole_id invalide'),
  animalId: z.string().uuid().nullable(),
  bandeId: z.string().uuid().nullable(),
})

/**
 * Enregistre une vaccination depuis le calendrier sanitaire, à partir
 * d'un protocole et d'une cible (animal OU bande). Reprend produit / dose
 * depuis le protocole. Date = aujourd'hui.
 */
export async function enregistrerVaccinDepuisCalendrier(
  protocoleId: string,
  animalId: string | null,
  bandeId: string | null,
): Promise<void> {
  const parsed = schemaMarquerFait.safeParse({ protocoleId, animalId, bandeId })
  if (!parsed.success) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? 'Données invalides',
      )}`,
    )
  }

  if (!parsed.data.animalId && !parsed.data.bandeId) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(
        'Cible manquante (animal ou bande requis)',
      )}`,
    )
  }

  const supabase = sb()

  // Récupérer le protocole pour avoir produit + dose
  const { data: proto, error: errProto } = await supabase
    .from('protocoles_vaccinaux')
    .select('id, produit, dose_ml')
    .eq('id', parsed.data.protocoleId)
    .maybeSingle()

  if (errProto || !proto) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(
        'Protocole introuvable',
      )}`,
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const payload: Record<string, unknown> = {
    animal_id: parsed.data.animalId,
    bande_id: parsed.data.bandeId,
    date_vaccination: today,
    produit: proto.produit ?? 'Vaccin',
    dose_ml: typeof proto.dose_ml === 'number' ? proto.dose_ml : null,
    protocole_id: proto.id,
    observations: 'Enregistré depuis calendrier sanitaire',
  }

  const { error } = await supabase.from('vaccinations').insert(payload)
  if (error) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(error.message)}`,
    )
  }

  revalidatePath('/sanitaire')
  revalidatePath('/sanitaire/calendrier')
  redirect(
    `/sanitaire/calendrier?toast=success&msg=${encodeURIComponent('Vaccin enregistré')}`,
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  PROD-B — Marquer un évènement `evenements_prevus` comme réalisé.          */
/*  Étend le pattern existant aux types : vermifuges truie/cochette,          */
/*  vaccins parvo/lepto/rouget cochette, transferts maternité, sevrages,      */
/*  diagnostics gestation, rappels vaccinaux, etc.                            */
/* ────────────────────────────────────────────────────────────────────────── */

export async function marquerEvenementFait(formData: FormData): Promise<void> {
  const event_id = String(formData.get('event_id') ?? '')
  if (!event_id) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent('Évènement manquant')}`,
    )
  }

  const supabase = sb()
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('evenements_prevus')
    .update({ statut: 'realise', date_realisation: today })
    .eq('id', event_id)

  if (error) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(error.message)}`,
    )
  }

  revalidatePath('/sanitaire')
  revalidatePath('/sanitaire/calendrier')
  revalidatePath('/dashboard')
  revalidatePath('/alertes')
  redirect(
    `/sanitaire/calendrier?toast=success&msg=${encodeURIComponent('Évènement marqué comme fait')}`,
  )
}
