'use client'

import * as React from 'react'

/**
 * Smart Farm — Entrée de carnet de conseil (refonte macrostructure 06)
 *
 * Registre « carnet du conseiller terrain », PAS bulle de chatbot :
 *   - Aucun avatar, aucun glyphe IA, aucune queue WhatsApp.
 *   - Chaque tour est une entrée labellisée : VOUS (question posée) /
 *     CONSEILLER (réponse). Le label est une eyebrow Big Shoulders en filet.
 *   - La question de l'éleveur est posée comme une note tirée à gauche
 *     (filet vert d'autorité) ; la réponse occupe la pleine mesure.
 *
 * Le contenu est rendu via un mini-renderer markdown maison (sans dépendance) :
 *   **gras**  *italique*  `code inline`  ```bloc```  - liste  ## titre.
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
    <article className="min-w-0">
      <div
        className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.12em] text-[11px] font-bold text-[var(--sf-muted)] mb-1"
      >
        {isUser ? 'Votre question' : 'Le conseiller répond'}
      </div>

      {isUser ? (
        // Question posée : note encadrée sur voile encre (filet gauche coloré
        // abandonné — migration side-stripe gate 6).
        <div className="min-w-0 rounded-[var(--sf-radius-sm)] border border-[var(--sf-line)] bg-[var(--sf-ink-wash)] px-3 py-2 text-[15px] leading-relaxed text-[var(--sf-ink)] whitespace-pre-wrap break-words font-[family-name:var(--sf-font-body)]">
          <MarkdownLite text={content} />
        </div>
      ) : (
        // Réponse du conseiller : pleine mesure, sur crème chaud.
        <div className="min-w-0 text-[15px] leading-relaxed text-[var(--sf-ink)] whitespace-pre-wrap break-words font-[family-name:var(--sf-font-body)]">
          {content ? (
            <MarkdownLite text={content} />
          ) : streaming ? (
            <TypingDots />
          ) : null}
        </div>
      )}
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* Mini renderer markdown                                                     */
/* -------------------------------------------------------------------------- */

function MarkdownLite({ text }: { text: string }) {
  const blocks = splitBlocks(text)
  return (
    <>
      {blocks.map((b, i) => (
        <React.Fragment key={i}>{renderBlock(b)}</React.Fragment>
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

function renderBlock(b: Block): React.ReactNode {
  switch (b.type) {
    case 'code':
      return (
        <pre className="my-2 rounded-[6px] p-2.5 text-[12px] font-[family-name:var(--sf-font-mono)] overflow-x-auto bg-[var(--sf-surface-2)] text-[var(--sf-ink)] border border-[var(--sf-line)]">
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
      return <div className={sizeCls}>{renderInline(b.content)}</div>
    }
    case 'list':
      return (
        <ul className="list-disc pl-5 my-1 space-y-0.5">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      )
    case 'paragraph':
      return <p className="my-1 first:mt-0 last:mb-0">{renderInline(b.content)}</p>
  }
}

/** Rend les marques inline : **gras**, *italique*, `code`. */
function renderInline(text: string): React.ReactNode {
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
            className="px-1 py-0.5 rounded-[4px] text-[12px] font-[family-name:var(--sf-font-mono)] bg-[var(--sf-surface-2)] border border-[var(--sf-line)]"
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
            {renderInline(text.slice(i + 2, end))}
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
            {renderInline(text.slice(i + 1, end))}
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
  // Indicateur honnête, pas de « bulles qui tapent » : un curseur d'écriture
  // sur filet, opacity-only (motrice), neutralisé en reduced-motion.
  return (
    <span className="inline-flex items-center gap-2 text-[var(--sf-muted)] text-[13px] font-[family-name:var(--sf-font-body)]">
      <style>{CARET_CSS}</style>
      <span className="h-3 w-[2px] bg-[var(--sf-primary)] sf-caret" aria-hidden />
      Le conseiller rédige sa réponse…
    </span>
  )
}

const CARET_CSS = `
@keyframes sf-caret-blink { 0%,100% { opacity: 1 } 50% { opacity: 0.15 } }
.sf-caret { animation: sf-caret-blink 1s steps(2,start) infinite; }
@media (prefers-reduced-motion: reduce) { .sf-caret { animation: none; opacity: 0.6 } }
`
