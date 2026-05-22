import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Smart Farm — Handler du callback Supabase Auth
 * -------------------------------------------------------------------------
 * Cible des liens magic-link et confirmations email.
 * Échange le `code` reçu en query contre une session (cookies set ici).
 * Redirige ensuite vers `/dashboard` (ou la page demandée via `?next=`).
 *
 * ⚠️ Origin résolution :
 *   - DERRIÈRE Hostinger LiteSpeed/LSNODE, `request.url` peut contenir
 *     `host: 0.0.0.0:3000` (interne) au lieu du host externe.
 *   - On résout donc l'origin dans l'ordre :
 *     1. NEXT_PUBLIC_APP_URL (env, source de vérité)
 *     2. x-forwarded-host + x-forwarded-proto (proxy headers)
 *     3. request.url.origin (fallback dev local)
 *
 * Note : tout est server-side ; les cookies de session HttpOnly Supabase
 * sont posés par le wrapper `createServerClient` via le cookieStore Next.
 */
function resolveOrigin(request: NextRequest): string {
  // 1) Source de vérité : variable d'env
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')

  // 2) Proxy headers (LSNODE/Traefik/nginx)
  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto')
  if (fwdHost) {
    return `${fwdProto || 'https'}://${fwdHost}`
  }

  // 3) Fallback : URL de la requête (dev local uniquement, peut être 0.0.0.0:3000)
  return new URL(request.url).origin
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = resolveOrigin(request)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) {
      // Best-effort : touch derniere_connexion
      try { await sb.rpc('touch_derniere_connexion') } catch { /* ignore */ }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Échec ou pas de code → renvoie vers la connexion avec message d'erreur
  return NextResponse.redirect(`${origin}/connexion?erreur=callback`)
}
