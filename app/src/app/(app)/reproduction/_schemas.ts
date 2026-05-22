import { z } from 'zod'

// ─── Saillie ──────────────────────────────────────────────────────────────
export const saillieSchema = z.object({
  truie_id: z.string().uuid('Choisir une truie'),
  verrat_id: z.string().uuid().optional().or(z.literal('')),
  bande_id: z.string().uuid().optional().or(z.literal('')),
  date_saillie: z.string().min(1, 'Date requise'),
  methode: z.enum(['naturelle', 'IA', 'IA_double']),
  rang_porte: z.coerce.number().int().min(1).max(20).optional().or(z.literal('')),
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

export type CreerSaillieInput = z.input<typeof saillieSchema>

// ─── Diagnostic de gestation ──────────────────────────────────────────────
export const diagnosticSchema = z.object({
  saillie_id: z.string().uuid('Choisir une montée'),
  date_diagnostic: z.string().min(1, 'Date requise'),
  resultat: z.enum(['positif', 'negatif', 'retour_chaleur', 'en_attente']),
  methode: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
  idempotency_key: z.string().uuid().optional().or(z.literal('')),
})

export type CreerDiagnosticInput = z.input<typeof diagnosticSchema>
