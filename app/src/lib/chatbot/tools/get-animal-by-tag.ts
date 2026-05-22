/**
 * Smart Farm — Tool : get_animal_by_tag
 * -------------------------------------------------------------------------
 * Récupère un animal du cheptel par son `tag` (identifiant éleveur), avec
 * sa dernière pesée et sa dernière vaccination. Lecture seule.
 *
 * Exemple d'invocation par le LLM :
 *   { "name": "get_animal_by_tag", "arguments": { "tag": "T-042" } }
 *
 * Réponse (JSON sérialisé dans `content` du ToolResult) :
 *   {
 *     "ok": true,
 *     "animal": { id, tag, nom, sexe, categorie, statut, race, ... },
 *     "derniere_pesee": { date_pesee, poids_kg } | null,
 *     "derniere_vaccination": { date_vaccination, vaccin, ... } | null
 *   }
 */

import type { Tool } from './types'

export const getAnimalByTag: Tool = {
  definition: {
    name: 'get_animal_by_tag',
    description:
      "Récupère la fiche complète d'un animal du cheptel à partir de son tag " +
      "(identifiant éleveur, ex. 'T-042', 'P-128'). Renvoie aussi la dernière " +
      'pesée et la dernière vaccination connues. Utiliser quand l\'utilisateur ' +
      'mentionne un tag précis ou demande des infos sur un animal nommé.',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description:
            "Tag (identifiant éleveur) de l'animal, ex. 'T-042'. Insensible à la casse.",
        },
      },
      required: ['tag'],
      additionalProperties: false,
    },
  },

  async execute(args, ctx) {
    const tag = typeof args.tag === 'string' ? args.tag.trim() : ''
    if (!tag) {
      return { ok: false, error: 'Tag manquant ou invalide.' }
    }

    // 1) Animal + race (ilike pour insensibilité à la casse)
    const { data: animal, error: errAnimal } = await ctx.supabase
      .from('animaux')
      .select('*, races(nom)')
      .ilike('tag', tag)
      .maybeSingle()

    if (errAnimal) {
      throw new Error(`Erreur Supabase animaux: ${errAnimal.message}`)
    }
    if (!animal) {
      return { ok: false, error: `Aucun animal trouvé avec le tag "${tag}".` }
    }

    // 2) Dernière pesée + 3) Dernière vaccination en parallèle
    const animalId = (animal as { id: string }).id
    const [{ data: pesees }, { data: vaccins }] = await Promise.all([
      ctx.supabase
        .from('pesees')
        .select('date_pesee, poids_kg, observation')
        .eq('animal_id', animalId)
        .order('date_pesee', { ascending: false })
        .limit(1),
      ctx.supabase
        .from('vaccinations')
        .select('date_vaccination, vaccin, dose, voie, observation')
        .eq('animal_id', animalId)
        .order('date_vaccination', { ascending: false })
        .limit(1),
    ])

    return {
      ok: true,
      animal,
      derniere_pesee: pesees?.[0] ?? null,
      derniere_vaccination: vaccins?.[0] ?? null,
    }
  },
}
