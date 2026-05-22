import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Smart Farm — Middleware Next.js
 * -------------------------------------------------------------------------
 * Responsabilités :
 *   1) Rerouter les routes courtes historiques `/biosecurite`, `/mycotoxines`,
 *      `/calendrier-sanitaire`, `/protocoles`, `/maladies`, `/ppa`
 *      vers leur emplacement canonique `/sanitaire/*` (308).
 *   2) (R8) Protéger les routes applicatives (groupe `(app)`) : si pas de
 *      session Supabase, redirect vers `/connexion`.
 *      ⚠️ BYPASS COMPLET si `SMARTFARM_DEMO_MODE=true` (mode démo Yamoussoukro).
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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1) Redirects sanitaire (priorité)
  const target = SANITAIRE_ALIASES[path]
  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url, 308)
  }

  // 2) Bypass mode démo — lecture runtime explicite (pas bake-time edge)
  //    Note : on lit process.env à chaque request, pas en module-scope
  const demoMode = process.env['SMARTFARM_DEMO_MODE']
  if (demoMode !== 'false') {
    return NextResponse.next()
  }

  // 3) Mode prod : gate auth sur les routes applicatives
  if (isPublic(path)) {
    return NextResponse.next()
  }

  // Vérifier la session Supabase via les cookies de la requête
  const response = NextResponse.next({ request })

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  )

  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // 4) F1 Sprint 1 — Gate onboarding : si user authentifié mais pas encore
  //    onboardé (onboarded_at IS NULL), on force le passage par /onboarding.
  //    Exception : la page /onboarding elle-même (sinon boucle infinie) +
  //    les server actions / api qui pourraient être appelées depuis le wizard.
  if (path !== '/onboarding' && !path.startsWith('/onboarding/')) {
    const { data: profil } = await sb
      .from('utilisateurs')
      .select('onboarded_at')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (profil && !profil.onboarded_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  // ⚠️ Runtime Node.js obligatoire (pas edge) :
  //   - Hostinger LiteSpeed/LSNODE ne supporte pas edge workers
  //   - process.env.SMARTFARM_DEMO_MODE doit être lu au runtime, pas bake-time
  runtime: 'nodejs',
  matcher: [
    /*
     * Match toutes les routes SAUF :
     *  - _next/static, _next/image (assets build Next)
     *  - favicon, sitemap, robots, manifest
     *  - fichiers avec extension (images publiques, etc.)
     * Le filtrage fin (public vs (app)) est fait dans `middleware()` ci-dessus.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json).*)',
  ],
}
