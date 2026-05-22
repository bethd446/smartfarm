'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

const STATUTS_VALIDES = [
  'preparation',
  'active',
  'sevree',
  'engraissement',
  'finie',
] as const

export async function creerBande(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const nom = String(formData.get('nom') ?? '').trim()
    const code = String(formData.get('code') ?? '').trim()
    const date_debut = String(formData.get('date_debut') ?? '').trim()
    const date_fin_prevue = String(formData.get('date_fin_prevue') ?? '').trim()
    const statut = String(formData.get('statut') ?? 'preparation').trim()
    const observations = String(formData.get('observations') ?? '').trim()

    if (!nom) return { ok: false, error: 'Le nom est requis.' }
    if (!code) return { ok: false, error: 'Le code est requis.' }
    if (!date_debut) return { ok: false, error: 'La date de début est requise.' }
    if (!STATUTS_VALIDES.includes(statut as (typeof STATUTS_VALIDES)[number])) {
      return { ok: false, error: 'Statut invalide.' }
    }

    const payload: Record<string, unknown> = {
      ferme_id: DEMO_FERME_ID,
      nom,
      code,
      date_debut,
      statut,
    }
    if (date_fin_prevue) payload.date_fin_prevue = date_fin_prevue
    if (observations) payload.observations = observations

    const supabase = sb()
    const { error } = await supabase.from('bandes').insert(payload)
    if (error) return { ok: false, error: error.message }

    revalidatePath('/bandes')
    return { ok: true }
  } catch (e) {
    console.error('[creerBande] unexpected error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}
