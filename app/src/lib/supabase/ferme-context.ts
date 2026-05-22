/**
 * SPRINT 2 FIX RLS — Multi-tenant helper.
 *
 * getFermeId() résoud STRICTEMENT la ferme via la session Supabase Auth :
 *   1. cookies → auth.getUser()
 *   2. RPC current_farm_id() (déjà déployée en BDD, lit user_farms)
 *
 * Plus de fallback hardcodé sur DEMO_FERME_ID (Yamoussoukro). C'était la
 * cause de la fuite cross-tenant observée sur smartfarm.group : dès que
 * SUPABASE_SERVICE_ROLE_KEY était présent dans l'env (cas Hostinger),
 * tous les users récupéraient la ferme démo au lieu de la leur.
 *
 * Comportement :
 *  - User non authentifié → throw 'Non authentifié'
 *  - User sans ferme rattachée → throw 'Aucune ferme rattachée'
 *  - Sinon → string UUID de la ferme.
 *
 * Le caller (Server Action / Page) doit catch et redirect('/connexion')
 * si applicable, sinon laisser remonter (next.js error boundary).
 */

import { createClient } from './server'

// Conservée pour compat (seeds, scripts) — ne plus utiliser en runtime user.
export const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

/**
 * isDemoMode — SUPPRIMÉ. Plus de bypass RLS basé sur env vars.
 *
 * Si on a besoin d'un mode démo, il faut un user démo réel + auth réelle.
 * On laisse la fonction comme stub qui renvoie toujours false pour ne
 * pas casser d'éventuels imports — à supprimer une fois le code nettoyé.
 *
 * @deprecated
 */
export function isDemoMode(): boolean {
  return false
}

/**
 * getFermeId — Retourne l'UUID de la ferme du user authentifié.
 *
 * @throws Error('Non authentifié') si pas de session
 * @throws Error('Aucune ferme rattachée') si user sans user_farms
 */
export async function getFermeId(): Promise<string> {
  const sb = await createClient()

  const {
    data: { user },
    error: errUser,
  } = await sb.auth.getUser()
  if (errUser || !user) {
    throw new Error('Non authentifié')
  }

  const { data: fermeId, error: errFn } = await sb.rpc('current_farm_id')
  if (errFn || !fermeId) {
    throw new Error('Aucune ferme rattachée')
  }
  return fermeId as string
}
