'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { schemaMatiere, type MatiereInput } from './_schemas'

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function buildPayload(parsed: ReturnType<typeof schemaMatiere.parse>) {
  return {
    nom: parsed.nom.trim(),
    type: parsed.type ?? 'matiere_premiere',
    unite: parsed.unite?.trim() || 'kg',
    categorie_nutritionnelle: parsed.categorie_nutritionnelle
      ? parsed.categorie_nutritionnelle
      : null,
    origine: parsed.origine ? parsed.origine : null,
    fournisseur: strOrNull(parsed.fournisseur),
    mat_pct: numOrNull(parsed.mat_pct),
    em_porc_kcal_kg: numOrNull(parsed.em_porc_kcal_kg),
    lysine_pct: numOrNull(parsed.lysine_pct),
    methionine_pct: numOrNull(parsed.methionine_pct),
    calcium_pct: numOrNull(parsed.calcium_pct),
    phosphore_pct: numOrNull(parsed.phosphore_pct),
    fibre_pct: numOrNull(parsed.fibre_pct),
    matiere_seche_pct: numOrNull(parsed.matiere_seche_pct) ?? 88,
    prix_indicatif_xof_kg: numOrNull(parsed.prix_indicatif_xof_kg),
    cout_moyen_unite:
      numOrNull(parsed.cout_moyen_unite) ??
      numOrNull(parsed.prix_indicatif_xof_kg),
    stock_actuel: numOrNull(parsed.stock_actuel) ?? 0,
    seuil_alerte: numOrNull(parsed.seuil_alerte),
    notes_terrain: strOrNull(parsed.notes_terrain),
    observations: strOrNull(parsed.observations),
  }
}

/* -------------------------------------------------------------------------- */
/*  CREATE                                                                    */
/* -------------------------------------------------------------------------- */

export async function creerMatiere(data: MatiereInput): Promise<ActionResult> {
  const parsed = schemaMatiere.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  const payload = {
    ferme_id: DEMO_FERME_ID,
    ...buildPayload(parsed.data),
  }
  const { data: inserted, error } = await sb()
    .from('matieres_premieres')
    .insert(payload)
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  revalidatePath('/alimentation')
  return { ok: true, id: inserted?.id as string | undefined }
}

/* -------------------------------------------------------------------------- */
/*  UPDATE                                                                    */
/* -------------------------------------------------------------------------- */

export async function modifierMatiere(data: MatiereInput): Promise<ActionResult> {
  const parsed = schemaMatiere.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  if (!parsed.data.id) return { ok: false, error: 'Identifiant manquant' }

  const payload = buildPayload(parsed.data)
  const { error } = await sb()
    .from('matieres_premieres')
    .update(payload)
    .eq('id', parsed.data.id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  revalidatePath('/alimentation')
  return { ok: true, id: parsed.data.id }
}

/* -------------------------------------------------------------------------- */
/*  DELETE                                                                    */
/* -------------------------------------------------------------------------- */

export async function supprimerMatiere(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const { error } = await sb()
    .from('matieres_premieres')
    .delete()
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  RESET catalogues standards                                                */
/* -------------------------------------------------------------------------- */

export async function reinitialiserMatieresStandards(): Promise<ActionResult> {
  const supa = sb()
  const { error: e1 } = await supa.rpc('seed_matieres_premieres_standards', {
    p_ferme: DEMO_FERME_ID,
  })
  if (e1) return { ok: false, error: e1.message }
  const { error: e2 } = await supa.rpc('seed_concentres_industriels_standards', {
    p_ferme: DEMO_FERME_ID,
  })
  if (e2) return { ok: false, error: e2.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  revalidatePath('/alimentation')
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  Ajustement stock rapide (depuis page concentrés)                          */
/* -------------------------------------------------------------------------- */

export async function ajouterStockMatiere(
  id: string,
  delta: number,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  if (!Number.isFinite(delta)) {
    return { ok: false, error: 'Quantité invalide' }
  }
  const supa = sb()
  const { data: row, error: errRead } = await supa
    .from('matieres_premieres')
    .select('stock_actuel')
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
    .single()
  if (errRead) return { ok: false, error: errRead.message }
  const newStock = Math.max(0, Number(row?.stock_actuel ?? 0) + delta)
  const { error } = await supa
    .from('matieres_premieres')
    .update({ stock_actuel: newStock })
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  revalidatePath('/alimentation')
  return { ok: true }
}
