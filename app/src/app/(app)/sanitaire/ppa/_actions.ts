'use server'

/**
 * V2 Sprint A — SA-B : Server Actions PPA (Peste Porcine Africaine).
 *
 * Référentiel OIE/WOAH — maladie à déclaration obligatoire.
 * Enregistre une observation clinique suspecte dans `ppa_observations`.
 */

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

const NIVEAUX = ['faible', 'moyen', 'eleve', 'tres_eleve'] as const
export type NiveauSuspicion = (typeof NIVEAUX)[number]

const RESULTATS = ['en_attente', 'negatif', 'positif', 'indetermine'] as const

function nonEmpty(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function toNumOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function toIntOrNull(v: unknown): number | null {
  const n = toNumOrNull(v)
  return n === null ? null : Math.trunc(n)
}

function boolFromForm(v: FormDataEntryValue | null): boolean {
  if (v === null) return false
  const s = String(v).toLowerCase()
  return s === 'on' || s === 'true' || s === '1' || s === 'yes'
}

/**
 * Enregistre une observation clinique suspecte de PPA.
 *
 * Inputs FormData attendus :
 *   - date_observation         (string YYYY-MM-DD, défaut today)
 *   - nb_animaux_affectes      (int ≥ 1)
 *   - niveau_suspicion         (faible|moyen|eleve|tres_eleve)
 *   - temperature_max          (numeric, optionnel)
 *   - hemorragies              (checkbox 'on')
 *   - mortalite_subite         (checkbox 'on')
 *   - prostration              (checkbox 'on')
 *   - inappetence              (checkbox 'on')
 *   - cyanose                  (checkbox 'on')
 *   - vomissements             (checkbox 'on')
 *   - declare                  (checkbox 'on')
 *   - date_declaration         (string YYYY-MM-DD, optionnel)
 *   - reference_declaration    (string, optionnel)
 *   - prelevement              (checkbox 'on')
 *   - date_prelevement         (string YYYY-MM-DD, optionnel)
 *   - resultat_laboratoire     (en_attente|negatif|positif|indetermine, optionnel)
 *   - observations             (string libre, optionnel)
 */
export async function enregistrerObservationPPA(
  formData: FormData,
): Promise<ActionResult> {
  const dateObs =
    nonEmpty(formData.get('date_observation')) ??
    new Date().toISOString().slice(0, 10)

  const nb = toIntOrNull(formData.get('nb_animaux_affectes')) ?? 1
  if (nb < 1) return { ok: false, error: 'Nb animaux affectés ≥ 1' }

  const niveau = String(formData.get('niveau_suspicion') ?? '').trim()
  if (!NIVEAUX.includes(niveau as NiveauSuspicion)) {
    return { ok: false, error: 'Niveau de suspicion invalide' }
  }

  const temp = toNumOrNull(formData.get('temperature_max'))

  const hemo = boolFromForm(formData.get('hemorragies'))
  const mortSubite = boolFromForm(formData.get('mortalite_subite'))
  const prostration = boolFromForm(formData.get('prostration'))
  const inappetence = boolFromForm(formData.get('inappetence'))
  const cyanose = boolFromForm(formData.get('cyanose'))
  const vomDiar = boolFromForm(formData.get('vomissements'))

  // Tableau text[] des symptômes cochés — pratique pour reporting
  const symptomes: string[] = []
  if (hemo) symptomes.push('hemorragies_cutanees')
  if (mortSubite) symptomes.push('mortalite_subite')
  if (prostration) symptomes.push('prostration')
  if (inappetence) symptomes.push('inappetence')
  if (cyanose) symptomes.push('cyanose_oreilles')
  if (vomDiar) symptomes.push('vomissements_diarrhees')

  const declare = boolFromForm(formData.get('declare'))
  const dateDeclaration = nonEmpty(formData.get('date_declaration'))
  const refDeclaration = nonEmpty(formData.get('reference_declaration'))

  const prelevement = boolFromForm(formData.get('prelevement'))
  const datePrelevement = nonEmpty(formData.get('date_prelevement'))

  const resultatRaw = nonEmpty(formData.get('resultat_laboratoire'))
  const resultat =
    resultatRaw && (RESULTATS as readonly string[]).includes(resultatRaw)
      ? resultatRaw
      : null

  const obs = nonEmpty(formData.get('observations'))

  const payload = {
    ferme_id: DEMO_FERME_ID,
    date_observation: dateObs,
    nb_animaux_affectes: nb,
    niveau_suspicion: niveau,
    temperature_max: temp,
    symptomes,
    hemorragies_observees: hemo,
    mortalite_subite: mortSubite,
    prostration,
    inappetence,
    cyanose_oreilles: cyanose,
    vomissements_diarrhees: vomDiar,
    declare_aux_autorites: declare,
    date_declaration: dateDeclaration,
    reference_declaration: refDeclaration,
    prelevement_effectue: prelevement,
    date_prelevement: datePrelevement,
    resultat_laboratoire: resultat,
    observations: obs,
  }

  const supabase = sb()
  const { data: inserted, error } = await supabase
    .from('ppa_observations')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/sanitaire/ppa')
  revalidatePath('/sanitaire')
  return { ok: true, id: inserted?.id as string | undefined }
}
