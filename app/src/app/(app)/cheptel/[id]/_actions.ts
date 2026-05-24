'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { z } from 'zod'
import {
  TOUS_LES_STADES,
  nouvelleCategoriePourStade,
  type StadeAnimal,
} from '@/lib/stades-animaux'

/**
 * F1 — Changement manuel de stade zootechnique sur fiche animal.
 *
 * Met à jour `animaux.stade` (+ `animaux.categorie` si bascule cochette → truie),
 * et trace le changement dans `audit_log` avec le motif éventuel.
 *
 * Note : le trigger BDD sur `animaux` insère déjà une ligne UPDATE dans
 * `audit_log` ; on ajoute en plus une entrée explicite action='STADE_CHANGE'
 * pour rendre l'historique métier facilement requêtable + porter le motif.
 */
const schemaChangerStade = z.object({
  animal_id: z.string().uuid('Animal invalide'),
  nouveau_stade: z.enum(TOUS_LES_STADES as [StadeAnimal, ...StadeAnimal[]]),
  motif: z
    .string()
    .max(500, 'Motif trop long (500 caractères max)')
    .optional()
    .or(z.literal('')),
})

export async function changerStade(input: {
  animal_id: string
  nouveau_stade: string
  motif?: string
}): Promise<
  | { ok: true; ancien_stade: string; nouveau_stade: string }
  | { ok: false; error: string }
> {
  const parsed = schemaChangerStade.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Validation échouée'
    console.error('[changerStade] Validation échouée', parsed.error.issues)
    return { ok: false, error: msg }
  }
  const { animal_id, nouveau_stade, motif } = parsed.data
  const supabase = await createClient()

  const { data: animal, error: fetchErr } = await supabase
    .from('animaux')
    .select('id, ferme_id, tag, categorie, stade')
    .eq('id', animal_id)
    .maybeSingle()

  if (fetchErr || !animal) {
    console.error('[changerStade] Animal introuvable', fetchErr)
    return { ok: false, error: 'Animal introuvable' }
  }

  if (animal.categorie === 'verrat') {
    return {
      ok: false,
      error: 'Le stade d’un verrat n’est pas modifiable',
    }
  }

  const ancien_stade = String(animal.stade ?? '')
  if (ancien_stade === nouveau_stade) {
    return { ok: false, error: 'Le nouveau stade est identique à l’actuel' }
  }

  const bascule = nouvelleCategoriePourStade(
    animal.categorie as string,
    nouveau_stade as StadeAnimal,
  )

  const updatePayload: Record<string, unknown> = { stade: nouveau_stade }
  if (bascule) updatePayload.categorie = bascule

  const { error: updErr } = await supabase
    .from('animaux')
    .update(updatePayload)
    .eq('id', animal_id)

  if (updErr) {
    console.error('[changerStade] UPDATE animaux échoué', updErr)
    return { ok: false, error: `Échec mise à jour : ${updErr.message}` }
  }

  // Entrée audit_log explicite (motif + ancien/nouveau stade)
  const { error: auditErr } = await supabase.from('audit_log').insert({
    table_name: 'animaux',
    row_id: animal_id,
    action: 'STADE_CHANGE',
    ferme_id: animal.ferme_id,
    before_data: { stade: ancien_stade, categorie: animal.categorie },
    after_data: {
      stade: nouveau_stade,
      categorie: bascule ?? animal.categorie,
      motif: motif && motif.length > 0 ? motif : null,
    },
  })
  if (auditErr) {
    // Non bloquant — le trigger BDD a déjà tracé l'UPDATE
    console.error('[changerStade] audit_log insert (non bloquant)', auditErr)
  }

  revalidatePath('/cheptel')
  revalidatePath(`/cheptel/${animal_id}`)
  revalidatePath('/dashboard')

  return { ok: true, ancien_stade, nouveau_stade }
}

/**
 * PROD-B — Saisie BCS rapide 1-tap depuis la fiche /cheptel/[id].
 * Stockée dans `observations_bcs` (table légère créée par migration).
 * NB : service_role car écriture côté serveur (RLS V2 permissive,
 *      pattern identique aux autres _actions.ts du module).
 */
export async function saisirBcsRapide(formData: FormData) {
  const animal_id = String(formData.get('animal_id') ?? '')
  const bcs = parseFloat(String(formData.get('bcs') ?? '0'))
  if (!animal_id || !Number.isFinite(bcs) || bcs < 1 || bcs > 5) return

  const supabase = await createClient()

  // Récupère ferme_id de l'animal (RLS-friendly, multi-fermes)
  const { data: animal } = await supabase
    .from('animaux')
    .select('ferme_id')
    .eq('id', animal_id)
    .maybeSingle()

  if (!animal?.ferme_id) return

  await supabase.from('observations_bcs').insert({
    animal_id,
    ferme_id: animal.ferme_id,
    bcs,
  })

  revalidatePath(`/cheptel/${animal_id}`)
}

/**
 * H1 — Upload photo animal vers Supabase Storage (bucket 'animaux_photos').
 *
 * R7-P1 V2+V7 — Sécurisé :
 * - Path scopé : `<ferme_id>/<animal_id>/<uuid>.<ext>` (RLS policy storage.objects)
 * - Validation MIME stricte côté server (whitelist) — plus de startsWith('image/')
 * - Validation taille 5 Mo côté server
 * - Bucket privé (public=false) → getSignedUrl au lieu de getPublicUrl
 *
 * Mode demo : service_role bypass RLS, mais path est correctement scopé via
 * ferme_id (récupéré de la table animaux) → identique à comportement prod.
 */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}
const MAX_PHOTO_BYTES = 5 * 1024 * 1024  // 5 Mo
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 // 1 an (durée longue, bucket privé)

export async function uploadPhotoAnimal(formData: FormData) {
  const animal_id = String(formData.get('animal_id') ?? '')
  const file = formData.get('photo') as File | null
  if (!animal_id || !file || file.size === 0) {
    return { ok: false, error: 'Aucune photo fournie' }
  }

  // R7-P1 V7 — Validation MIME stricte (whitelist) + taille
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: `Format non supporté (jpg, png, webp uniquement) — reçu ${file.type || 'inconnu'}` }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'Photo trop volumineuse (max 5 Mo)' }
  }

  const supabase = await createClient()

  // Vérifie que l'animal existe + récupère son ferme_id pour scoper le path
  const { data: animal } = await supabase
    .from('animaux')
    .select('id, ferme_id, photo_url')
    .eq('id', animal_id)
    .maybeSingle()
  if (!animal) return { ok: false, error: 'Animal introuvable' }

  // R7-P1 V2 — Path scopé ferme_id (RLS storage.objects ne valide que ce préfixe)
  // En mode prod (auth), `getFermeId()` retournera la ferme du user authentifié,
  // qui devrait correspondre à animal.ferme_id (sinon = tentative cross-tenant).
  const ferme_id = animal.ferme_id ?? (await getFermeId())
  const ext = ALLOWED_EXT_BY_MIME[file.type] ?? 'jpg'
  const safeName = `${crypto.randomUUID()}.${ext}`
  const path = `${ferme_id}/${animal_id}/${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: upErr } = await supabase.storage
    .from('animaux_photos')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (upErr) {
    return { ok: false, error: `Échec upload : ${upErr.message}` }
  }

  // R7-P1 V2 — bucket privé → signed URL (1 an, à régénérer Phase 2 via Server Action)
  const { data: signed, error: signErr } = await supabase
    .storage
    .from('animaux_photos')
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: `Échec génération URL : ${signErr?.message ?? 'inconnue'}` }
  }
  const photoUrl = signed.signedUrl

  const { error: updErr } = await supabase
    .from('animaux')
    .update({ photo_url: photoUrl })
    .eq('id', animal_id)
  if (updErr) {
    return { ok: false, error: `Échec UPDATE : ${updErr.message}` }
  }

  revalidatePath(`/cheptel/${animal_id}`)
  return { ok: true, url: photoUrl }
}
