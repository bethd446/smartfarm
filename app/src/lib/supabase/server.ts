import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServerEnv, getSupabaseServiceEnv } from './env'

/**
 * SPRINT 2 FIX RLS — Wrapper Supabase côté serveur.
 *
 * ⚠️ RÈGLE D'OR (cf. /root/projects/smartfarm/.brain/SPRINT_2_FIX_RLS.md) :
 *   En PROD, on NE bypass JAMAIS RLS depuis les Server Actions.
 *   Toutes les queries doivent passer par les policies via la session cookie
 *   du user authentifié → isolation multi-tenant garantie par Postgres.
 *
 * Deux clients sont exportés :
 *
 *  - `createClient()` (DEFAULT) — Client SSR auth réelle, cookies de session.
 *      Utiliser dans 100% des Server Actions et Route Handlers normaux.
 *      RLS s'applique → un user ne voit que les rows de sa ferme.
 *
 *  - `createServiceClient()` (EXPLICITE) — Bypass RLS via service_role.
 *      Réservé aux rares cas qui ne peuvent pas avoir de session user :
 *        * Cron jobs (refresh KPI MV, etc.)
 *        * Bootstrap / seeds (scripts CLI uniquement)
 *        * Webhooks signés (Stripe, etc.)
 *      JAMAIS appelé depuis un fichier `_actions.ts` qui sert du trafic user.
 *
 * Le mode démo "service_role partout" a été supprimé : la fuite cross-tenant
 * observée sur smartfarm.group (user 13smartfarm voit la ferme Yamoussoukro)
 * provenait précisément de ce bypass.
 *
 * Si on a besoin d'un mode démo non-authentifié, il faut un USER démo réel
 * en BDD + se connecter avec ce user — pas bypass RLS.
 *
 * Lecture des env vars : centralisée dans `./env.ts` (runtime-safe, gère le
 * fait que Next.js 16 inline les NEXT_PUBLIC_* au build, qui ne sont pas
 * dispo lors du build Hostinger Cloud).
 */

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_ROLE = 'admin'

/**
 * createClient — Client Supabase SSR avec session cookie.
 *
 * RLS s'applique. À utiliser PARTOUT dans les Server Actions / Server
 * Components / Route Handlers. Si pas de session, les SELECT renverront
 * 0 rows (cf. policies `auth.uid() IS NOT NULL`).
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseServerEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          /* server component, ignore */
        }
      },
    },
  })
}

/**
 * createServiceClient — ⚠️ BYPASS RLS — usage explicite uniquement.
 *
 * À n'utiliser QUE pour :
 *  - cron jobs admin (refresh_kpi_views, etc.)
 *  - scripts CLI / seed
 *  - webhooks vérifiés par signature
 *
 * Throw si SUPABASE_SERVICE_ROLE_KEY absent → on évite tout fallback silencieux.
 */
export async function createServiceClient() {
  const { url, serviceKey } = getSupabaseServiceEnv()
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Constantes legacy (seeds, tests). Plus utilisées en runtime.
export const DEMO = {
  ferme_id: DEMO_FERME_ID,
  user_id: DEMO_USER_ID,
  role: DEMO_ROLE,
}
