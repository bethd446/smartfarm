'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { schemaPlan, type PlanInput } from './_schemas'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

function buildPayload(parsed: ReturnType<typeof schemaPlan.parse>) {
  return {
    bande_id: parsed.bande_id,
    type_aliment_id: parsed.type_aliment_id,
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
  const parsed = schemaPlan.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const { data: inserted, error } = await sb()
    .from('plans_alimentation')
    .insert(buildPayload(parsed.data))
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/plans')
  revalidatePath('/alimentation')
  return { ok: true, id: inserted?.id as string | undefined }
}

export async function modifierPlan(data: PlanInput): Promise<ActionResult> {
  const parsed = schemaPlan.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  if (!parsed.data.id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await sb()
    .from('plans_alimentation')
    .update(buildPayload(parsed.data))
    .eq('id', parsed.data.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/plans')
  revalidatePath('/alimentation')
  return { ok: true, id: parsed.data.id }
}

export async function supprimerPlan(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await sb().from('plans_alimentation').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/plans')
  revalidatePath('/alimentation')
  return { ok: true }
}
