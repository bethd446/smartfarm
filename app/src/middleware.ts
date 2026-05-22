import { NextRequest, NextResponse } from 'next/server'

/**
 * Smart Farm — Middleware Next.js
 * -------------------------------------------------------------------------
 * Rôle : rerouter les routes courtes historiques (`/biosecurite`,
 * `/mycotoxines`, etc.) vers leur emplacement canonique sous
 * `/sanitaire/*`. Les routes courtes étaient diffusées (dashboard, liens
 * profonds, anciens favoris) avant la consolidation V2 de la rubrique
 * Sanitaire ; sans redirect elles renvoient un 404.
 *
 * V2-HARMONIE (HARM-A) — 22 mai 2026
 *   - SUPPRIMÉ `/eau` (Christophe : page eau retirée de l'UI)
 *   - AJOUTÉ `/ppa` → `/sanitaire/ppa` (nouveau module surveillance PPA)
 *
 * Choix techniques :
 *   - 308 Permanent Redirect (préserve la méthode HTTP — peu probable hors
 *     GET, mais propre côté SEO et caches).
 *   - `config.matcher` listé explicitement (pas de catch-all) → impact
 *     zéro sur les pages, les API, les statics et les routes Next internes
 *     (`/_next`, `/api`, `/favicon.ico`, etc.).
 *   - Aucune logique d'auth/i18n ici — c'est strictement du remapping de
 *     chemin (à étendre prudemment si besoin).
 */

const SANITAIRE_ALIASES: Record<string, string> = {
  '/biosecurite': '/sanitaire/biosecurite',
  '/mycotoxines': '/sanitaire/mycotoxines',
  '/calendrier-sanitaire': '/sanitaire/calendrier',
  '/protocoles': '/sanitaire/protocoles',
  '/maladies': '/sanitaire/maladies',
  '/ppa': '/sanitaire/ppa',
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const target = SANITAIRE_ALIASES[path]
  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/biosecurite',
    '/mycotoxines',
    '/calendrier-sanitaire',
    '/protocoles',
    '/maladies',
    '/ppa',
  ],
}
