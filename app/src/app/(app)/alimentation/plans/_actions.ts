'use server'

import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { revalidatePath } from 'next/cache'
import { schemaPlan, type PlanInput } from './_schemas'

/* -------------------------------------------------------------------------- */
/*  FIX S5 LANE4 : alignement sur le schéma BDD réel.                          */
/*    - colonne `formule_id` (REFERENCES formules) au lieu de `type_aliment_id`*/
/*    - injection `ferme_id` à l'insert (NOT NULL en BDD)                      */
/* -------------------------------------------------------------------------- */

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

function buildPayload(parsed: ReturnType<typeof schemaPlan.parse>) {
  return {
    bande_id: parsed.bande_id,
    formule_id: parsed.formule_id,
    date_debut: parsed.date_debut,
    date_fin:
      typeof parsed.date_fin === 'string' && parsed.date_fin.trim()
        ? parsed.date_fin
        : null,
    ration_kg_jour:
      typeof parsed.ration_kg_jour === 'number' &&
      Number.isFinite(parsed.ration_kg_jour)
        ? parsed.ration_kg_jour
        : null,
  }
}

export async function creerPlan(data: PlanInput): Promise<ActionResult> {
  try {
    const parsed = schemaPlan.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const sb = await createClient()
    const fermeId = await getFermeId()
    const { data: inserted, error } = await sb
      .from('plans_alimentation')
      .insert({ ferme_id: fermeId, ...buildPayload(parsed.data) })
      .select('id')
      .single()
    if (error) {
      console.error('[creerPlan] supabase insert error:', error)
      return { ok: false, error: error.message }
    }
    revalidatePath('/alimentation/plans')
    revalidatePath('/alimentation')
    return { ok: true, id: inserted?.id as string | undefined }
  } catch (e) {
    console.error('[creerPlan] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function modifierPlan(data: PlanInput): Promise<ActionResult> {
  try {
    const parsed = schemaPlan.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    if (!parsed.data.id) return { ok: false, error: 'Identifiant manquant' }
    const { error } = await (await createClient())
      .from('plans_alimentation')
      .update(buildPayload(parsed.data))
      .eq('id', parsed.data.id)
    if (error) {
      console.error('[modifierPlan] supabase update error:', error)
      return { ok: false, error: error.message }
    }
    revalidatePath('/alimentation/plans')
    revalidatePath('/alimentation')
    return { ok: true, id: parsed.data.id }
  } catch (e) {
    console.error('[modifierPlan] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}

export async function supprimerPlan(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await (await createClient())
    .from('plans_alimentation')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[supprimerPlan] supabase delete error:', error)
    return { ok: false, error: error.message }
  }
  revalidatePath('/alimentation/plans')
  revalidatePath('/alimentation')
  return { ok: true }
}
