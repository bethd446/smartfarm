/**
 * Provider abstraction pour le chatbot agritech Smart Farm.
 *
 * Architecture multi-provider — le switch se fait UNIQUEMENT via variable d'env :
 *
 *   CHATBOT_PROVIDER     = 'openrouter' (défaut) | 'mistral'
 *   CHATBOT_MODEL        = (optionnel) override du modèle par défaut
 *                          openrouter → 'anthropic/claude-sonnet-4.5'
 *                          mistral    → 'mistral-large-latest'
 *   OPENROUTER_API_KEY   = requis si provider=openrouter
 *   MISTRAL_API_KEY      = requis si provider=mistral
 *
 * Aucun fichier UI ou route ne doit dépendre d'un provider précis : tout passe
 * par l'interface `ChatProvider` ci-dessous + la factory `getChatProvider()`.
 */
import { OpenRouterProvider } from './providers/openrouter'
import { MistralProvider } from './providers/mistral'

export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ChatStreamChunk = {
  /** Texte ajouté depuis le chunk précédent (peut être vide). */
  delta: string
  /** true sur le dernier chunk (fin de stream). */
  done: boolean
  /** Optionnel : usage des tokens, fourni par certains providers en fin de stream. */
  usage?: { input_tokens: number; output_tokens: number }
}

export type StreamOptions = {
  temperature?: number
  max_tokens?: number
  signal?: AbortSignal
}

export interface ChatProvider {
  /** Identifiant court du provider, ex: 'openrouter' | 'mistral'. */
  readonly name: string
  /** Modèle utilisé, ex: 'anthropic/claude-sonnet-4.5' | 'mistral-large-latest'. */
  readonly model: string

  /**
   * Stream une complétion conversationnelle.
   * Format SSE OpenAI-compatible attendu côté provider.
   */
  streamChat(messages: ChatMessage[], options?: StreamOptions): AsyncIterable<ChatStreamChunk>
}

/**
 * Factory unique. Lit `CHATBOT_PROVIDER` (défaut openrouter) et instancie
 * le provider correspondant. Lance une erreur explicite si la clé est manquante.
 */
export function getChatProvider(): ChatProvider {
  const name = (process.env.CHATBOT_PROVIDER ?? 'openrouter').toLowerCase()
  switch (name) {
    case 'openrouter': {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw new Error(
          "OPENROUTER_API_KEY manquante — ajoute la clé pour activer le provider OpenRouter."
        )
      }
      return new OpenRouterProvider({
        apiKey,
        model: process.env.CHATBOT_MODEL ?? 'anthropic/claude-sonnet-4.5',
      })
    }
    case 'mistral': {
      const apiKey = process.env.MISTRAL_API_KEY
      if (!apiKey) {
        throw new Error(
          "MISTRAL_API_KEY manquante — ajoute la clé pour activer le provider Mistral."
        )
      }
      return new MistralProvider({
        apiKey,
        model: process.env.CHATBOT_MODEL ?? 'mistral-large-latest',
      })
    }
    default:
      throw new Error(`Provider chatbot inconnu : ${name} (attendu : 'openrouter' | 'mistral')`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser SSE commun (format OpenAI-compatible — partagé OpenRouter + Mistral)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse un flux SSE OpenAI-compatible et yield des `ChatStreamChunk`.
 *
 * Format attendu (identique OpenRouter / Mistral / OpenAI) :
 *   data: {"choices":[{"delta":{"content":"..."}}]}\n\n
 *   data: [DONE]\n\n
 *
 * Gère le buffering inter-chunks (un event SSE peut être coupé en plusieurs
 * morceaux par le réseau).
 */
export async function* parseOpenAISSE(
  body: ReadableStream<Uint8Array>
): AsyncIterable<ChatStreamChunk> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let usage: ChatStreamChunk['usage']

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Découpe par event SSE (séparateur = ligne vide).
      let sepIdx: number
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)

        // Un event peut contenir plusieurs lignes (event:, data:, etc.)
        for (const line of rawEvent.split('\n')) {
          const trimmed = line.trimStart()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload) continue
          if (payload === '[DONE]') {
            yield { delta: '', done: true, usage }
            return
          }
          try {
            const obj = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>
              usage?: { prompt_tokens?: number; completion_tokens?: number }
            }
            const delta = obj.choices?.[0]?.delta?.content ?? ''
            if (obj.usage) {
              usage = {
                input_tokens: obj.usage.prompt_tokens ?? 0,
                output_tokens: obj.usage.completion_tokens ?? 0,
              }
            }
            if (delta) {
              yield { delta, done: false }
            }
          } catch {
            // payload non-JSON (commentaire SSE, keepalive) → ignore
          }
        }
      }
    }
    // Fin de stream sans [DONE] explicite.
    yield { delta: '', done: true, usage }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* noop */
    }
  }
}
