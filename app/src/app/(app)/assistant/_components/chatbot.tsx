'use client'

import * as React from 'react'
import { Send, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessageBubble } from './message-bubble'
import { Suggestions } from './suggestions'

/**
 * Smart Farm — Chatbot (C7-B)
 *
 * Composant client qui orchestre la conversation avec /api/chatbot.
 *
 *  - Persistance : `localStorage` clé `smartfarm-chatbot-history-v1`,
 *    bornée aux 50 derniers messages.
 *  - Streaming : parse SSE `data: {"delta":"..."}` puis `data: {"done":true}`.
 *  - UX : Enter = envoyer, Shift+Enter = nouvelle ligne. Auto-resize textarea.
 *
 * Le composant ne connaît AUCUN détail de provider LLM (provider-agnostic).
 */

type Role = 'user' | 'assistant'

type ChatMessage = {
  role: Role
  content: string
}

const STORAGE_KEY = 'smartfarm-chatbot-history-v1'
const MAX_HISTORY = 50

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is ChatMessage =>
        m && typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    const trimmed = messages.slice(-MAX_HISTORY)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // quota / private mode — non bloquant
  }
}

export function Chatbot({ sessionToken }: { sessionToken: string }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  // Hydratation : on charge depuis localStorage côté client uniquement.
  React.useEffect(() => {
    setMessages(loadHistory())
    setHydrated(true)
  }, [])

  // Persistance à chaque changement (après hydratation).
  React.useEffect(() => {
    if (!hydrated) return
    saveHistory(messages)
  }, [messages, hydrated])

  // Auto-scroll en bas à chaque ajout.
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  // Auto-resize du textarea.
  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  const handleReset = React.useCallback(() => {
    if (isStreaming) {
      abortRef.current?.abort()
    }
    setMessages([])
    setError(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [isStreaming])

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      setError(null)
      const userMsg: ChatMessage = { role: 'user', content: trimmed }
      const baseMessages = [...messages, userMsg]
      // On ajoute en une seule MAJ : message utilisateur + placeholder assistant
      setMessages([...baseMessages, { role: 'assistant', content: '' }])
      setInput('')
      setIsStreaming(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const res = await fetch('/api/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Chatbot-Session': sessionToken,
          },
          body: JSON.stringify({ messages: baseMessages }),
          signal: ctrl.signal,
        })

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => '')
          throw new Error(
            `Erreur API (${res.status})${errText ? ` : ${errText.slice(0, 200)}` : ''}`,
          )
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        // Parsing SSE robuste : on accumule par chunk et on découpe sur "\n\n".
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sepIdx: number
          while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
            const eventBlock = buffer.slice(0, sepIdx)
            buffer = buffer.slice(sepIdx + 2)
            handleEventBlock(eventBlock)
          }
        }

        // Flush résiduel
        if (buffer.trim()) {
          handleEventBlock(buffer)
        }
      } catch (e: unknown) {
        if ((e as { name?: string })?.name === 'AbortError') {
          // Annulation volontaire — silencieux
        } else {
          // FIX-B #3 — On ne fuit JAMAIS le détail technique (status HTTP, payload, etc.)
          // côté UI. L'erreur précise reste loguée en console pour debug.
          console.error('Chatbot error:', e)
          const userFacing = "Je n'ai pas pu répondre — merci de réessayer dans un instant."
          setError(userFacing)
          // On rend visible l'erreur dans la dernière bulle si elle est vide
          setMessages((m) => {
            const last = m[m.length - 1]
            if (last && last.role === 'assistant' && last.content === '') {
              return [
                ...m.slice(0, -1),
                {
                  role: 'assistant',
                  content: userFacing,
                },
              ]
            }
            return m
          })
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }

      function handleEventBlock(block: string) {
        for (const rawLine of block.split('\n')) {
          const line = rawLine.trim()
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload) as {
              delta?: string
              done?: boolean
              error?: string
            }
            if (json.error) {
              throw new Error(json.error)
            }
            if (json.delta) {
              setMessages((m) => {
                const last = m[m.length - 1]
                if (!last || last.role !== 'assistant') return m
                return [
                  ...m.slice(0, -1),
                  { ...last, content: last.content + json.delta! },
                ]
              })
            }
            // json.done — fin de stream, rien à faire spécifiquement
          } catch {
            // ligne malformée — on ignore silencieusement
          }
        }
      }
    },
    [messages, isStreaming, sessionToken],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const lastIsEmptyAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].content === ''

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-[12px] border border-[var(--sf-line)] bg-[var(--sf-surface-0)] overflow-hidden">
      {/* En-tête du fil — registre carnet, pas barre de chat */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--sf-line)] bg-[var(--sf-surface-1)]">
        <div className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.12em] text-[11px] font-bold text-[var(--sf-muted)] tabular-nums">
          {messages.length === 0
            ? 'Fil de conseil'
            : `Fil de conseil · ${messages.length} échange${messages.length > 1 ? 's' : ''}`}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={messages.length === 0 && !isStreaming}
          className="gap-1.5 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Repartir à zéro
        </Button>
      </div>

      {/* Zone scroll — fil de conseil (entrées de carnet séparées par filets) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 ? (
          <Suggestions onPick={(p) => void sendMessage(p)} disabled={isStreaming} />
        ) : (
          <div className="divide-y divide-[var(--sf-line)]">
            {messages.map((m, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <MessageBubble
                  role={m.role}
                  content={m.content}
                  streaming={
                    isStreaming && i === messages.length - 1 && m.role === 'assistant'
                  }
                />
              </div>
            ))}
          </div>
        )}

        {isStreaming && lastIsEmptyAssistant && (
          <div className="text-[13px] text-[var(--sf-muted)] flex items-center gap-1.5 mt-2 font-[family-name:var(--sf-font-body)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Le conseiller consulte ses références…
          </div>
        )}
      </div>

      {/* Erreur (banner) — honnête, pas d'« oups » */}
      {error && (
        <div className="shrink-0 px-4 py-2.5 text-[13px] bg-[var(--sf-danger-bg)] text-[var(--sf-danger-ink)] border-t border-[var(--sf-danger-border)] font-[family-name:var(--sf-font-body)]">
          {error}
        </div>
      )}

      {/* Saisie de la question — registre carnet */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[var(--sf-line)] bg-[var(--sf-surface-1)] p-3"
      >
        <label
          htmlFor="sf-conseil-input"
          className="block font-[family-name:var(--sf-font-display)] uppercase tracking-[0.1em] text-[10px] font-bold text-[var(--sf-subtle)] mb-1.5"
        >
          Votre question
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="sf-conseil-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ration, sevrage, diagnostic, biosécurité… (Entrée pour poser, Maj+Entrée pour un saut de ligne)"
            rows={1}
            disabled={isStreaming}
            className={cn(
              'flex-1 resize-none rounded-[6px] border border-[var(--sf-line)] bg-[var(--sf-surface-0)]',
              'px-3 py-2.5 text-[15px] leading-relaxed text-[var(--sf-ink)] font-[family-name:var(--sf-font-body)]',
              'placeholder:text-[var(--sf-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--sf-focus)] focus:border-[var(--sf-primary)]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'min-h-12 max-h-[200px]',
            )}
          />
          <Button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="gap-1.5 shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Poser
          </Button>
        </div>
      </form>
    </div>
  )
}
