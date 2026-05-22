import { z } from 'zod'

export const animalSchema = z.object({
  tag: z.string().min(1, 'Tag requis').max(20),
  nom: z.string().optional().or(z.literal('')),
  sexe: z.enum(['M', 'F']),
  categorie: z.enum([
    'verrat',
    'truie',
    'cochette',
    'porcelet',
    'sevrage',
    'engraissement',
  ]),
  race_id: z.string().uuid().optional().or(z.literal('')),
  date_naissance: z.string().optional().or(z.literal('')),
  poids_naissance_kg: z.coerce
    .number()
    .positive()
    .optional()
    .or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})

export type CreerAnimalInput = z.input<typeof animalSchema>
