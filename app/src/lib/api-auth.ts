import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

/**
 * Protection statique des routes API qui utilisent service_role.
 *
 * Tant que Supabase Auth n'est pas branché (post-migration brouillon), on protège
 * les routes via un token partagé `DEMO_API_TOKEN` (.env.local / .env.production).
 *
 * Le token peut être fourni :
 *  - Header   :  `Authorization: Bearer <TOKEN>`
 *  - Query    :  `?token=<TOKEN>`
 *  - Cookie   :  `sf_api_token=<TOKEN>`
 *
 * Comparaison en temps constant (timingSafeEqual) pour empêcher les attaques timing.
 * Si `DEMO_API_TOKEN` n'est pas défini côté serveur, on refuse TOUT (503).
 *
 * Usage :
 *   const guard = requireApiToken(req)
 *   if (guard) return guard
 */
export function requireApiToken(req: Request): Response | null {
  const expected = process.env.DEMO_API_TOKEN

  if (!expected || expected.length === 0) {
    return NextResponse.json(
      { error: 'API token not configured on server (DEMO_API_TOKEN missing).' },
      { status: 503 },
    )
  }

  const provided = extractToken(req)
  if (!provided) {
    return unauthorized()
  }

  // timingSafeEqual exige des buffers de même longueur.
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) {
    return unauthorized()
  }
  if (!timingSafeEqual(a, b)) {
    return unauthorized()
  }
  return null
}

function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const auth = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
    if (m && m[1]) return m[1].trim()
  }

  // 2. ?token=...
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('token')
    if (q) return q
  } catch {
    // URL invalide — on ignore
  }

  // 3. Cookie sf_api_token
  const cookieHeader = req.headers.get('cookie')
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [rawName, ...rest] = part.split('=')
      if (!rawName) continue
      if (rawName.trim() === 'sf_api_token') {
        return decodeURIComponent(rest.join('=').trim())
      }
    }
  }

  return null
}

function unauthorized(): Response {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
