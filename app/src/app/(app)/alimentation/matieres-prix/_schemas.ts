import { z } from 'zod'

const today = () => new Date().toISOString().slice(0, 10)

export const prixSchema = z.object({
  matiere_id: z.string().uuid('Matière requise'),
  date_releve: z
    .string()
    .min(1, 'Date requise')
    .refine((v) => v <= today(), 'Date dans le futur interdite'),
  prix_xof_kg: z.coerce.number().positive('Prix > 0').max(100000, 'Prix trop élevé'),
  source: z.string().max(200).optional().or(z.literal('')),
  observations: z.string().max(1000).optional().or(z.literal('')),
})

export type PrixInput = z.input<typeof prixSchema>
