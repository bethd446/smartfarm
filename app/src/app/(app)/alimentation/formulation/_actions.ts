'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { schemaFormulation, type FormulationInput } from './_schemas'

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type ActionResult =
  | { ok: true; id?: string; warning?: string }
  | { ok: false; error: string }

/* -------------------------------------------------------------------------- */
/*  CREATE                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Crée une formulation + ses ingrédients dans une vraie transaction Postgres
 * via l'appel RPC `creer_formulation_complete(payload jsonb)`.
 *
 * Voir migration `20260520200001_formulation_transaction.sql` : la fonction
 * PG fait les 2 INSERTs dans la même transaction (atomique) et valide
 * elle-même que la somme des pourcentages = 100 ± 0.01.
 *
 * La colonne `formulations.stade_cible` est créée par la même migration —
 * plus de fallback applicatif nécessaire.
 */
export async function creerFormulation(data: FormulationInput): Promise<ActionResult> {
  const parsed = schemaFormulation.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }

  const supabase = sb()

  const payload = {
    ferme_id: DEMO_FERME_ID,
    nom: parsed.data.nom.trim(),
    stade_cible: parsed.data.stade_cible,
    type_aliment_id:
      typeof parsed.data.type_aliment_id === 'string' && parsed.data.type_aliment_id
        ? parsed.data.type_aliment_id
        : null,
    cout_kg:
      typeof parsed.data.cout_kg === 'number' && Number.isFinite(parsed.data.cout_kg)
        ? parsed.data.cout_kg
        : null,
    actif: true,
    ingredients: parsed.data.ingredients.map((ing) => ({
      matiere_premiere_id: ing.matiere_premiere_id,
      pourcentage: Number(ing.pourcentage),
    })),
  }

  const { data: rpcResult, error } = await supabase.rpc(
    'creer_formulation_complete',
    { payload },
  )

  if (error || !rpcResult) {
    return {
      ok: false,
      error: error?.message ?? 'Insertion formulation impossible',
    }
  }

  // La fonction PG renvoie un jsonb { id: uuid }
  const formulationId =
    typeof rpcResult === 'object' && rpcResult !== null && 'id' in rpcResult
      ? (rpcResult as { id: string }).id
      : undefined

  revalidatePath('/alimentation/formulation')
  revalidatePath('/alimentation')
  return { ok: true, id: formulationId }
}

/* -------------------------------------------------------------------------- */
/*  DELETE                                                                    */
/* -------------------------------------------------------------------------- */

export async function supprimerFormulation(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const supabase = sb()
  // CASCADE configuré côté FK → supprime aussi les ingrédients
  const { error } = await supabase
    .from('formulations')
    .delete()
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/formulation')
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  TOGGLE actif                                                              */
/* -------------------------------------------------------------------------- */

export async function basculerFormulationActive(
  id: string,
  actif: boolean,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const supabase = sb()
  const { error } = await supabase
    .from('formulations')
    .update({ actif })
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/formulation')
  return { ok: true }
}
