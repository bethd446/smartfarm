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
    // F2 P0-9 : clé d'idempotence générée côté client
    idempotency_key: z.string().uuid().optional().or(z.literal('')),
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
  idempotency_key: z.string().uuid().optional().or(z.literal('')),
  // NOUVEAU : bâtiment destination porcelets
  batiment_destination_id: z.string().uuid('Choisir un bâtiment de destination'),
})

export type CreerSevrageInput = z.input<typeof sevrageSchema>

// ─── Adoption (C9) ────────────────────────────────────────────────────────
// Transfert de N porcelets d'une portee source vers une portee receveuse.
// Egalisation tetines = pratique zootech IFIP quotidienne en maternite.
export const MOTIFS_ADOPTION = [
  'surcharge_donneuse',
  'perte_receveuse',
  'egalisation_taille',
  'sante_porcelet',
  'autre',
] as const

export const MOTIF_ADOPTION_LABELS: Record<(typeof MOTIFS_ADOPTION)[number], string> = {
  surcharge_donneuse: 'Surcharge donneuse (>tétines)',
  perte_receveuse: 'Perte portée receveuse',
  egalisation_taille: 'Égalisation taille',
  sante_porcelet: 'Santé porcelet (faible)',
  autre: 'Autre',
}

export const adoptionSchema = z
  .object({
    mb_source_id: z.string().uuid('Choisir une portée source'),
    mb_destination_id: z.string().uuid('Choisir une portée destination'),
    nb_porcelets: z.coerce
      .number()
      .int()
      .min(1, 'Au moins 1 porcelet')
      .max(20, 'Maximum 20 porcelets'),
    motif_adoption: z.enum(MOTIFS_ADOPTION),
    motif_libre: z.string().max(200).optional().or(z.literal('')),
    date_adoption: z.string().min(1, 'Date requise'),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine((d) => d.mb_source_id !== d.mb_destination_id, {
    message: 'Source et destination doivent être différentes',
    path: ['mb_destination_id'],
  })
  .refine(
    (d) =>
      d.motif_adoption !== 'autre' ||
      (typeof d.motif_libre === 'string' && d.motif_libre.trim().length > 0),
    {
      message: "Motif libre obligatoire si 'Autre'",
      path: ['motif_libre'],
    }
  )

export type CreerAdoptionInput = z.input<typeof adoptionSchema>
