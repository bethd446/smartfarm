import { z } from 'zod'

/**
 * B3 — Schémas Zod pour actes sanitaires.
 * Cible exclusive : animal_id OU bande_id (XOR), produit obligatoire.
 */

export const UNITES_DOSE = [
  'mL',
  'dose',
  'seringue_pre_remplie',
  'comprimé',
  'sachet',
  'flacon',
  'unité',
] as const

export const VOIES_ADMINISTRATION = [
  'IM',
  'SC',
  'IV',
  'PO',
  'topique',
  'drench',
  'intranasale',
  'oculaire',
] as const

export const schemaActeSanitaire = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    produit_id: z.string().uuid({ message: 'Produit requis' }),
    dose: z.coerce.number().positive({ message: 'Dose > 0 requise' }),
    unite_dose: z.enum(UNITES_DOSE),
    voie: z.enum(VOIES_ADMINISTRATION),
    duree_jours: z.coerce
      .number()
      .int()
      .min(1, 'Durée min 1 jour')
      .max(30, 'Durée max 30 jours')
      .default(1),
    motif: z.string().max(500).optional().or(z.literal('')),
    ordonnance_url: z
      .string()
      .url()
      .refine(
        (u) => {
          try {
            const proto = new URL(u).protocol
            return proto === 'https:' || proto === 'http:'
          } catch {
            return false
          }
        },
        { message: 'URL invalide (https requis)' },
      )
      .optional()
      .or(z.literal('')),
    date_administration: z.string().min(1, 'Date requise'),
    delai_attente_viande_jours: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (d) => (!!d.animal_id && !d.bande_id) || (!d.animal_id && !!d.bande_id),
    { message: 'Choisir UN animal OU UNE bande (pas les deux)', path: ['animal_id'] },
  )

export type ActeSanitaireInput = z.input<typeof schemaActeSanitaire>
export type ActeSanitaireParsed = z.output<typeof schemaActeSanitaire>
