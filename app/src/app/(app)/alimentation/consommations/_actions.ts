'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { revalidatePath } from 'next/cache'

/* -------------------------------------------------------------------------- */
/*  Schema (interne au fichier 'use server' — pas exporté pour respecter      */
/*  la règle Next.js : un fichier server ne doit exporter que des fonctions)  */
/*                                                                            */
/*  FIX 2026-05-24 BUG-SC12 : la table `consommations_aliment` ne possède PAS */
/*  les colonnes `type_aliment_id` / `quantite_kg` / `cout`. Le schéma réel : */
/*    id, ferme_id, animal_id, bande_id, date, formule_id, qte_kg,            */
/*    observations, created_at, updated_at, deleted_at                        */
/*  → on remappe vers `formule_id` / `qte_kg` ; `cout` est dérivé en lecture  */
/*  via la formule (cout_kg_fcfa * qte_kg), pas stocké.                       */
/* -------------------------------------------------------------------------- */

const schemaConsommation = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  bande_id: z.string().uuid({ message: 'Bande requise' }),
  formule_id: z.string().uuid({ message: 'Formule d’aliment requise' }),
  date: z.string().min(1, 'Date requise'),
  qte_kg: z.coerce
    .number({ message: 'Quantité requise' })
    .positive('La quantité doit être > 0'),
  observations: z.string().optional().or(z.literal('')),
})

export type ConsoInput = {
  id?: string
  bande_id: string
  formule_id: string
  date: string
  qte_kg: number | string
  observations?: string
}

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

function buildPayload(parsed: z.output<typeof schemaConsommation>) {
  return {
    bande_id: parsed.bande_id,
    formule_id: parsed.formule_id,
    date: parsed.date,
    qte_kg: parsed.qte_kg,
    observations:
      typeof parsed.observations === 'string' && parsed.observations.trim()
        ? parsed.observations.trim()
        : null,
  }
}

export async function creerConsommation(
  data: ConsoInput,
): Promise<ActionResult> {
  try {
    const parsed = schemaConsommation.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const sb = await createClient()
    const fermeId = await getFermeId()
    const { data: inserted, error } = await sb
      .from('consommations_aliment')
      .insert({ ferme_id: fermeId, ...buildPayload(parsed.data) })
      .select('id')
      .single()
    if (error) {
      console.error('[creerConsommation] supabase insert error:', error)
      return { ok: false, error: error.message }
    }
    revalidatePath('/alimentation/consommations')
    revalidatePath('/alimentation')
    return { ok: true, id: inserted?.id as string | undefined }
  } catch (e) {
    console.error('[creerConsommation] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function modifierConsommation(
  data: ConsoInput,
): Promise<ActionResult> {
  try {
    const parsed = schemaConsommation.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    if (!parsed.data.id) return { ok: false, error: 'Identifiant manquant' }
    const { error } = await (await createClient())
      .from('consommations_aliment')
      .update(buildPayload(parsed.data))
      .eq('id', parsed.data.id)
    if (error) {
      console.error('[modifierConsommation] supabase update error:', error)
      return { ok: false, error: error.message }
    }
    revalidatePath('/alimentation/consommations')
    revalidatePath('/alimentation')
    return { ok: true, id: parsed.data.id }
  } catch (e) {
    console.error('[modifierConsommation] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function supprimerConsommation(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await (await createClient())
    .from('consommations_aliment')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[supprimerConsommation] supabase delete error:', error)
    return { ok: false, error: error.message }
  }
  revalidatePath('/alimentation/consommations')
  revalidatePath('/alimentation')
  return { ok: true }
}
