import {
  parseOpenAISSE,
  type ChatMessage,
  type ChatProvider,
  type ChatStreamChunk,
  type StreamOptions,
} from '../provider'

export type MistralConfig = {
  apiKey: string
  model: string
  /** Optionnel : override de l'endpoint (utile pour tests). */
  baseUrl?: string
}

const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1'

/**
 * Provider Mistral — V2 (stub fonctionnel).
 *
 * Mistral expose une API OpenAI-compatible : même shape de body, même format SSE
 * (`data: {...}\n\n` avec `choices[0].delta.content`), donc on réutilise le
 * parser commun `parseOpenAISSE`.
 *
 * Pour activer : définir `CHATBOT_PROVIDER=mistral` et `MISTRAL_API_KEY=...`
 * dans `.env.local`.
 */
export class MistralProvider implements ChatProvider {
  readonly name = 'mistral'
  readonly model: string
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(cfg: MistralConfig) {
    if (!cfg.apiKey) {
      throw new Error(
        "MISTRAL_API_KEY manquante — ajoute la clé pour activer le provider Mistral."
      )
    }
    if (!cfg.model) throw new Error('MistralProvider : model requis')
    this.apiKey = cfg.apiKey
    this.model = cfg.model
    this.baseUrl = cfg.baseUrl ?? DEFAULT_BASE_URL
  }

  async *streamChat(
    messages: ChatMessage[],
    options: StreamOptions = {}
  ): AsyncIterable<ChatStreamChunk> {
    const { temperature = 0.7, max_tokens = 1024, signal } = options

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature,
        max_tokens,
      }),
      signal,
    })

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '')
      throw new Error(
        `Mistral HTTP ${res.status} ${res.statusText} — ${errText.slice(0, 500)}`
      )
    }

    yield* parseOpenAISSE(res.body)
  }
}
