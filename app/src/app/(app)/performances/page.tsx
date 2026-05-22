import { permanentRedirect } from 'next/navigation'

/**
 * Smart Farm — Alias /performances → /kpi (L1/B2)
 * -------------------------------------------------------------------------
 * URL historique `/performances` renvoyait 404. Le sidebar pointe vers `/kpi`
 * (label "Performances") depuis HARM-A. Ce fichier sert d'alias permanent.
 *
 * `permanentRedirect` émet un 308 (équivalent au middleware SANITAIRE_ALIASES).
 */
export default function PerformancesAliasPage(): never {
  permanentRedirect('/kpi')
}

// Indique au runtime que la page est purement redirect (pas de data)
export const dynamic = 'force-static'
