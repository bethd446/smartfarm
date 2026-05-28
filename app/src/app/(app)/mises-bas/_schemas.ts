import { z } from 'zod'

// ─── Garde-fous métier ────────────────────────────────────────────────────
// Dates : pas avant 2020 (lancement secteur structuré CI), tolérance J+1 sur
// mise-bas/sevrage (saisie le lendemain matin d'un évènement nocturne).
const DATE_MIN = '2020-01-01'
const todayISO = () => new Date().toISOString().slice(0, 10)
const maxFuturISO = (joursOffset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + joursOffset)
  return d.toISOString().slice(0, 10)
}

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
  .superRefine((d, ctx) => {
    // Date mise-bas : bornée [DATE_MIN, today + 1] (tolérance J+1)
    const maxFutur = maxFuturISO(1)
    if (d.date_mise_bas < DATE_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_mise_bas'],
        message: `Date trop ancienne (minimum ${DATE_MIN})`,
      })
    }
    if (d.date_mise_bas > maxFutur) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_mise_bas'],
        message: 'Date trop future (max +1 jour pour saisie le lendemain)',
      })
    }
    // Nés totaux : max physiologique 30 (record truie hyperprolifique ~25)
    if (Number(d.nes_totaux) > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nes_totaux'],
        message: 'Nés totaux > 30 invraisemblable (record physiologique ~25)',
      })
    }
    // Poids portée : max 60 kg (20 porcelets × 2,5 kg + marge)
    if (d.poids_portee_kg !== '' && d.poids_portee_kg !== undefined) {
      const p = Number(d.poids_portee_kg)
      if (p > 60) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['poids_portee_kg'],
          message: 'Poids portée > 60 kg invraisemblable (vérifier la saisie)',
        })
      }
    }
    // Durée mise-bas : [15, 720] minutes (12h max — au-delà = dystocie sévère)
    if (d.duree_minutes !== '' && d.duree_minutes !== undefined) {
      const dur = Number(d.duree_minutes)
      if (dur < 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['duree_minutes'],
          message: 'Durée < 15 min irréaliste (vérifier la saisie)',
        })
      }
      if (dur > 720) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['duree_minutes'],
          message: 'Durée > 12 h : dystocie sévère, contacter le vétérinaire',
        })
      }
    }
    // BCS truie : entier 1..5 (échelle CI sans demi-points)
    if (d.bcs_truie !== '' && d.bcs_truie !== undefined) {
      const bcs = Number(d.bcs_truie)
      if (!Number.isInteger(bcs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bcs_truie'],
          message: 'BCS entier requis (1, 2, 3, 4 ou 5 — pas de demi-points)',
        })
      }
    }
  })

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
  .superRefine((d, ctx) => {
    // Date sevrage : bornée [DATE_MIN, today + 1] (tolérance J+1)
    const maxFutur = maxFuturISO(1)
    if (d.date_sevrage < DATE_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_sevrage'],
        message: `Date trop ancienne (minimum ${DATE_MIN})`,
      })
    }
    if (d.date_sevrage > maxFutur) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_sevrage'],
        message: 'Date trop future (max +1 jour pour saisie le lendemain)',
      })
    }
    // Poids moyen sevrage : [3, 15] kg (cible CI 6-8 kg, marge large)
    if (
      d.poids_total_kg !== '' &&
      d.poids_total_kg !== undefined &&
      Number(d.nb_sevres) > 0
    ) {
      const moyen = Number(d.poids_total_kg) / Number(d.nb_sevres)
      if (moyen < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['poids_total_kg'],
          message: 'Poids moyen porcelet < 3 kg invraisemblable (cible CI 6-8 kg)',
        })
      }
      if (moyen > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['poids_total_kg'],
          message: 'Poids moyen porcelet > 15 kg invraisemblable (sevrage tardif ?)',
        })
      }
    }
    // Âge sevrage : borne haute pratique 60 jours
    if (d.age_jours !== '' && d.age_jours !== undefined) {
      const age = Number(d.age_jours)
      if (age > 60) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['age_jours'],
          message: 'Âge > 60 jours : sevrage tardif inhabituel (vérifier la saisie)',
        })
      }
    }
    // BCS truie : entier 1..5
    if (d.bcs_truie !== '' && d.bcs_truie !== undefined) {
      const bcs = Number(d.bcs_truie)
      if (!Number.isInteger(bcs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bcs_truie'],
          message: 'BCS entier requis (1, 2, 3, 4 ou 5 — pas de demi-points)',
        })
      }
    }
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
