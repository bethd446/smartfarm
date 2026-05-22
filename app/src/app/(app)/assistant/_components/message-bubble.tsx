'use client'

import * as React from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Smart Farm — MessageBubble (C7-B + V2-H polish)
 *
 * Bulle individuelle dans la conversation. Style « WhatsApp » :
 *   - Avatar IA cercle emerald avec emoji 🐷 (fallback car marius-avatar.webp absent)
 *   - Bulles avec rebords asymétriques (queue côté avatar)
 *   - Fond emerald-100 pour user (à droite), card/blanc pour assistant (à gauche)
 *
 * Le contenu est rendu avec un mini-renderer markdown maison (volontairement
 * minimal pour éviter une dépendance) qui couvre :
 *   - **gras**  *italique*  `code inline`
 *   - blocs de code ```...```
 *   - listes à puces `- item`
 *   - titres `## titre`
 *   - sauts de ligne / paragraphes
 *
 * Ce rendu est suffisant pour les réponses agritech (listes posologie,
 * tableaux courts, code rare). Pas de table HTML (Telegram-friendly).
 */

type Role = 'user' | 'assistant' | 'system'

export function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: Role
  content: string
  streaming?: boolean
}) {
  if (role === 'system') return null

  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'flex items-end gap-2 w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Avatar IA — visible uniquement côté assistant, à gauche */}
      {!isUser && (
        <div
          className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-base bg-emerald-600 text-white shadow-sm"
          aria-hidden
          title="Assistant"
        >
          <span role="img" aria-label="Assistant">
            🐷
          </span>
        </div>
      )}

      {/* Bubble — rebords asymétriques style WhatsApp */}
      <div
        className={cn(
          'min-w-0 max-w-[75%] px-3.5 py-2 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-emerald-100 text-[var(--sf-ink,#1a1a1a)] rounded-2xl rounded-br-sm'
            : 'bg-[var(--sf-surface-1)] border border-[var(--sf-border,#E5E0D8)] text-[var(--sf-ink,#1a1a1a)] rounded-2xl rounded-bl-sm',
        )}
      >
        {content ? (
          <MarkdownLite text={content} dark={false} />
        ) : streaming ? (
          <TypingDots />
        ) : null}
      </div>

      {/* Avatar user — visible uniquement côté user, à droite */}
      {isUser && (
        <div
          className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center bg-amber-500 text-white shadow-sm"
          aria-hidden
          title="Vous"
        >
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Mini renderer markdown                                                     */
/* -------------------------------------------------------------------------- */

function MarkdownLite({ text, dark }: { text: string; dark?: boolean }) {
  const blocks = splitBlocks(text)
  return (
    <>
      {blocks.map((b, i) => (
        <React.Fragment key={i}>{renderBlock(b, dark)}</React.Fragment>
      ))}
    </>
  )
}

type Block =
  | { type: 'code'; lang: string; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; content: string }

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Code fence ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ type: 'code', lang, content: buf.join('\n') })
      continue
    }

    // Heading ## or ###
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      })
      i++
      continue
    }

    // List bloc (lignes successives `- ...` ou `* ...`)
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }

    // Ligne vide
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraphe (lignes contiguës non spéciales)
    const buf: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push({ type: 'paragraph', content: buf.join('\n') })
  }
  return blocks
}

function renderBlock(b: Block, dark?: boolean): React.ReactNode {
  switch (b.type) {
    case 'code':
      return (
        <pre
          className={cn(
            'my-2 rounded-md p-2.5 text-[12px] font-mono overflow-x-auto',
            dark ? 'bg-black/30 text-white' : 'bg-[var(--sf-paper,#FBF9F4)] text-[var(--sf-ink,#1a1a1a)] border border-[var(--sf-border,#E5E0D8)]',
          )}
        >
          <code>{b.content}</code>
        </pre>
      )
    case 'heading': {
      const sizeCls =
        b.level === 1
          ? 'text-base font-bold mt-2 mb-1'
          : b.level === 2
          ? 'text-sm font-bold mt-2 mb-1'
          : 'text-sm font-semibold mt-1.5 mb-0.5'
      return <div className={sizeCls}>{renderInline(b.content, dark)}</div>
    }
    case 'list':
      return (
        <ul className="list-disc pl-5 my-1 space-y-0.5">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it, dark)}</li>
          ))}
        </ul>
      )
    case 'paragraph':
      return <p className="my-1 first:mt-0 last:mb-0">{renderInline(b.content, dark)}</p>
  }
}

/** Rend les marques inline : **gras**, *italique*, `code`. */
function renderInline(text: string, dark?: boolean): React.ReactNode {
  // Tokenize sur les marqueurs. Implémentation linéaire : on parcourt
  // caractère par caractère et on découpe.
  const out: React.ReactNode[] = []
  let i = 0
  let buf = ''
  const flush = () => {
    if (buf) {
      out.push(buf)
      buf = ''
    }
  }
  while (i < text.length) {
    const c = text[i]
    // Code inline `...`
    if (c === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) {
        flush()
        out.push(
          <code
            key={out.length}
            className={cn(
              'px-1 py-0.5 rounded text-[12px] font-mono',
              dark ? 'bg-black/30' : 'bg-[var(--sf-paper,#FBF9F4)] border border-[var(--sf-border,#E5E0D8)]',
            )}
          >
            {text.slice(i + 1, end)}
          </code>,
        )
        i = end + 1
        continue
      }
    }
    // Gras **...**
    if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) {
        flush()
        out.push(
          <strong key={out.length} className="font-semibold">
            {renderInline(text.slice(i + 2, end), dark)}
          </strong>,
        )
        i = end + 2
        continue
      }
    }
    // Italique *...*
    if (c === '*') {
      const end = text.indexOf('*', i + 1)
      if (end !== -1 && end !== i + 1) {
        flush()
        out.push(
          <em key={out.length} className="italic">
            {renderInline(text.slice(i + 1, end), dark)}
          </em>,
        )
        i = end + 1
        continue
      }
    }
    buf += c
    i++
  }
  flush()
  return <>{out}</>
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center text-[var(--sf-muted,#5C5346)]">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
    </span>
  )
}
