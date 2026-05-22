import {
  parseOpenAISSE,
  type ChatMessage,
  type ChatProvider,
  type ChatStreamChunk,
  type StreamOptions,
} from '../provider'

export type OpenRouterConfig = {
  apiKey: string
  model: string
  /** Optionnel : override de l'endpoint (utile pour tests). */
  baseUrl?: string
  /** Site URL recommandé par OpenRouter pour le ranking. */
  referer?: string
  /** Titre affiché sur OpenRouter. */
  title?: string
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_REFERER = 'https://smartfarm.187-127-225-24.nip.io'
const DEFAULT_TITLE = 'Smart Farm Chatbot'

export class OpenRouterProvider implements ChatProvider {
  readonly name = 'openrouter'
  readonly model: string
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly referer: string
  private readonly title: string

  constructor(cfg: OpenRouterConfig) {
    if (!cfg.apiKey) throw new Error('OpenRouterProvider : apiKey requise')
    if (!cfg.model) throw new Error('OpenRouterProvider : model requis')
    this.apiKey = cfg.apiKey
    this.model = cfg.model
    this.baseUrl = cfg.baseUrl ?? DEFAULT_BASE_URL
    this.referer = cfg.referer ?? DEFAULT_REFERER
    this.title = cfg.title ?? DEFAULT_TITLE
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
        'HTTP-Referer': this.referer,
        'X-Title': this.title,
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
        `OpenRouter HTTP ${res.status} ${res.statusText} — ${errText.slice(0, 500)}`
      )
    }

    yield* parseOpenAISSE(res.body)
  }
}
