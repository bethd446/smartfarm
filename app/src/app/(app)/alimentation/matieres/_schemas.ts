import { z } from 'zod'
import {
  CATEGORIES_NUTRITIONNELLES,
  ORIGINES,
} from '@/lib/nutrition-data'

/* -------------------------------------------------------------------------- */
/*  Types stock alignés sur enum Postgres `type_stock_t`                      */
/* -------------------------------------------------------------------------- */

export const TYPES_STOCK = [
  'matiere_premiere',
  'aliment_fini',
  'vaccin',
  'medicament',
  'desinfectant',
  'consommable',
  'autre',
] as const
export type TypeStock = (typeof TYPES_STOCK)[number]

/* -------------------------------------------------------------------------- */
/*  Coercion helper : input form vide → undefined                             */
/* -------------------------------------------------------------------------- */

const numOrEmpty = z
  .union([z.coerce.number().min(0), z.literal('')])
  .optional()

/* -------------------------------------------------------------------------- */
/*  SCHEMA matière première (create + update)                                 */
/* -------------------------------------------------------------------------- */

export const schemaMatiere = z.object({
  id: z.string().uuid().optional().or(z.literal('')),

  nom: z.string().trim().min(2, 'Nom requis (min 2 caractères)'),
  type: z.enum(TYPES_STOCK).default('matiere_premiere'),
  unite: z.string().trim().default('kg'),

  categorie_nutritionnelle: z
    .enum(CATEGORIES_NUTRITIONNELLES)
    .optional()
    .or(z.literal('')),
  origine: z.enum(ORIGINES).optional().or(z.literal('')),
  fournisseur: z.string().optional().or(z.literal('')),

  mat_pct: numOrEmpty,
  em_porc_kcal_kg: numOrEmpty,
  lysine_pct: numOrEmpty,
  methionine_pct: numOrEmpty,
  calcium_pct: numOrEmpty,
  phosphore_pct: numOrEmpty,
  fibre_pct: numOrEmpty,
  matiere_seche_pct: numOrEmpty,

  prix_indicatif_xof_kg: numOrEmpty,
  cout_moyen_unite: numOrEmpty,
  stock_actuel: numOrEmpty,
  seuil_alerte: numOrEmpty,

  notes_terrain: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})

export type MatiereInput = z.input<typeof schemaMatiere>
export type MatiereParsed = z.output<typeof schemaMatiere>
