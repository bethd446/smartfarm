import { z } from 'zod'

// ─── Motifs codifiés (V2 brief §3.3) ─────────────────────────────────────
export const MOTIFS_MORTALITE = [
  'asphyxie',
  'ecrasement',
  'hypothermie',
  'diarrhee',
  'malformation',
  'ppa_suspect',
  'pneumonie',
  'septicemie',
  'cannibalisme',
  'predateur',
  'indetermine',
  'autre',
] as const

export type MotifMortalite = (typeof MOTIFS_MORTALITE)[number]

/** Labels FR pretty pour affichage (dropdown, tableau, KPI). */
export const MOTIF_LABELS: Record<MotifMortalite, string> = {
  asphyxie: 'Asphyxie',
  ecrasement: 'Écrasement',
  hypothermie: 'Hypothermie',
  diarrhee: 'Diarrhée',
  malformation: 'Malformation',
  ppa_suspect: 'PPA suspecte',
  pneumonie: 'Pneumonie',
  septicemie: 'Septicémie',
  cannibalisme: 'Cannibalisme',
  predateur: 'Prédateur',
  indetermine: 'Indéterminé',
  autre: 'Autre (préciser)',
}

// ─── Cible ────────────────────────────────────────────────────────────────
export const CIBLE_VALUES = ['animal', 'bande'] as const
export type CibleMortalite = (typeof CIBLE_VALUES)[number]

// ─── Schéma déclaration ───────────────────────────────────────────────────
// Le today() est figé côté server-action ; ici on accepte string YYYY-MM-DD.
export const mortaliteSchema = z
  .object({
    cible: z.enum(CIBLE_VALUES, {
      message: 'Cible requise (animal ou bande)',
    }),
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    nb_animaux: z.coerce
      .number()
      .int('Nombre entier requis')
      .min(1, 'Minimum 1 animal')
      .max(1000, 'Maximum 1000 animaux'),
    motif: z.enum(MOTIFS_MORTALITE, {
      message: 'Motif requis',
    }),
    motif_libre: z.string().max(200, 'Max 200 caractères').optional().or(z.literal('')),
    date_mortalite: z.string().min(1, 'Date requise'),
    observations: z.string().max(2000).optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    // Cible exclusive
    if (d.cible === 'animal') {
      if (!d.animal_id || d.animal_id === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['animal_id'],
          message: 'Animal requis',
        })
      }
      if (d.nb_animaux !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['nb_animaux'],
          message: 'Mortalité individuelle = 1 animal',
        })
      }
    }
    if (d.cible === 'bande') {
      if (!d.bande_id || d.bande_id === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['bande_id'],
          message: 'Bande requise',
        })
      }
    }

    // motif=autre → motif_libre requis
    if (d.motif === 'autre') {
      if (!d.motif_libre || d.motif_libre.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['motif_libre'],
          message: 'Précision requise quand motif = Autre',
        })
      }
    }

    // Date ≤ today (compare lexicographique YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10)
    if (d.date_mortalite > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_mortalite'],
        message: 'Date ne peut pas être future',
      })
    }
  })

export type DeclarerMortaliteInput = z.input<typeof mortaliteSchema>
export type DeclarerMortaliteParsed = z.output<typeof mortaliteSchema>
