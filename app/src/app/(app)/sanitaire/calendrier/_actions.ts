'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

  const supabase = await createClient()

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
/*  G2 P0-4 — marquerEvenementFait : idempotent + guard statut                */
/*                                                                            */
/*  Avant : UPDATE direct sans check statut → double-clic = double trigger    */
/*    downstream (re-vaccination, etc.).                                      */
/*  Après : RPC `marquer_evenement_realise` qui :                             */
/*    - GUARD statut IN ('planifie','retard')                                 */
/*    - Idempotency key UUID (lecture form ou regen) → 2ᵉ appel = no-op       */
/* ────────────────────────────────────────────────────────────────────────── */

export async function marquerEvenementFait(formData: FormData): Promise<void> {
  const event_id = String(formData.get('event_id') ?? '')
  const idempotency_key_raw = String(formData.get('idempotency_key') ?? '')
  // Si form ne fournit pas de key, on en génère une stable basée sur l'evt + jour
  // (équivalent dedup intra-journée silencieux).
  const today = new Date().toISOString().slice(0, 10)
  const idempotency_key =
    idempotency_key_raw && idempotency_key_raw.length === 36
      ? idempotency_key_raw
      : null

  if (!event_id) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent('Évènement manquant')}`,
    )
  }

  const supabase = await createClient()

  const { data: rpcRes, error } = await supabase.rpc('marquer_evenement_realise', {
    p_event_id: event_id,
    p_date_realisation: today,
    p_idempotency_key: idempotency_key,
  })

  if (error) {
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(error.message)}`,
    )
  }

  const res = rpcRes as { ok: boolean; dedup?: boolean; updated?: boolean; error?: string } | null
  if (!res || res.ok !== true) {
    const code = res?.error ?? 'rpc_error'
    const msg =
      code === 'evenement_introuvable' ? 'Évènement introuvable' :
      code === 'statut_non_modifiable' ? 'Évènement annulé : impossible de marquer fait' :
      `Erreur : ${code}`
    redirect(
      `/sanitaire/calendrier?toast=error&msg=${encodeURIComponent(msg)}`,
    )
  }

  revalidatePath('/sanitaire')
  revalidatePath('/sanitaire/calendrier')
  revalidatePath('/dashboard')
  revalidatePath('/alertes')
  const okMsg = res.dedup
    ? 'Évènement déjà marqué fait'
    : 'Évènement marqué comme fait'
  redirect(
    `/sanitaire/calendrier?toast=success&msg=${encodeURIComponent(okMsg)}`,
  )
}
