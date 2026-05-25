/**
 * Smart Farm — Utility de formatage du label animal.
 * -------------------------------------------------------------------------
 * Élimine le bug "B.10 (B.10)" qui apparaissait sur les fiches/listes quand
 * `nom === tag` (cas fréquent : l'éleveur n'a pas saisi de nom et la valeur
 * stockée par défaut est égale au tag — ou doublon de seed).
 *
 * Règles :
 * - `nom` null/undefined/'' → on retourne juste le tag
 * - `nom === tag` (insensible à la casse, après trim) → on retourne juste le tag
 * - sinon, on formate selon le mode demandé
 *
 * Utilisé par `<AnimalLabel>` (composant React) et peut être appelé directement
 * côté serveur pour les exports PDF/CSV ou les logs.
 */

export type AnimalLabelFormat = 'full' | 'tag-only' | 'inline'

export type AnimalLike = {
  tag: string
  nom?: string | null
}

/** Retourne true si `nom` est vide ou identique au `tag`. */
export function isNomRedundant(animal: AnimalLike): boolean {
  const nom = animal.nom?.trim()
  if (!nom) return true
  return nom.toLowerCase() === animal.tag.trim().toLowerCase()
}

/**
 * Formate un label d'animal sous forme de string brut.
 *
 * - `full`     → "Pirouette (B.26)" si nom utile, sinon "B.26"
 * - `tag-only` → toujours "B.26"
 * - `inline`   → "B.26 · Pirouette" si nom utile, sinon "B.26"
 */
export function formatAnimalLabel(
  animal: AnimalLike,
  format: AnimalLabelFormat = 'full',
): string {
  const tag = animal.tag
  if (format === 'tag-only' || isNomRedundant(animal)) return tag

  const nom = animal.nom!.trim()
  if (format === 'inline') return `${tag} · ${nom}`
  return `${nom} (${tag})`
}
