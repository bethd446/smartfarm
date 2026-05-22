import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  SCHEMA Plan d'alimentation                                                 */
/*  Référence DB : public.plans_alimentation                                   */
/*  Colonnes : bande_id, type_aliment_id, date_debut, date_fin, ration_kg_jour */
/* -------------------------------------------------------------------------- */

export const schemaPlan = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  bande_id: z.string().uuid({ message: 'Bande requise' }),
  type_aliment_id: z.string().uuid({ message: 'Type d’aliment requis' }),
  date_debut: z.string().min(1, 'Date de début requise'),
  date_fin: z.string().optional().or(z.literal('')),
  ration_kg_jour: z.union([
    z.coerce.number().positive('La ration doit être > 0').max(1000),
    z.literal(''),
  ]).optional(),
})

export type PlanInput = z.input<typeof schemaPlan>
export type PlanParsed = z.output<typeof schemaPlan>

/** Statut calculé côté UI à partir des dates */
export type StatutPlan = 'a_venir' | 'en_cours' | 'termine'

export function calculerStatutPlan(
  date_debut: string | null,
  date_fin: string | null,
): StatutPlan {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = date_debut ? new Date(date_debut) : null
  const f = date_fin ? new Date(date_fin) : null
  if (d && d > today) return 'a_venir'
  if (f && f < today) return 'termine'
  return 'en_cours'
}
