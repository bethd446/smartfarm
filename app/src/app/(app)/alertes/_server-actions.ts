'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'

/**
 * F2 — Création d'une alerte manuelle (observation terrain).
 *
 * Insert dans `alertes_loge` avec type='observation_manuelle'.
 * La view `v_alertes_actives` consommée par /alertes affichera la nouvelle
 * ligne automatiquement (filtre traitee=false).
 */

const SEVERITES = ['info', 'warning', 'alert', 'critical'] as const
const CIBLES = ['aucune', 'animal', 'batiment'] as const

const schemaCreer = z.object({
  titre: z
    .string()
    .min(3, 'Titre trop court (3 caractères min)')
    .max(160, 'Titre trop long (160 caractères max)'),
  message: z
    .string()
    .max(2000, 'Message trop long (2000 caractères max)')
    .optional()
    .or(z.literal('')),
  severity: z.enum(SEVERITES, { message: 'Sévérité requise' }),
  cible_type: z.enum(CIBLES, { message: 'Type de cible requis' }),
  cible_id: z.string().uuid('Cible invalide').optional().or(z.literal('')),
  date_evenement: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD attendu)'),
})

export async function creerAlerteManuelle(input: {
  titre: string
  message?: string
  severity: string
  cible_type: string
  cible_id?: string
  date_evenement: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schemaCreer.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Validation échouée'
    console.error('[creerAlerteManuelle] Validation échouée', parsed.error.issues)
    return { ok: false, error: msg }
  }
  const { titre, message, severity, cible_type, cible_id, date_evenement } =
    parsed.data

  // Cible animal/batiment doit avoir un id
  if ((cible_type === 'animal' || cible_type === 'batiment') && !cible_id) {
    return { ok: false, error: 'Sélectionne la cible (animal ou bâtiment)' }
  }

  let fermeId: string
  try {
    fermeId = await getFermeId()
  } catch (e: any) {
    console.error('[creerAlerteManuelle] getFermeId échoué', e)
    return { ok: false, error: 'Ferme courante introuvable' }
  }

  const supabase = await createClient()

  const payload: Record<string, unknown> = {
    ferme_id: fermeId,
    type: 'observation_manuelle',
    severity,
    titre,
    message: message && message.length > 0 ? message : null,
    date_evenement,
    traitee: false,
  }
  if (cible_type === 'animal' && cible_id) {
    payload.animal_id = cible_id
  } else if (cible_type === 'batiment' && cible_id) {
    payload.batiment_id = cible_id
  }

  const { error } = await supabase.from('alertes_loge').insert(payload)
  if (error) {
    console.error('[creerAlerteManuelle] INSERT alertes_loge échoué', error)
    return { ok: false, error: `Échec création : ${error.message}` }
  }

  revalidatePath('/alertes')
  revalidatePath('/dashboard')
  return { ok: true }
}

/**
 * F2 bonus — Marquer une alerte comme traitée.
 * `id` = `alertes_loge.id` (PK). On met `traitee=true, traitee_le=now()`.
 */
export async function marquerAlerteTraitee(input: {
  id: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input?.id) return { ok: false, error: 'ID alerte requis' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('alertes_loge')
    .update({ traitee: true, traitee_le: new Date().toISOString() })
    .eq('id', input.id)

  if (error) {
    console.error('[marquerAlerteTraitee] UPDATE échoué', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/alertes')
  revalidatePath('/dashboard')
  return { ok: true }
}
