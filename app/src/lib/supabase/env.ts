/**
 * Smart Farm — Lecture runtime-safe des env vars Supabase.
 * -----------------------------------------------------------------------------
 * POURQUOI CE FICHIER :
 *
 * Next.js 16 + Turbopack inline littéralement les `process.env.NEXT_PUBLIC_*`
 * au moment du `next build`. Sur Hostinger Cloud, le build tourne dans un
 * environnement où ces vars NE SONT PAS exposées (elles le sont seulement
 * au runtime du worker Node), donc le bundle compilé contient `undefined`
 * en dur dans les Server Actions et middlewares → @supabase/ssr crash avec :
 *
 *   "Your project's URL and Key are required to create a Supabase client!"
 *
 * Symptôme côté user : HTTP 500 "ERROR <random>" sur toute action serveur.
 *
 * SOLUTION :
 *
 *  - Côté SERVER (Server Actions, Route Handlers, middleware) : on lit les
 *    vars via `getSupabaseServerEnv()` qui chaîne `NEXT_PUBLIC_*` puis le
 *    fallback `SUPABASE_*` (variants NON inlinés car non préfixés). Pour que
 *    le fallback fonctionne il FAUT que Hostinger expose `SUPABASE_URL` et
 *    `SUPABASE_ANON_KEY` dans les env vars du projet (en plus des
 *    `NEXT_PUBLIC_*`).
 *
 *  - Côté CLIENT (browser) : le bundle DOIT contenir les vars en dur, on les
 *    lit donc uniquement via `NEXT_PUBLIC_*` (sinon le client ne peut pas
 *    parler à Supabase). `getSupabaseClientEnv()` fait ça et throw clair si
 *    le build n'a pas inliné.
 *
 * Throw explicite si manquant → on évite les erreurs opaques de @supabase/ssr.
 * -----------------------------------------------------------------------------
 */

export type SupabaseEnv = { url: string; anonKey: string }

/**
 * Lecture runtime-safe pour les contextes SERVEUR (Server Action, Route
 * Handler, middleware/proxy, Server Component).
 *
 * Lit `NEXT_PUBLIC_*` en priorité (couvre le cas où le build a réussi à
 * inliner), sinon fallback sur `SUPABASE_*` non préfixé (lu au runtime).
 */
export function getSupabaseServerEnv(): SupabaseEnv {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''

  if (!url || !anonKey) {
    throw new Error(
      `[supabase-env] Vars manquantes au runtime serveur — ` +
        `url=${url ? 'OK' : 'MISSING'} key=${anonKey ? 'OK' : 'MISSING'}. ` +
        `Définir NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ET SUPABASE_URL/ANON_KEY ` +
        `dans hPanel Hostinger > Variables d'environnement.`,
    )
  }

  return { url, anonKey }
}

/**
 * Lecture du service_role (BYPASS RLS) pour les rares cas admin/cron.
 * Le service_role n'est JAMAIS préfixé `NEXT_PUBLIC_*`.
 */
export function getSupabaseServiceEnv(): { url: string; serviceKey: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !serviceKey) {
    throw new Error(
      `[supabase-env] Service env manquant — ` +
        `url=${url ? 'OK' : 'MISSING'} service=${serviceKey ? 'OK' : 'MISSING'}`,
    )
  }
  return { url, serviceKey }
}

/**
 * Lecture pour le contexte CLIENT (browser). Les valeurs DOIVENT être
 * inlinées par le build (préfixe NEXT_PUBLIC_*). Si elles sont absentes,
 * c'est un bug de build — on throw avec message clair.
 */
export function getSupabaseClientEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !anonKey) {
    throw new Error(
      `[supabase-env] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY absent du bundle client — ` +
        `vérifier que ces vars sont exposées AU MOMENT DU BUILD sur Hostinger.`,
    )
  }
  return { url, anonKey }
}
