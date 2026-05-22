'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'

/**
 * PROD-B — Saisie BCS rapide 1-tap depuis la fiche /cheptel/[id].
 * Stockée dans `observations_bcs` (table légère créée par migration).
 * NB : service_role car écriture côté serveur (RLS V2 permissive,
 *      pattern identique aux autres _actions.ts du module).
 */
function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function saisirBcsRapide(formData: FormData) {
  const animal_id = String(formData.get('animal_id') ?? '')
  const bcs = parseFloat(String(formData.get('bcs') ?? '0'))
  if (!animal_id || !Number.isFinite(bcs) || bcs < 1 || bcs > 5) return

  const supabase = sb()

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

  const supabase = sb()

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
