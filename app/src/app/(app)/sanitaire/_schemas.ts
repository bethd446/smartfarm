import { z } from 'zod'

export const schemaVaccin = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_vaccination: z.string().min(1, 'Date requise'),
    produit: z.string().min(1, 'Produit requis'),
    lot: z.string().optional().or(z.literal('')),
    dose_ml: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
    veterinaire: z.string().optional().or(z.literal('')),
    observations: z.string().optional().or(z.literal('')),
    idempotency_key: z.string().uuid().optional().or(z.literal('')),
  })
  .refine((d) => !!d.animal_id || !!d.bande_id, {
    message: 'Choisir un animal OU une bande',
    path: ['animal_id'],
  })

export const schemaSoin = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_debut: z.string().min(1, 'Date de début requise'),
    date_fin: z.string().optional().or(z.literal('')),
    motif: z.string().min(1, 'Motif requis'),
    produit: z.string().optional().or(z.literal('')),
    posologie: z.string().optional().or(z.literal('')),
    voie: z.string().optional().or(z.literal('')),
    veterinaire: z.string().optional().or(z.literal('')),
    cout: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
    observations: z.string().optional().or(z.literal('')),
    idempotency_key: z.string().uuid().optional().or(z.literal('')),
  })
  .refine((d) => !!d.animal_id || !!d.bande_id, {
    message: 'Choisir un animal OU une bande',
    path: ['animal_id'],
  })

export const schemaPerte = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_mort: z.string().min(1, 'Date requise'),
    cause: z.string().min(1, 'Cause requise'),
    diagnostic: z.string().optional().or(z.literal('')),
    autopsie: z.boolean().default(false),
    observations: z.string().optional().or(z.literal('')),
    idempotency_key: z.string().uuid().optional().or(z.literal('')),
  })
  .refine((d) => !!d.animal_id || !!d.bande_id, {
    message: 'Choisir un animal OU une bande',
    path: ['animal_id'],
  })

export type VaccinInput = z.input<typeof schemaVaccin>
export type SoinInput = z.input<typeof schemaSoin>
export type PerteInput = z.input<typeof schemaPerte>
