/**
 * Smart Farm — Chatbot tools : types
 * -------------------------------------------------------------------------
 * Types partagés pour le mécanisme de "tool calling" (function calling) du
 * chatbot agritech.
 *
 * COMPATIBILITÉ PROVIDER
 * ----------------------
 * Le shape ci-dessous est compatible nativement avec :
 *   - OpenAI/OpenRouter function calling
 *     https://openrouter.ai/docs/features/tool-calling
 *   - Mistral function calling
 *     https://docs.mistral.ai/capabilities/function_calling/
 *
 * Les deux APIs suivent le standard OpenAI : `tools: [{ type: 'function',
 * function: { name, description, parameters } }]` côté requête, et
 * `tool_calls: [{ id, type:'function', function: { name, arguments } }]`
 * côté réponse. On reste sur ce contrat pour ne pas créer de dépendance
 * provider.
 *
 * STATUT V1
 * ---------
 * Ces types sont livrés mais **pas encore consommés** par l'API route du
 * chatbot (cf. `tools/index.ts` pour le plan d'activation V2). Ils
 * compilent et sont utilisés par les tools de démo `get-animal-by-tag` et
 * `get-alertes`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// JSON Schema (sous-ensemble nécessaire pour décrire des `parameters`)
// ---------------------------------------------------------------------------

/**
 * Sous-ensemble JSON Schema accepté par les APIs OpenAI/Mistral pour le
 * champ `parameters` d'une définition de tool.
 *
 * On reste volontairement permissif (`Record<string, unknown>` autorisé)
 * pour ne pas se battre avec le typage des schémas imbriqués — la
 * validation runtime des arguments reçus se fait dans `execute()` via Zod
 * ou un parsing manuel.
 */
export type JsonSchema = {
  type: 'object'
  properties: Record<string, JsonSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export type JsonSchemaProperty = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: readonly (string | number)[]
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

// ---------------------------------------------------------------------------
// Définition d'un tool — shape envoyé au LLM
// ---------------------------------------------------------------------------

/**
 * Définition d'un tool telle qu'envoyée au LLM (forme OpenAI/Mistral).
 *
 * À sérialiser comme `{ type: 'function', function: <ToolDefinition> }` au
 * moment du POST vers le provider.
 */
export type ToolDefinition = {
  name: string
  description: string
  parameters: JsonSchema
}

// ---------------------------------------------------------------------------
// Tool call / Tool result — shape échangé avec le LLM
// ---------------------------------------------------------------------------

/**
 * Tool call émis par le LLM. `tool_call_id` est l'identifiant fourni par
 * le provider (OpenAI/Mistral renvoient un `id` sur chaque tool_call) ; on
 * doit le ré-injecter dans le message `tool` de la réponse pour que le
 * LLM puisse corréler.
 */
export type ToolCall = {
  tool_call_id: string
  name: string
  /** Arguments parsés depuis le JSON renvoyé par le LLM. */
  arguments: Record<string, unknown>
}

/**
 * Résultat d'exécution d'un tool, à renvoyer au LLM comme un message de
 * rôle `tool` (OpenAI) ou via le mécanisme équivalent Mistral.
 *
 * `content` doit être une string ; on encode du JSON (ou un message
 * d'erreur lisible) dedans. Le LLM est entraîné à parser ces JSON.
 */
export type ToolResult = {
  tool_call_id: string
  name: string
  content: string
  is_error?: boolean
}

// ---------------------------------------------------------------------------
// Contexte d'exécution serveur
// ---------------------------------------------------------------------------

/**
 * Contexte injecté par l'API route au moment d'exécuter un tool.
 *
 * - `supabase` : client serveur déjà authentifié (RLS appliquée).
 * - `fermeId` : ferme courante de l'utilisateur. En V1 démo, vaut
 *   `'00000000-0000-0000-0000-000000000001'`. Les tools doivent **toujours**
 *   filtrer par cet ID quand la table le supporte, pour éviter toute fuite
 *   cross-ferme si la RLS venait à être désactivée.
 */
export type ToolContext = {
  supabase: SupabaseClient
  fermeId: string
}

// ---------------------------------------------------------------------------
// Interface Tool
// ---------------------------------------------------------------------------

/**
 * Un tool exécutable côté serveur.
 *
 * `execute()` reçoit les arguments **déjà parsés** (le parsing JSON brut
 * est fait par le dispatcher avant l'appel) et retourne une valeur
 * sérialisable JSON. Le dispatcher se charge de la stringification et de
 * la construction du `ToolResult`.
 *
 * Convention :
 *   - Lecture seule en V1 (pas d'INSERT/UPDATE/DELETE).
 *   - Les erreurs métier (animal introuvable, etc.) sont retournées
 *     comme `{ ok: false, error: '...' }` plutôt que jetées — le LLM
 *     saura les présenter à l'utilisateur.
 *   - Les exceptions techniques (réseau, RLS, etc.) sont jetées et seront
 *     transformées en `ToolResult { is_error: true }` par le dispatcher.
 */
export interface Tool {
  readonly definition: ToolDefinition
  execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<unknown>
}
