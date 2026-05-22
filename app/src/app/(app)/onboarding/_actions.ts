'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * F1 Sprint 1 — Server Action de finalisation du wizard d'onboarding.
 *
 * Délègue toute la logique métier à la RPC SQL `bootstrap_ferme` (migration
 * 20260522190000) qui :
 *   1. Vérifie auth.uid()
 *   2. INSERT public.fermes (déclenche le trigger seed_nouvelle_ferme L3 →
 *      5 bâtiments standards + matières premières + protocoles + concentrés)
 *   3. INSERT public.utilisateur_fermes (rôle admin)
 *   4. UPDATE public.utilisateurs SET role='admin', onboarded_at=now()
 *
 * Retour :
 *   - Succès : { ok: true, fermeId }  (le caller redirige côté client)
 *   - Erreur : { ok: false, error }
 *
 * On évite redirect() ici pour pouvoir afficher l'erreur dans le formulaire.
 */
export type OnboardingResult =
  | { ok: true; fermeId: string }
  | { ok: false; error: string }

export async function completeOnboardingAction(formData: FormData): Promise<OnboardingResult> {
  // ---- 1. Parse + validation côté serveur ---------------------------------
  const nom = String(formData.get('nom') ?? '').trim()
  const localisation = String(formData.get('localisation') ?? '').trim()
  const telephone = String(formData.get('telephone') ?? '').trim()

  if (nom.length < 2) {
    return { ok: false, error: 'Le nom de la ferme doit contenir au moins 2 caractères.' }
  }

  // Races : multi-select → text[] (filtre sur les valeurs autorisées)
  const RACES_AUTORISEES = new Set([
    'Large White', 'Landrace', 'Duroc', 'Piétrain', 'Croisé F1', 'Métis local',
  ])
  const racesRaw = formData.getAll('races').map((r) => String(r))
  const races = racesRaw.filter((r) => RACES_AUTORISEES.has(r))

  // Effectifs : nombres entiers >= 0 (informatif uniquement)
  const parseInt0 = (v: FormDataEntryValue | null) => {
    const n = parseInt(String(v ?? '0'), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  const effectifs = {
    truies:    parseInt0(formData.get('truies')),
    verrats:   parseInt0(formData.get('verrats')),
    porcelets: parseInt0(formData.get('porcelets')),
  }

  // ---- 2. Appel RPC bootstrap_ferme ---------------------------------------
  const sb = await createClient()

  const { data: fermeId, error } = await sb.rpc('bootstrap_ferme', {
    p_nom:          nom,
    p_localisation: localisation || null,
    p_telephone:    telephone || null,
    p_races:        races.length > 0 ? races : null,
    p_effectifs:    effectifs,
  })

  if (error) {
    // Messages parlants pour les cas connus
    let msg = error.message ?? 'Erreur inconnue'
    if (msg.includes('Non authentifié')) {
      msg = 'Session expirée. Reconnectez-vous puis réessayez.'
    } else if (msg.includes('Profil utilisateur introuvable')) {
      msg = 'Profil utilisateur incomplet. Contactez le support.'
    }
    return { ok: false, error: msg }
  }

  if (!fermeId || typeof fermeId !== 'string') {
    return { ok: false, error: 'La ferme a été créée mais l\'ID est introuvable. Rechargez la page.' }
  }

  // ---- 3. Invalide le cache pour rafraîchir layout (sidebar) + dashboard --
  revalidatePath('/', 'layout')

  return { ok: true, fermeId }
}
