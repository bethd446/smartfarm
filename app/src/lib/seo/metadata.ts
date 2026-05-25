import type { Metadata } from 'next'

/**
 * Smart Farm — Helper pour générer des `Metadata` Next 16 cohérents.
 * -------------------------------------------------------------------------
 * Beaucoup de pages internes héritaient du `<title>` racine
 * ("Smart Farm — Gestion d'élevage · Côte d'Ivoire") au lieu d'afficher
 * leur propre titre. Ce helper centralise le format et applique le template
 * "%s — Smart Farm" (cf. metadata.title du layout (app)).
 *
 * Usage côté route (Server Component) :
 *
 *   import { buildMetadata } from '@/lib/seo/metadata'
 *
 *   export const metadata = buildMetadata('Cheptel', 'Vue truies, verrats, porcelets, portées')
 *
 * Ou pour une page dynamique :
 *
 *   export async function generateMetadata({ params }): Promise<Metadata> {
 *     const animal = await fetchAnimal(params.id)
 *     return buildMetadata(`Fiche ${animal.tag}`, animal.nom ?? undefined)
 *   }
 *
 * Le template `%s — Smart Farm` est appliqué automatiquement par Next via
 * le `metadata.title.template` du layout parent. On passe donc juste un
 * titre de page court ici.
 */
export function buildMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
  }
}

/**
 * Description par défaut (fallback) — utilisée par les pages internes qui
 * n'ont pas besoin d'une description spécifique mais doivent éviter de
 * réutiliser celle de la landing.
 */
export const DEFAULT_APP_DESCRIPTION =
  "Gestion technique de troupeau porcin — Smart Farm Côte d'Ivoire."
