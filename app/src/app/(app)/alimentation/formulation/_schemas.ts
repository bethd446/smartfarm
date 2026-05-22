import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  Stades porc (aligné sur lib/nutrition-engine.ts)                          */
/* -------------------------------------------------------------------------- */

export const STADES_PORC = [
  'porcelet_1',
  'porcelet_2',
  'croissance',
  'finition',
  'gestante',
  'allaitante',
  'verrat',
] as const
export type StadePorc = (typeof STADES_PORC)[number]

export const LABEL_STADE: Record<StadePorc, string> = {
  porcelet_1: 'Porcelet 1er âge (5–15 kg)',
  porcelet_2: 'Porcelet 2e âge (15–30 kg)',
  croissance: 'Croissance (30–60 kg)',
  finition:   'Finition (60–110 kg)',
  gestante:   'Truie gestante',
  allaitante: 'Truie allaitante',
  verrat:     'Verrat reproducteur',
}

/* -------------------------------------------------------------------------- */
/*  Ingrédient d'une formulation                                              */
/* -------------------------------------------------------------------------- */

export const schemaIngredientFormulation = z.object({
  matiere_premiere_id: z.string().uuid('matière première invalide'),
  pourcentage: z.coerce
    .number()
    .min(0, 'pourcentage négatif interdit')
    .max(100, 'pourcentage > 100 interdit'),
})

export type IngredientFormulationInput = z.input<typeof schemaIngredientFormulation>

/* -------------------------------------------------------------------------- */
/*  Formulation complète                                                      */
/* -------------------------------------------------------------------------- */

export const schemaFormulation = z
  .object({
    id: z.string().uuid().optional().or(z.literal('')),
    nom: z.string().trim().min(2, 'Nom requis (min 2 caractères)').max(120),
    stade_cible: z.enum(STADES_PORC),
    type_aliment_id: z.string().uuid().optional().nullable().or(z.literal('')),
    cout_kg: z.coerce.number().nonnegative().optional().nullable(),
    ingredients: z
      .array(schemaIngredientFormulation)
      .min(1, 'Au moins un ingrédient requis'),
  })
  .refine(
    (data) => {
      const total = data.ingredients.reduce(
        (s, i) => s + Number(i.pourcentage || 0),
        0,
      )
      // tolérance ±0.01 pour les arrondis flottants — fenêtre [99.99, 100.01]
      return total >= 99.99 && total <= 100.01
    },
    {
      message: 'Le total des pourcentages doit être 100%',
      path: ['ingredients'],
    },
  )

export type FormulationInput = z.input<typeof schemaFormulation>
export type FormulationParsed = z.output<typeof schemaFormulation>
