'use server'

/**
 * V2-F — Server actions Biosécurité.
 * Insert dans `visites_biosecurite`. La checklist est en lecture seule
 * (référentiel statique seedé par migration).
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

const TYPES_VISITE = [
  'visiteur',
  'veterinaire',
  'camion_aliment',
  'camion_animaux',
  'livraison',
  'technicien',
  'autre',
] as const

export type TypeVisite = (typeof TYPES_VISITE)[number]

export type VisiteInput = {
  date_visite?: string
  type_visite: string
  nom_visiteur?: string
  societe?: string
  provenance_ferme_porcine?: boolean
  delai_depuis_derniere_visite_jours?: number | string | ''
  douche_obligatoire_effectuee?: boolean
  changement_tenue?: boolean
  pediluve_utilise?: boolean
  observations?: string
}

function nonEmpty(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function toIntOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export async function enregistrerVisite(data: VisiteInput): Promise<ActionResult> {
  if (!data || !data.type_visite) {
    return { ok: false, error: 'Type de visite requis' }
  }
  if (!TYPES_VISITE.includes(data.type_visite as TypeVisite)) {
    return { ok: false, error: 'Type de visite invalide' }
  }

  const payload: Record<string, unknown> = {
    ferme_id: (await getFermeId()),
    type_visite: data.type_visite,
    nom_visiteur: nonEmpty(data.nom_visiteur),
    societe: nonEmpty(data.societe),
    provenance_ferme_porcine: !!data.provenance_ferme_porcine,
    delai_depuis_derniere_visite_jours: toIntOrNull(
      data.delai_depuis_derniere_visite_jours,
    ),
    douche_obligatoire_effectuee: !!data.douche_obligatoire_effectuee,
    changement_tenue: !!data.changement_tenue,
    pediluve_utilise: !!data.pediluve_utilise,
    observations: nonEmpty(data.observations),
  }

  // date_visite optionnelle : défaut DB = now()
  const dateRaw = nonEmpty(data.date_visite)
  if (dateRaw) payload.date_visite = dateRaw

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('visites_biosecurite')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/sanitaire/biosecurite')
  revalidatePath('/sanitaire')
  return { ok: true, id: inserted?.id as string | undefined }
}

// ---------------------------------------------------------------------------
// POLISH-C — Audit checklist biosécurité (point par point, persistant)
// ---------------------------------------------------------------------------

const STATUTS_AUDIT = ['conforme', 'non_conforme', 'non_evalue'] as const
export type StatutAudit = (typeof STATUTS_AUDIT)[number]

/**
 * Enregistre un audit d'un point de checklist biosécurité (✓ ou ✗).
 *
 * Appelée depuis un `<form action={noterAuditBiosecurite}>` côté page
 * biosécurité. Insère une ligne dans `biosecurite_audits` ; la vue
 * `v_biosecurite_etat_actuel` renvoie automatiquement le dernier audit.
 */
export async function noterAuditBiosecurite(formData: FormData): Promise<void> {
  const checklist_item_id = String(formData.get('checklist_item_id') ?? '').trim()
  const statutRaw = String(formData.get('statut') ?? 'conforme').trim()
  const observationsRaw = formData.get('observations')
  const observations =
    typeof observationsRaw === 'string' && observationsRaw.trim()
      ? observationsRaw.trim()
      : null

  if (!checklist_item_id) return
  if (!STATUTS_AUDIT.includes(statutRaw as StatutAudit)) return

  const supabase = await createClient()

  // Ferme cible : par défaut la ferme démo (cohérent avec enregistrerVisite).
  // En prod multi-fermes, à remplacer par l'ID issu du contexte utilisateur.
  let ferme_id: string | undefined = (await getFermeId())
  const { data: fermes } = await supabase.from('fermes').select('id').limit(1)
  if (fermes?.[0]?.id) ferme_id = fermes[0].id as string
  if (!ferme_id) return

  await supabase.from('biosecurite_audits').insert({
    ferme_id,
    checklist_item_id,
    statut: statutRaw,
    observations,
  })

  revalidatePath('/sanitaire/biosecurite')
}
