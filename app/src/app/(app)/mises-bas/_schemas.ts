import { z } from 'zod'

// ─── Mise-bas ─────────────────────────────────────────────────────────────
export const miseBasSchema = z
  .object({
    saillie_id: z.string().uuid('Choisir une montée'),
    date_mise_bas: z.string().min(1, 'Date requise'),
    nes_totaux: z.coerce.number().int().min(0),
    nes_vivants: z.coerce.number().int().min(0),
    nes_morts: z.coerce.number().int().min(0).default(0),
    momifies: z.coerce.number().int().min(0).default(0),
    ecrases: z.coerce.number().int().min(0).default(0),
    poids_portee_kg: z.coerce
      .number()
      .positive()
      .optional()
      .or(z.literal('')),
    duree_minutes: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .or(z.literal('')),
    assistance: z.coerce.boolean().default(false),
    // BCS truie à la mise-bas (1..5, optionnel)
    bcs_truie: z.coerce
      .number()
      .min(1)
      .max(5)
      .optional()
      .or(z.literal('')),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine(
    (d) =>
      Number(d.nes_vivants) + Number(d.nes_morts) + Number(d.momifies) ===
      Number(d.nes_totaux),
    {
      message: 'Le total ne correspond pas (vivants + morts + momifiés)',
      path: ['nes_totaux'],
    }
  )

export type CreerMiseBasInput = z.input<typeof miseBasSchema>

// ─── Sevrage ──────────────────────────────────────────────────────────────
export const sevrageSchema = z.object({
  mise_bas_id: z.string().uuid('Choisir une portée'),
  date_sevrage: z.string().min(1, 'Date requise'),
  nb_sevres: z.coerce.number().int().min(0),
  poids_total_kg: z.coerce
    .number()
    .positive()
    .optional()
    .or(z.literal('')),
  age_jours: z.coerce.number().int().min(0).optional().or(z.literal('')),
  // BCS truie au sevrage (1..5, optionnel)
  bcs_truie: z.coerce
    .number()
    .min(1)
    .max(5)
    .optional()
    .or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})

export type CreerSevrageInput = z.input<typeof sevrageSchema>
