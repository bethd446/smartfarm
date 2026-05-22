import { z } from 'zod'

export const peseeSchema = z
  .object({
    type: z.enum(['individuelle', 'bande_moyenne', 'bande_totale']),
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_pesee: z.string().min(1, 'Date requise'),
    poids_kg: z.coerce
      .number()
      .positive('Poids doit être positif')
      .max(500, 'Poids irréaliste'),
    nb_animaux: z.coerce.number().int().positive().default(1),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine((d) => d.animal_id || d.bande_id, {
    message: 'Choisir un animal OU une bande',
  })

export type CreerPeseeInput = z.input<typeof peseeSchema>
