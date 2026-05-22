import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getChatProvider, type ChatMessage } from '@/lib/chatbot/provider'
import { SYSTEM_PROMPT } from '@/lib/chatbot/system-prompt'
import { getContexteFerme } from '@/lib/chatbot/rag'
import { verifySessionToken } from '@/lib/chatbot/session-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Validation ──────────────────────────────────────────────────────────────

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(8000),
})

// Cap dur côté serveur : on coupe l'historique pour éviter qu'un client bidon
// envoie 10000 messages de 8KB et fasse exploser le coût LLM.
const MAX_MESSAGES_PER_REQUEST = 20

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES_PER_REQUEST),
})

// ─── Rate limit in-memory (V1 simple, V2 Upstash/Redis) ──────────────────────
//
// Bucket fixe par token, fenêtre 60s, 20 requêtes max. Stocké dans la mémoire
// du process Node : suffisant pour une instance unique en V1. En V2 multi-pod
// ou serverless, basculer vers Upstash @ratelimit.

const buckets = new Map<string, { count: number; reset_at: number }>()
const LIMIT_PER_MINUTE = 20

function checkRateLimit(token: string): { allowed: boolean; retry_after?: number } {
  const now = Date.now()
  // 16 premiers caractères du token = ts (≃ identifiant unique de session). On
  // évite de stocker le token signé entier comme clé pour limiter l'exposition.
  const key = token.slice(0, 16)
  const b = buckets.get(key)
  if (!b || b.reset_at < now) {
    buckets.set(key, { count: 1, reset_at: now + 60_000 })
    return { allowed: true }
  }
  if (b.count >= LIMIT_PER_MINUTE) {
    return { allowed: false, retry_after: Math.ceil((b.reset_at - now) / 1000) }
  }
  b.count += 1
  return { allowed: true }
}

// GC très simple pour éviter une fuite mémoire à long terme.
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (v.reset_at < now) buckets.delete(k)
  }
}, 5 * 60_000).unref?.()

// ─── Helpers SSE ─────────────────────────────────────────────────────────────

function sseEncode(obj: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)
}

// ─── Handler POST ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // 0. Auth — token de session signé HMAC injecté par /assistant Server Component
  const token = req.headers.get('X-Chatbot-Session')
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
  }
  const tokenCheck = verifySessionToken(token)
  if (!tokenCheck.valid) {
    return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 })
  }

  // 0.bis Rate limit — 20 req/min par session
  const rl = checkRateLimit(token)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de requêtes, réessaye dans ${rl.retry_after}s` },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retry_after ?? 60) },
      }
    )
  }

  // 1. Parse + validation
  let body: z.infer<typeof bodySchema>
  try {
    const json = await req.json()
    body = bodySchema.parse(json)
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Requête invalide',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    )
  }

  // 2. Récupération du contexte ferme (best-effort, ne doit pas casser le chat)
  let contexteFerme = ''
  try {
    const supabase = await createClient()
    contexteFerme = await getContexteFerme(supabase)
  } catch (err) {
    console.warn('[chatbot] contexte ferme indisponible :', err)
  }

  // 3. Construction des messages finaux : system prompt + snapshot ferme + historique
  const systemContent = contexteFerme
    ? `${SYSTEM_PROMPT}\n\n${contexteFerme}`
    : SYSTEM_PROMPT

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...body.messages.filter((m) => m.role !== 'system'),
  ]

  // 4. Provider via factory (lit CHATBOT_PROVIDER → openrouter par défaut)
  let provider
  try {
    provider = getChatProvider()
  } catch (err) {
    console.error('[chatbot] provider init failed :', err)
    return NextResponse.json(
      { error: 'Provider chatbot indisponible' },
      { status: 500 }
    )
  }

  // 5. Pipe en ReadableStream SSE
  const abortController = new AbortController()
  req.signal.addEventListener('abort', () => abortController.abort())

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const iterator = provider.streamChat(fullMessages, {
          temperature: 0.7,
          max_tokens: 1024,
          signal: abortController.signal,
        })
        let finalUsage: { input_tokens: number; output_tokens: number } | undefined
        for await (const chunk of iterator) {
          if (chunk.delta) {
            controller.enqueue(sseEncode({ delta: chunk.delta }))
          }
          if (chunk.usage) finalUsage = chunk.usage
          if (chunk.done) break
        }
        controller.enqueue(
          sseEncode({ done: true, ...(finalUsage ? { usage: finalUsage } : {}) })
        )
        controller.close()
      } catch (err) {
        // P1-2 : on log l'erreur réelle côté serveur uniquement, on renvoie au
        // client un message GÉNÉRIQUE — pas de stack/clé/URL upstream qui fuit.
        const realMessage = err instanceof Error ? err.message : String(err)
        console.error('[chatbot] stream error :', realMessage)
        try {
          controller.enqueue(
            sseEncode({
              error: 'Erreur du fournisseur LLM, réessaye dans quelques secondes',
              done: true,
            })
          )
          controller.close()
        } catch {
          /* déjà fermé */
        }
      }
    },
    cancel() {
      abortController.abort()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
