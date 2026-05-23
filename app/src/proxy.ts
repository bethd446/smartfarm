import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseServerEnv } from '@/lib/supabase/env'

/**
 * Smart Farm — Middleware Next.js
 * -------------------------------------------------------------------------
 * Responsabilités :
 *   1) Rerouter les routes courtes historiques `/biosecurite`, `/mycotoxines`,
 *      `/calendrier-sanitaire`, `/protocoles`, `/maladies`, `/ppa`
 *      vers leur emplacement canonique `/sanitaire/*` (308).
 *   2) (R8) Protéger les routes applicatives (groupe `(app)`) : si pas de
 *      session Supabase, redirect vers `/connexion`.
 *      ⚠️ BYPASS auth-gate si `SMARTFARM_DEMO_MODE != 'false'` ET pas de
 *      session Supabase (mode démo Yamoussoukro : pages accessibles sans
 *      compte). Mais si une session Supabase EST présente, on applique
 *      quand même les gates (auth + onboarding) — sinon la gate F1 Sprint 1
 *      `onboarded_at IS NULL → /onboarding` est court-circuitée en QA.
 *   3) (F1 Sprint 1) Gate onboarding : tout user authentifié sans
 *      `utilisateurs.onboarded_at` est redirigé vers `/onboarding`.
 *
 * Routes publiques (toujours accessibles sans session) :
 *   /                       (landing)
 *   /connexion
 *   /inscription
 *   /mot-de-passe-oublie
 *   /auth/callback
 *   /api/*                  (chaque API gère sa propre auth)
 *   /_next/*, /favicon, etc. (statics)
 */

const SANITAIRE_ALIASES: Record<string, string> = {
  '/biosecurite': '/sanitaire/biosecurite',
  '/mycotoxines': '/sanitaire/mycotoxines',
  '/calendrier-sanitaire': '/sanitaire/calendrier',
  '/protocoles': '/sanitaire/protocoles',
  '/maladies': '/sanitaire/maladies',
  '/ppa': '/sanitaire/ppa',
}

const PUBLIC_PATHS = new Set<string>([
  '/',
  '/connexion',
  '/inscription',
  '/mot-de-passe-oublie',
])

const PUBLIC_PREFIXES = ['/auth/', '/api/', '/_next/', '/static/']

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true
  // fichiers statiques par extension (favicon, images, robots, sw, etc.)
  if (/\.[a-z0-9]{2,4}$/i.test(pathname)) return true
  return false
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1) Redirects sanitaire (priorité)
  const target = SANITAIRE_ALIASES[path]
  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url, 308)
  }

  // 2) Routes publiques : toujours laissées passer
  if (isPublic(path)) {
    return NextResponse.next()
  }

  // 3) On instancie un client Supabase SSR pour lire la session,
  //    AVANT le bypass démo : on veut pouvoir gater l'onboarding même en
  //    mode démo si une session Auth réelle est présente.
  const response = NextResponse.next({ request })

  // Env vars runtime-safe (cf. lib/supabase/env.ts)
  let sbUrl: string
  let sbKey: string
  try {
    const env = getSupabaseServerEnv()
    sbUrl = env.url
    sbKey = env.anonKey
  } catch (err) {
    // En middleware on ne peut pas bloquer toute la prod : log + laisse passer
    console.error('[mw] supabase env missing — bypass auth check:', err)
    return response
  }

  const sb = createServerClient(sbUrl, sbKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await sb.auth.getUser()

  // 4) Bypass mode démo (lecture runtime explicite, pas bake-time edge)
  //    Le bypass ne s'applique QUE si aucune session Supabase n'est présente :
  //    en démo Yamoussoukro on veut que les pages soient visitables sans
  //    auth, mais dès qu'un user s'est inscrit (= a une session), on doit
  //    appliquer la gate onboarding F1 Sprint 1.
  const demoMode = process.env['SMARTFARM_DEMO_MODE']
  const demoBypass = demoMode !== 'false'

  if (demoBypass && !user) {
    console.log('[mw] demo-bypass (no session)', { path })
    return NextResponse.next()
  }

  // 5) Mode prod (ou démo avec session) : exiger l'auth sur les routes app
  if (!user) {
    console.log('[mw] no-user → /connexion', { path })
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // 6) F1 Sprint 1 — Gate onboarding : si user authentifié mais pas encore
  //    onboardé (onboarded_at IS NULL), on force le passage par /onboarding.
  //    Exception : la page /onboarding elle-même (sinon boucle infinie) +
  //    les server actions / api qui pourraient être appelées depuis le wizard.
  if (path !== '/onboarding' && !path.startsWith('/onboarding/')) {
    const { data: profil, error: profilErr } = await sb
      .from('utilisateurs')
      .select('onboarded_at')
      .eq('auth_id', user.id)
      .maybeSingle()

    console.log('[mw] onboarding-check', {
      path,
      userId: user.id,
      profil,
      profilErr: profilErr?.message,
      demoBypass,
    })

    if (profil && !profil.onboarded_at) {
      console.log('[mw] → redirect /onboarding', { userId: user.id })
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  // Note : depuis Next.js 16, Proxy tourne toujours en Node.js runtime
  // (l'option `runtime: 'nodejs'` n'est plus autorisée et casse le build).
  matcher: [
    /*
     * Match toutes les routes SAUF :
     *  - _next/static, _next/image (assets build Next)
     *  - favicon, sitemap, robots, manifest
     *  - fichiers avec extension (images publiques, etc.)
     * Le filtrage fin (public vs (app)) est fait dans `proxy()` ci-dessus.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json).*)',
  ],
}
