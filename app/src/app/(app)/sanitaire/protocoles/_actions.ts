'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import {
  schemaProtocole,
  parseRappelsJours,
  type ProtocoleInput,
} from './_schemas'

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
/*  Construction du payload commun create/update                              */
/* -------------------------------------------------------------------------- */

function buildPayload(parsed: ReturnType<typeof schemaProtocole.parse>) {
  const rappels = parseRappelsJours(
    typeof parsed.rappels_jours === 'string' ? parsed.rappels_jours : '',
  )
  return {
    nom: parsed.nom.trim(),
    description:
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : null,
    categorie_cible: parsed.categorie_cible ? parsed.categorie_cible : null,
    age_jours:
      typeof parsed.age_jours === 'number' && Number.isFinite(parsed.age_jours)
        ? parsed.age_jours
        : null,
    produit:
      typeof parsed.produit === 'string' && parsed.produit.trim()
        ? parsed.produit.trim()
        : null,
    voie: parsed.voie ? parsed.voie : null,
    dose_ml:
      typeof parsed.dose_ml === 'number' && Number.isFinite(parsed.dose_ml)
        ? parsed.dose_ml
        : null,
    rappel_jours: rappels.length > 0 ? rappels[0] : null,
    rappels_jours: rappels,
    obligatoire: !!parsed.obligatoire,
    actif: parsed.actif === undefined ? true : !!parsed.actif,
  }
}

/* -------------------------------------------------------------------------- */
/*  CREATE                                                                    */
/* -------------------------------------------------------------------------- */

export async function creerProtocole(data: ProtocoleInput): Promise<ActionResult> {
  const parsed = schemaProtocole.safeParse(data)
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
  const supabase = sb()
  const { data: inserted, error } = await supabase
    .from('protocoles_vaccinaux')
    .insert(payload)
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sanitaire/protocoles')
  revalidatePath('/sanitaire')
  return { ok: true, id: inserted?.id as string | undefined }
}

/* -------------------------------------------------------------------------- */
/*  UPDATE                                                                    */
/* -------------------------------------------------------------------------- */

export async function modifierProtocole(data: ProtocoleInput): Promise<ActionResult> {
  const parsed = schemaProtocole.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Données invalides',
    }
  }
  if (!parsed.data.id) return { ok: false, error: 'Identifiant manquant' }

  const payload = buildPayload(parsed.data)
  const supabase = sb()
  const { error } = await supabase
    .from('protocoles_vaccinaux')
    .update(payload)
    .eq('id', parsed.data.id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sanitaire/protocoles')
  revalidatePath('/sanitaire')
  return { ok: true, id: parsed.data.id }
}

/* -------------------------------------------------------------------------- */
/*  TOGGLE actif / DELETE                                                     */
/* -------------------------------------------------------------------------- */

export async function basculerProtocoleActif(
  id: string,
  actif: boolean,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const supabase = sb()
  const { error } = await supabase
    .from('protocoles_vaccinaux')
    .update({ actif })
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sanitaire/protocoles')
  return { ok: true }
}

export async function supprimerProtocole(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Identifiant manquant' }
  const supabase = sb()
  const { error } = await supabase
    .from('protocoles_vaccinaux')
    .delete()
    .eq('id', id)
    .eq('ferme_id', DEMO_FERME_ID)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sanitaire/protocoles')
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  RESET aux 12 standards (appelle la fonction SQL seed_protocoles_standards) */
/* -------------------------------------------------------------------------- */

export async function reinitialiserProtocolesStandards(): Promise<ActionResult> {
  const supabase = sb()
  const { error } = await supabase.rpc('seed_protocoles_standards', {
    p_ferme: DEMO_FERME_ID,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sanitaire/protocoles')
  revalidatePath('/sanitaire')
  return { ok: true }
}
