import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PiggyBank, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * H1 — Page Généalogie sur 3 générations.
 *
 * Layout 3 colonnes (desktop) :
 *  - Gen 1 : l'animal lui-même
 *  - Gen 2 : père + mère
 *  - Gen 3 : 4 grands-parents (PP, PM, MP, MM)
 *
 * Mobile : empilage vertical (sections).
 * Cartes cliquables → /cheptel/[id]. Parents inconnus = carte "Inconnu".
 */

type AnimalNode = {
  id: string
  tag: string
  nom: string | null
  sexe: 'M' | 'F'
  categorie: string
  date_naissance: string | null
  photo_url: string | null
  mere_id: string | null
  pere_id: string | null
  races?: { nom: string } | null
}

async function fetchAnimal(sb: any, id: string | null): Promise<AnimalNode | null> {
  if (!id) return null
  const { data } = await sb
    .from('animaux')
    .select('id, tag, nom, sexe, categorie, date_naissance, photo_url, mere_id, pere_id, races(nom)')
    .eq('id', id)
    .maybeSingle()
  return (data as AnimalNode | null) ?? null
}

type GenVariant = 'self' | 'sire' | 'dam'

const genNodeStyles: Record<GenVariant, string> = {
  self: 'border-[var(--apri)] bg-[var(--apri-bg)]',
  sire: 'border-[var(--sage-200)] bg-[var(--sage-bg)]',
  dam: 'border-[rgba(156,90,107,.32)] bg-[var(--plum-bg)]',
}

function AnimalCard({
  node,
  role,
  variant,
}: {
  node: AnimalNode | null
  role: string
  variant: GenVariant
}) {
  if (!node) {
    return (
      <div className="min-w-[148px] max-w-[200px] rounded-[var(--r)] border border-dashed border-[var(--line2)] bg-[var(--card)] px-3 py-3 text-center opacity-80">
        <div className="flex flex-col items-center gap-1">
          <HelpCircle className="h-6 w-6 text-[var(--mut)]" aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--mut)] font-bold">
            {role}
          </span>
          <span className="text-xs text-[var(--mut)]">Inconnu</span>
        </div>
      </div>
    )
  }

  const sexeBadge =
    node.sexe === 'M' ? '♂' : '♀'

  return (
    <Link href={`/cheptel/${node.id}`} className="block">
      <div
        className={`min-w-[148px] max-w-[200px] rounded-[var(--r)] border px-3 py-3 text-center transition-shadow hover:shadow-md ${genNodeStyles[variant]}`}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="h-14 w-14 rounded-[10px] overflow-hidden bg-[var(--card)]/70 border border-[var(--line)] flex items-center justify-center">
            {node.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={node.photo_url} alt={node.tag} className="object-cover h-full w-full" />
            ) : (
              <PiggyBank className="h-6 w-6 text-[var(--mut)]" aria-hidden />
            )}
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--mut)] font-bold">
            {role}
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono tabular-nums font-bold text-[var(--ink)] text-sm">
              {node.tag}
            </span>
            <span className="text-[var(--mut)]">{sexeBadge}</span>
          </div>
          {node.nom ? (
            <span className="text-xs text-[var(--ink-soft)] truncate max-w-full">{node.nom}</span>
          ) : null}
          <Badge variant="outline" className="capitalize text-[10px]">
            {node.categorie}
          </Badge>
        </div>
      </div>
    </Link>
  )
}

export default async function GenealogiePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sb = await createClient()
  const { id } = await params

  const animal = await fetchAnimal(sb, id)
  if (!animal) return notFound()

  // Gen 2 : père + mère
  const [pere, mere] = await Promise.all([
    fetchAnimal(sb, animal.pere_id),
    fetchAnimal(sb, animal.mere_id),
  ])

  // Gen 3 : 4 grands-parents
  const [perePere, pereMere, merePere, mereMere] = await Promise.all([
    fetchAnimal(sb, pere?.pere_id ?? null),
    fetchAnimal(sb, pere?.mere_id ?? null),
    fetchAnimal(sb, mere?.pere_id ?? null),
    fetchAnimal(sb, mere?.mere_id ?? null),
  ])

  const genLvlCls =
    'text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mut)]'
  const genLink = <div className="h-[13px] w-[2px] bg-[var(--line2)]" aria-hidden />

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="mb-2">
          <Link
            href={`/cheptel/${id}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--mut)] hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à la fiche
          </Link>
        </div>
        <h1
          className="text-4xl font-bold tracking-[0.01em] text-[var(--ink)] uppercase"
          style={{ fontFamily: 'var(--disp)' }}
        >
          Généalogie — {animal.tag}
          {animal.nom ? <span className="ml-2 text-2xl text-[var(--mut)]">({animal.nom})</span> : null}
        </h1>
        <p className="text-sm text-[var(--mut)] mt-1">
          Arbre généalogique sur 3 générations.
        </p>
      </div>

      {/* === Arbre généalogique vertical centré === */}
      <div className="pn">
        <div className="flex flex-col items-center gap-2 py-1.5">
          {/* Gen 1 — le sujet */}
          <span className={genLvlCls}>Sujet</span>
          <div className="flex flex-wrap justify-center gap-3">
            <AnimalCard node={animal} role="Sujet" variant="self" />
          </div>

          {genLink}

          {/* Gen 2 — parents */}
          <span className={genLvlCls}>Parents</span>
          <div className="flex flex-wrap justify-center gap-3">
            <AnimalCard node={pere} role="Père (verrat)" variant="sire" />
            <AnimalCard node={mere} role="Mère (truie)" variant="dam" />
          </div>

          {genLink}

          {/* Gen 3 — grands-parents */}
          <span className={genLvlCls}>Grands-parents</span>
          <div className="flex flex-wrap justify-center gap-3">
            <AnimalCard node={perePere} role="Grand-père ♂ paternel" variant="sire" />
            <AnimalCard node={pereMere} role="Grand-mère ♀ paternelle" variant="dam" />
            <AnimalCard node={merePere} role="Grand-père ♂ maternel" variant="sire" />
            <AnimalCard node={mereMere} role="Grand-mère ♀ maternelle" variant="dam" />
          </div>
        </div>
      </div>

      {/* Légende */}
      <Card>
        <CardContent className="p-4 text-xs text-[var(--mut)]">
          <strong className="text-[var(--ink)]">Lecture :</strong> chaque
          carte est cliquable et ouvre la fiche du reproducteur correspondant.
          Les emplacements <em>Inconnu</em> signalent qu&apos;aucun parent n&apos;a
          été renseigné — complète la généalogie depuis les fiches Père
          (<code className="font-mono">pere_id</code>) et Mère
          (<code className="font-mono">mere_id</code>).
        </CardContent>
      </Card>
    </div>
  )
}
