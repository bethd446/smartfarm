/**
 * Smart Farm — Chatbot tools : registry
 * -------------------------------------------------------------------------
 * Registre central des tools disponibles pour le chatbot agritech.
 *
 * STATUT V1 (livré ici)
 * ---------------------
 * - Structure de données + 2 tools en lecture seule (proof of concept) :
 *     * `get_animal_by_tag`    → fiche animal + dernière pesée + dernière vacc.
 *     * `get_alertes_actives`  → alertes de la ferme (view `v_alertes_actives`)
 * - Helpers `getToolDefinitions()` et `executeTool()` prêts à brancher.
 * - **PAS encore consommé par l'API route** (`/api/chatbot`). Le système
 *   prompt V1 ne mentionne pas ces tools : le LLM répond en mode purement
 *   conversationnel, et les données ferme sont injectées en contexte via le
 *   RAG (`lib/chatbot/rag.ts`).
 *
 * PLAN D'ACTIVATION V2
 * --------------------
 * Pour activer le tool calling dans l'API route, il suffira de :
 *
 *   1. Étendre `ChatProvider.streamChat()` (cf. `lib/chatbot/provider.ts`)
 *      pour accepter un paramètre optionnel `tools?: ToolDefinition[]` et
 *      pour émettre, en plus du `delta` texte, des chunks de type
 *      `{ tool_calls: ToolCall[] }`.
 *
 *   2. Dans chaque provider (`openrouter.ts`, `mistral.ts`), passer
 *      `tools` dans le body en respectant le format OpenAI :
 *        body.tools = tools.map(d => ({ type: 'function', function: d }))
 *      Le shape de notre `ToolDefinition` est déjà aligné.
 *
 *   3. Dans `/api/chatbot/route.ts`, après réception d'un chunk
 *      `tool_calls`, dérouler la boucle d'agent :
 *
 *        for (const call of toolCalls) {
 *          const result = await executeTool(call, { supabase, fermeId })
 *          // pousser dans `messages` un message de rôle 'tool' avec
 *          // tool_call_id + content (JSON stringifié), puis relancer
 *          // streamChat(messages, { tools }) → boucler jusqu'à ce que le
 *          // LLM rende un message texte final sans tool_calls.
 *        }
 *
 *   4. Étendre `SYSTEM_PROMPT` pour mentionner explicitement les tools
 *      disponibles et donner des heuristiques d'usage (ex. "si l'utilisateur
 *      cite un tag, appelle get_animal_by_tag avant de répondre").
 *
 *   5. Ajouter des tools en écriture quand la base UX/sécurité sera en
 *      place (confirm modal, audit log, RLS stricte) — ex.
 *      `create_pesee`, `programmer_vaccination`, `creer_alerte_manuelle`.
 *
 * AJOUTER UN NOUVEAU TOOL
 * -----------------------
 *   1. Créer `lib/chatbot/tools/<mon-tool>.ts` exportant un `Tool` (cf. types).
 *   2. L'enregistrer dans `TOOLS_REGISTRY` ci-dessous.
 *   3. C'est tout : il sera automatiquement listé par `getToolDefinitions()`
 *      et exécutable par `executeTool()`.
 */

import type { Tool, ToolCall, ToolDefinition, ToolContext, ToolResult } from './types'
import { getAnimalByTag } from './get-animal-by-tag'
import { getAlertesActives } from './get-alertes'

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Clé = nom du tool (doit matcher `tool.definition.name`).
 * Valeur = implémentation du tool.
 */
export const TOOLS_REGISTRY: Record<string, Tool> = {
  [getAnimalByTag.definition.name]: getAnimalByTag,
  [getAlertesActives.definition.name]: getAlertesActives,
}

// ---------------------------------------------------------------------------
// Helpers exposés à l'API route (V2)
// ---------------------------------------------------------------------------

/**
 * Retourne la liste des définitions de tools à envoyer au LLM dans le champ
 * `tools` de la requête (format OpenAI/Mistral).
 *
 * À sérialiser au moment du POST :
 *   const tools = getToolDefinitions().map(d => ({ type: 'function', function: d }))
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOLS_REGISTRY).map((t) => t.definition)
}

/**
 * Exécute un tool call émis par le LLM. Renvoie un `ToolResult` prêt à
 * être ré-injecté dans la conversation (rôle `tool` côté API LLM).
 *
 * - Si le tool n'existe pas → `is_error: true` avec message explicite.
 * - Si l'exécution jette → `is_error: true` avec le message d'exception.
 * - Si l'exécution renvoie `{ ok: false, error }` → on remonte tel quel,
 *   sans flag `is_error` (le LLM saura présenter l'erreur métier).
 *
 * Note V1 : non utilisée tant que l'API route ne branche pas tools — mais
 * compile et testée unitairement possible.
 */
export async function executeTool(
  call: ToolCall,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = TOOLS_REGISTRY[call.name]

  if (!tool) {
    return {
      tool_call_id: call.tool_call_id,
      name: call.name,
      content: JSON.stringify({
        ok: false,
        error: `Tool inconnu : "${call.name}". Tools disponibles : ${Object.keys(TOOLS_REGISTRY).join(', ')}.`,
      }),
      is_error: true,
    }
  }

  try {
    const result = await tool.execute(call.arguments, ctx)
    return {
      tool_call_id: call.tool_call_id,
      name: call.name,
      content: JSON.stringify(result),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      tool_call_id: call.tool_call_id,
      name: call.name,
      content: JSON.stringify({
        ok: false,
        error: `Échec d'exécution du tool ${call.name} : ${message}`,
      }),
      is_error: true,
    }
  }
}

// ---------------------------------------------------------------------------
// Re-exports pratiques
// ---------------------------------------------------------------------------

export type { Tool, ToolCall, ToolDefinition, ToolContext, ToolResult } from './types'
