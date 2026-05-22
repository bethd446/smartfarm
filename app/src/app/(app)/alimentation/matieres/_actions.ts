'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { schemaMatiere, type MatiereInput } from './_schemas'
import { getFermeId } from '@/lib/supabase/ferme-context'

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
    ferme_id: (await getFermeId()),
    ...buildPayload(parsed.data),
  }
  const { data: inserted, error } = await (await createClient())
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
  const { error } = await (await createClient())
    .from('matieres_premieres')
    .update(payload)
    .eq('id', parsed.data.id)
    .eq('ferme_id', (await getFermeId()))
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
  const { error } = await (await createClient())
    .from('matieres_premieres')
    .delete()
    .eq('id', id)
    .eq('ferme_id', (await getFermeId()))
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  RESET catalogues standards                                                */
/* -------------------------------------------------------------------------- */

export async function reinitialiserMatieresStandards(): Promise<ActionResult> {
  const supa = (await createClient())
  const { error: e1 } = await supa.rpc('seed_matieres_premieres_standards', {
    p_ferme: (await getFermeId()),
  })
  if (e1) return { ok: false, error: e1.message }
  const { error: e2 } = await supa.rpc('seed_concentres_industriels_standards', {
    p_ferme: (await getFermeId()),
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
  const supa = (await createClient())
  const { data: row, error: errRead } = await supa
    .from('matieres_premieres')
    .select('stock_actuel')
    .eq('id', id)
    .eq('ferme_id', (await getFermeId()))
    .single()
  if (errRead) return { ok: false, error: errRead.message }
  const newStock = Math.max(0, Number(row?.stock_actuel ?? 0) + delta)
  const { error } = await supa
    .from('matieres_premieres')
    .update({ stock_actuel: newStock })
    .eq('id', id)
    .eq('ferme_id', (await getFermeId()))
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres')
  revalidatePath('/alimentation/concentres')
  revalidatePath('/alimentation')
  return { ok: true }
}
