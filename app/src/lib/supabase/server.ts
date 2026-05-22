import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ID de la ferme demo (seed Yamoussoukro)
const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_USER_ID  = '00000000-0000-0000-0000-000000000001'
const DEMO_ROLE     = 'admin'

/**
 * Wrapper Supabase Server pour le mode demo (sans Auth réelle).
 *
 * Stratégie :
 * - En mode demo (par défaut) : utilise `service_role` côté SSR → bypass RLS
 *   sans risque puisqu'il n'y a pas d'auth utilisateur réelle. Aucune modif
 *   nécessaire dans les pages/server actions existantes.
 * - Toutes les tables ont désormais RLS activé + policies multi-tenant prêtes
 *   (migration 20260522090000_rls_complete.sql).
 *
 * Quand Christophe branchera l'auth Supabase Cloud :
 * 1. Définir `SMARTFARM_DEMO_MODE=false` dans .env.local
 * 2. La branche `createServerClient` ci-dessous prend le relais automatiquement
 *    et utilise les cookies de session pour passer les policies RLS
 * 3. Aucune modification de page/server action requise — même signature
 *    `createClient()` exportée.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Mode demo activé si :
  //  - SUPABASE_SERVICE_ROLE_KEY présente, ET
  //  - SMARTFARM_DEMO_MODE n'est pas explicitement à "false"
  const useServiceRole =
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SMARTFARM_DEMO_MODE !== 'false'

  if (useServiceRole) {
    // Mode demo : service_role bypass RLS — sans risque puisque pas d'auth réelle
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            // Tag pour audit logs / traçabilité côté Supabase
            'x-smartfarm-demo-ferme': DEMO_FERME_ID,
          },
        },
      }
    )
  }

  // Mode production : SSR auth réelle (prêt pour quand on branchera Supabase Auth Cloud)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* server component, ignore */ }
        },
      },
    }
  )
}

// Export constantes utiles (server actions, scripts seed, etc.)
export const DEMO = {
  ferme_id: DEMO_FERME_ID,
  user_id:  DEMO_USER_ID,
  role:     DEMO_ROLE,
}
