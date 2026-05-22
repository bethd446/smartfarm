import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  ENUM catégories (aligné sur le type Postgres `categorie_t`)               */
/* -------------------------------------------------------------------------- */

export const CATEGORIES_PROTOCOLE = [
  'verrat',
  'truie',
  'cochette',
  'porcelet',
  'sevrage',
  'engraissement',
] as const
export type CategorieProtocole = (typeof CATEGORIES_PROTOCOLE)[number]

export const VOIES_ADMIN = ['IM', 'SC', 'IV', 'Orale', 'Topique'] as const
export type VoieAdmin = (typeof VOIES_ADMIN)[number]

/* -------------------------------------------------------------------------- */
/*  Helpers de transformation rappels_jours                                    */
/* -------------------------------------------------------------------------- */

/**
 * Accepte une chaîne « 14, 28, 56 » et retourne un int[] trié unique.
 * Vide → tableau vide.
 */
export function parseRappelsJours(input: string | undefined | null): number[] {
  if (!input) return []
  return Array.from(
    new Set(
      input
        .split(/[,\s;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n < 1000),
    ),
  ).sort((a, b) => a - b)
}

/* -------------------------------------------------------------------------- */
/*  SCHEMA Protocole (create + update)                                        */
/* -------------------------------------------------------------------------- */

export const schemaProtocole = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  nom: z.string().trim().min(2, 'Nom requis (min 2 caractères)'),
  description: z.string().optional().or(z.literal('')),
  categorie_cible: z.enum(CATEGORIES_PROTOCOLE).optional().or(z.literal('')),
  age_jours: z.union([z.coerce.number().int().min(0).max(999), z.literal('')]).optional(),
  produit: z.string().optional().or(z.literal('')),
  voie: z.enum(VOIES_ADMIN).optional().or(z.literal('')),
  dose_ml: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  rappels_jours: z.string().optional().or(z.literal('')),
  obligatoire: z.coerce.boolean().optional().default(false),
  actif: z.coerce.boolean().optional().default(true),
})

export type ProtocoleInput = z.input<typeof schemaProtocole>
export type ProtocoleParsed = z.output<typeof schemaProtocole>
