/**
 * G2 — P0-6 — Multi-tenant : helper getFermeId() + constante DEMO_FERME_ID.
 *
 * Stratégie minimale pour préparer le multi-tenant sans casser le mode demo :
 *
 * 1. Mode demo (par défaut, SMARTFARM_DEMO_MODE != 'false') :
 *    - getFermeId() retourne la constante DEMO_FERME_ID hardcodée.
 *    - service_role bypass RLS via createClient() (cf. ./server.ts).
 *
 * 2. Mode production (SMARTFARM_DEMO_MODE='false') :
 *    - getFermeId() résoud la ferme depuis le user via Supabase Auth.
 *    - Server Actions doivent utiliser createClient() SSR auth (cf. ./server.ts).
 *
 * Migration progressive : les server actions remplacent
 *   `const DEMO_FERME_ID = '...'`
 * par
 *   `import { getFermeId } from '@/lib/supabase/ferme-context'`
 *   `const ferme_id = await getFermeId()`
 *
 * Quand `SMARTFARM_DEMO_MODE=false`, le helper bascule transparent.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ID de la ferme demo (seed Yamoussoukro)
export const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_USER_ID  = '00000000-0000-0000-0000-000000000001'

/**
 * isDemoMode — Renvoie true si l'app tourne en mode demo.
 * Mode demo = SUPABASE_SERVICE_ROLE_KEY présent ET SMARTFARM_DEMO_MODE != 'false'.
 */
export function isDemoMode(): boolean {
  return (
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SMARTFARM_DEMO_MODE !== 'false'
  )
}

/**
 * getFermeId — Retourne l'id de la ferme courante.
 *
 * - En mode demo : DEMO_FERME_ID (constante).
 * - En mode prod : ferme rattachée au user_id depuis Supabase Auth, via la
 *   fonction PG `current_farm_id()` (déjà déployée — cf. migration RLS).
 *
 * @throws Error si mode prod et user non authentifié ou pas de ferme assignée.
 */
export async function getFermeId(): Promise<string> {
  if (isDemoMode()) {
    return DEMO_FERME_ID
  }

  // Mode production : résolution via session Supabase Auth + RPC current_farm_id().
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only ici */ },
      },
    },
  )

  const { data: { user }, error: errUser } = await supabase.auth.getUser()
  if (errUser || !user) {
    throw new Error('Non authentifié — getFermeId() requiert un user')
  }

  const { data: fermeId, error: errFn } = await supabase.rpc('current_farm_id')
  if (errFn || !fermeId) {
    throw new Error('Aucune ferme rattachée au user ' + user.id)
  }
  return fermeId as string
}
