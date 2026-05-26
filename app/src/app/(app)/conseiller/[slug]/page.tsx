import * as React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Lightbulb, BookOpen, Tag as TagIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CATEGORIE_LABELS,
  NIVEAU_LABELS,
  CATEGORIE_BADGE_VARIANT,
  TipCard,
  type TipCardData,
} from '../_components/tip-card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sb = await createClient()
  const { data } = await sb
    .from('tips_conseiller')
    .select('titre, resume')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return { title: 'Conseil introuvable' }
  return {
    title: `${data.titre} — Conseiller`,
    description: data.resume,
  }
}

export default async function TipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sb = await createClient()

  const { data: tip, error } = await sb
    .from('tips_conseiller')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !tip) {
    notFound()
  }

  // Tips similaires : même catégorie, slug différent, max 3
  const { data: similaires } = await sb
    .from('tips_conseiller')
    .select('slug, titre, categorie, niveau, resume, tags')
    .eq('categorie', tip.categorie)
    .neq('slug', tip.slug)
    .limit(12)

  // Échantillon random : on tire 3 au hasard côté JS
  const similairesRandom: TipCardData[] = (() => {
    const arr = [...(similaires ?? [])]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr.slice(0, 3) as TipCardData[]
  })()

  const catVariant = CATEGORIE_BADGE_VARIANT[tip.categorie] ?? 'secondary'

  return (
    <div className="space-y-6">
      {/* Header retour */}
      <div>
        <Link
          href="/conseiller"
          className="inline-flex items-center gap-1 text-sm text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary,#2D4A1F)] transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au conseiller
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-[var(--sf-ink,#1a1a1a)] flex items-center gap-2">
              <Lightbulb className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)] shrink-0" />
              <span className="break-words">{tip.titre}</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant={catVariant}>
              {CATEGORIE_LABELS[tip.categorie] ?? tip.categorie}
            </Badge>
            <Badge variant="outline">
              {NIVEAU_LABELS[tip.niveau] ?? tip.niveau}
            </Badge>
          </div>
        </div>
      </div>

      {/* Résumé en intro */}
      <Card className="bg-[var(--sf-surface-2,#EFE7D6)]/50">
        <CardContent className="py-4">
          <p className="text-sm text-[var(--sf-ink,#1a1a1a)] leading-relaxed italic">
            {tip.resume}
          </p>
        </CardContent>
      </Card>

      {/* Grid : contenu principal + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Contenu markdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-[var(--sf-ink,#1a1a1a)]">
              <BookOpen className="h-5 w-5 text-[var(--sf-primary,#2D4A1F)]" />
              Contenu
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--sf-ink,#1a1a1a)] leading-relaxed">
            <MarkdownLite text={tip.contenu} />
          </CardContent>
        </Card>

        {/* Sidebar */}
        <aside className="space-y-4">
          {tip.tags && tip.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-[var(--sf-ink,#1a1a1a)]">
                  <TagIcon className="h-4 w-4 text-[var(--sf-primary,#2D4A1F)]" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {tip.tags.map((t: string) => (
                    <span
                      key={t}
                      className="inline-block rounded-md bg-[var(--sf-surface-2,#EFE7D6)]/60 px-2 py-0.5 text-[11px] text-[var(--sf-ink,#1a1a1a)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tip.source && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[var(--sf-ink,#1a1a1a)]">
                  Source
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-[var(--sf-muted,#5C5346)] italic">
                  {tip.source}
                </p>
              </CardContent>
            </Card>
          )}

          <Link
            href="/conseiller"
            className="block text-center text-sm text-[var(--sf-primary,#2D4A1F)] hover:underline"
          >
            ← Tous les conseils
          </Link>
        </aside>
      </div>

      {/* Tips similaires */}
      {similairesRandom.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted,#5C5346)] font-bold">
            Conseils similaires · {CATEGORIE_LABELS[tip.categorie] ?? tip.categorie}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {similairesRandom.map((s) => (
              <TipCard key={s.slug} tip={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Mini renderer markdown inline (extrait du chatbot C7, sans dépendance)     */
/* -------------------------------------------------------------------------- */

type Block =
  | { type: 'code'; lang: string; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; content: string }

function MarkdownLite({ text }: { text: string }) {
  const blocks = splitBlocks(text)
  return (
    <div className="space-y-1">
      {blocks.map((b, i) => (
        <React.Fragment key={i}>{renderBlock(b)}</React.Fragment>
      ))}
    </div>
  )
}

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++
      blocks.push({ type: 'code', lang, content: buf.join('\n') })
      continue
    }

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

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

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
        <pre className="my-2 rounded-md p-2.5 text-[12px] font-mono overflow-x-auto bg-[var(--sf-paper,#FBF9F4)] text-[var(--sf-ink,#1a1a1a)] border border-[var(--sf-border,#E5E0D8)]">
          <code>{b.content}</code>
        </pre>
      )
    case 'heading': {
      const sizeCls =
        b.level === 1
          ? 'text-lg font-bold mt-4 mb-2 text-[var(--sf-ink,#1a1a1a)]'
          : b.level === 2
          ? 'text-base font-bold mt-3 mb-1.5 text-[var(--sf-ink,#1a1a1a)]'
          : 'text-sm font-semibold mt-2 mb-1 text-[var(--sf-ink,#1a1a1a)]'
      return <div className={sizeCls}>{renderInline(b.content)}</div>
    }
    case 'list':
      return (
        <ul className="list-disc pl-5 my-1.5 space-y-1">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      )
    case 'paragraph':
      return (
        <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">
          {renderInline(b.content)}
        </p>
      )
  }
}

function renderInline(text: string): React.ReactNode {
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
    if (c === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) {
        flush()
        out.push(
          <code
            key={out.length}
            className={cn(
              'px-1 py-0.5 rounded text-[12px] font-mono',
              'bg-[var(--sf-paper,#FBF9F4)] border border-[var(--sf-border,#E5E0D8)]'
            )}
          >
            {text.slice(i + 1, end)}
          </code>
        )
        i = end + 1
        continue
      }
    }
    if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) {
        flush()
        out.push(
          <strong key={out.length} className="font-semibold">
            {renderInline(text.slice(i + 2, end))}
          </strong>
        )
        i = end + 2
        continue
      }
    }
    if (c === '*') {
      const end = text.indexOf('*', i + 1)
      if (end !== -1 && end !== i + 1) {
        flush()
        out.push(
          <em key={out.length} className="italic">
            {renderInline(text.slice(i + 1, end))}
          </em>
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
