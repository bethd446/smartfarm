import { z } from 'zod'

// ─── Garde-fous métier ────────────────────────────────────────────────────
// Dates : pas avant 2020 (lancement secteur structuré CI), pas dans le futur.
// Saillie programmée tolérée jusqu'à +7 jours (planning IA court terme).
const DATE_MIN = '2020-01-01'
const todayISO = () => new Date().toISOString().slice(0, 10)
const maxFuturISO = (joursOffset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + joursOffset)
  return d.toISOString().slice(0, 10)
}

// ─── Saillie ──────────────────────────────────────────────────────────────
export const saillieSchema = z
  .object({
    truie_id: z.string().uuid('Choisir une truie'),
    verrat_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_saillie: z.string().min(1, 'Date requise'),
    methode: z.enum(['naturelle', 'IA', 'IA_double']),
    rang_porte: z.coerce
      .number()
      .int('Rang de portée entier requis')
      .min(1, 'Rang de portée minimum : 1')
      .max(20, 'Rang de portée maximum : 20 (truie de réforme au-delà)')
      .optional()
      .or(z.literal('')),
    // BCS truie (Body Condition Score 1..5, pas de 0.5)
    bcs_truie: z.coerce
      .number()
      .min(1)
      .max(5)
      .optional()
      .or(z.literal('')),
    observations: z.string().optional().or(z.literal('')),
    // F2 P0-9 : clé d'idempotence générée côté client (crypto.randomUUID)
    idempotency_key: z.string().uuid().optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    // Date saillie : bornée [DATE_MIN, today + 7 jours]
    const maxFutur = maxFuturISO(7)
    if (d.date_saillie < DATE_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_saillie'],
        message: `Date trop ancienne (minimum ${DATE_MIN})`,
      })
    }
    if (d.date_saillie > maxFutur) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_saillie'],
        message: 'Date trop future (max +7 jours pour saillie programmée)',
      })
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

export type CreerSaillieInput = z.input<typeof saillieSchema>

// ─── Diagnostic de gestation ──────────────────────────────────────────────
export const diagnosticSchema = z
  .object({
    saillie_id: z.string().uuid('Choisir une montée'),
    date_diagnostic: z.string().min(1, 'Date requise'),
    resultat: z.enum(['positif', 'negatif', 'retour_chaleur', 'en_attente']),
    methode: z.string().optional().or(z.literal('')),
    observations: z.string().optional().or(z.literal('')),
    idempotency_key: z.string().uuid().optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    // Date diagnostic : bornée [DATE_MIN, today] (jamais futur, jamais antédiluvien)
    const today = todayISO()
    if (d.date_diagnostic < DATE_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_diagnostic'],
        message: `Date trop ancienne (minimum ${DATE_MIN})`,
      })
    }
    if (d.date_diagnostic > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_diagnostic'],
        message: 'Date de diagnostic ne peut pas être future',
      })
    }
  })

export type CreerDiagnosticInput = z.input<typeof diagnosticSchema>
