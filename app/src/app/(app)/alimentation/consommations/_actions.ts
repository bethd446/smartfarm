'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/* -------------------------------------------------------------------------- */
/*  Schema (interne au fichier 'use server' — pas exporté pour respecter      */
/*  la règle Next.js : un fichier server ne doit exporter que des fonctions)  */
/* -------------------------------------------------------------------------- */

const schemaConsommation = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  bande_id: z.string().uuid({ message: 'Bande requise' }),
  type_aliment_id: z.string().uuid({ message: 'Type d’aliment requis' }),
  date: z.string().min(1, 'Date requise'),
  quantite_kg: z.coerce
    .number({ message: 'Quantité requise' })
    .positive('La quantité doit être > 0'),
  cout: z.union([z.coerce.number().nonnegative(), z.literal('')]).optional(),
  observations: z.string().optional().or(z.literal('')),
})

export type ConsoInput = {
  id?: string
  bande_id: string
  type_aliment_id: string
  date: string
  quantite_kg: number | string
  cout?: number | string
  observations?: string
}

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

function buildPayload(parsed: z.output<typeof schemaConsommation>) {
  return {
    bande_id: parsed.bande_id,
    type_aliment_id: parsed.type_aliment_id,
    date: parsed.date,
    quantite_kg: parsed.quantite_kg,
    cout:
      typeof parsed.cout === 'number' && Number.isFinite(parsed.cout)
        ? parsed.cout
        : null,
    observations:
      typeof parsed.observations === 'string' && parsed.observations.trim()
        ? parsed.observations.trim()
        : null,
  }
}

export async function creerConsommation(
  data: ConsoInput,
): Promise<ActionResult> {
  const parsed = schemaConsommation.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const { data: inserted, error } = await sb()
    .from('consommations_aliment')
    .insert(buildPayload(parsed.data))
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/consommations')
  revalidatePath('/alimentation')
  return { ok: true, id: inserted?.id as string | undefined }
}

export async function modifierConsommation(
  data: ConsoInput,
): Promise<ActionResult> {
  const parsed = schemaConsommation.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  if (!parsed.data.id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await sb()
    .from('consommations_aliment')
    .update(buildPayload(parsed.data))
    .eq('id', parsed.data.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/consommations')
  revalidatePath('/alimentation')
  return { ok: true, id: parsed.data.id }
}

export async function supprimerConsommation(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await sb()
    .from('consommations_aliment')
    .delete()
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/consommations')
  revalidatePath('/alimentation')
  return { ok: true }
}
