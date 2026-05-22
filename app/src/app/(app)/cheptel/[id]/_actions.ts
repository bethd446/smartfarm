'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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
 * 1. Reçoit FormData avec `animal_id` + `photo` (File)
 * 2. Upload dans `animaux_photos/<animal_id>/<timestamp>-<filename>`
 *    (upsert=false pour conserver l'historique)
 * 3. UPDATE animaux.photo_url = public URL
 * 4. revalidatePath
 */
export async function uploadPhotoAnimal(formData: FormData) {
  const animal_id = String(formData.get('animal_id') ?? '')
  const file = formData.get('photo') as File | null
  if (!animal_id || !file || file.size === 0) {
    return { ok: false, error: 'Aucune photo fournie' }
  }

  // Validation taille (max 5 Mo) et type (image/*)
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: 'Photo trop volumineuse (max 5 Mo)' }
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Format non supporté (image uniquement)' }
  }

  const supabase = sb()

  // Vérifie que l'animal existe
  const { data: animal } = await supabase
    .from('animaux')
    .select('id, ferme_id, photo_url')
    .eq('id', animal_id)
    .maybeSingle()
  if (!animal) return { ok: false, error: 'Animal introuvable' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeName = `${Date.now()}.${ext}`
  const path = `${animal_id}/${safeName}`

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

  const { data: pub } = supabase.storage.from('animaux_photos').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: updErr } = await supabase
    .from('animaux')
    .update({ photo_url: publicUrl })
    .eq('id', animal_id)
  if (updErr) {
    return { ok: false, error: `Échec UPDATE : ${updErr.message}` }
  }

  revalidatePath(`/cheptel/${animal_id}`)
  return { ok: true, url: publicUrl }
}
