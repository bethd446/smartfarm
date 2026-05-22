/**
 * Smart Farm — Tool : get_alertes_actives
 * -------------------------------------------------------------------------
 * Récupère la liste des alertes actives de la ferme, optionnellement
 * filtrées par gravité. Lecture seule, basée sur la view SQL
 * `v_alertes_actives` (cf. migration `20260521000001_alertes_views.sql`).
 *
 * Exemples d'invocation :
 *   { "name": "get_alertes_actives", "arguments": {} }
 *   { "name": "get_alertes_actives", "arguments": { "gravite": "critique" } }
 *   { "name": "get_alertes_actives", "arguments": { "limit": 20 } }
 *
 * Réponse (JSON sérialisé dans `content` du ToolResult) :
 *   {
 *     "ok": true,
 *     "total": 7,
 *     "alertes": [
 *       { regle_id, cible_type, cible_label, gravite, titre, description, ... }
 *     ]
 *   }
 */

import type { Tool } from './types'

const GRAVITES = ['critique', 'élevée', 'moyenne', 'info'] as const
type Gravite = (typeof GRAVITES)[number]

export const getAlertesActives: Tool = {
  definition: {
    name: 'get_alertes_actives',
    description:
      "Liste les alertes actives de la ferme (calculées en temps réel via la " +
      "view SQL `v_alertes_actives`). Filtrable par gravité. Utiliser quand " +
      "l'utilisateur demande l'état de la ferme, les urgences, les problèmes " +
      'en cours, les truies à surveiller, etc.',
    parameters: {
      type: 'object',
      properties: {
        gravite: {
          type: 'string',
          enum: GRAVITES,
          description:
            "Filtre par gravité. Si omis, renvoie toutes gravités confondues, " +
            'triées critique → info.',
        },
        limit: {
          type: 'integer',
          description: 'Nombre max d\'alertes à renvoyer (défaut 20, max 50).',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },

  async execute(args, ctx) {
    // Validation arguments
    const graviteArg =
      typeof args.gravite === 'string' && (GRAVITES as readonly string[]).includes(args.gravite)
        ? (args.gravite as Gravite)
        : null

    const rawLimit = typeof args.limit === 'number' ? args.limit : 20
    const limit = Math.max(1, Math.min(50, Math.floor(rawLimit)))

    let query = ctx.supabase
      .from('v_alertes_actives')
      .select(
        'regle_id, cible_type, cible_id, cible_label, gravite, titre, description, lien_suggere, detecte_le',
      )

    if (graviteArg) {
      query = query.eq('gravite', graviteArg)
    }

    // Tri : critique d'abord, puis ordre de détection
    query = query.order('detecte_le', { ascending: false }).limit(limit)

    const { data, error } = await query

    if (error) {
      // La view peut ne pas exister en environnement nu : on dégrade en
      // résultat vide plutôt que de jeter, pour que le LLM puisse répondre
      // proprement à l'utilisateur.
      return {
        ok: false,
        error: `Impossible de lire les alertes (${error.message}).`,
        alertes: [],
        total: 0,
      }
    }

    return {
      ok: true,
      total: data?.length ?? 0,
      filtre_gravite: graviteArg,
      alertes: data ?? [],
    }
  },
}
