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

function AnimalCard({
  node,
  role,
  highlight = false,
}: {
  node: AnimalNode | null
  role: string
  highlight?: boolean
}) {
  if (!node) {
    return (
      <Card className="opacity-70 border-dashed">
        <CardContent className="p-3 flex flex-col items-center text-center gap-1">
          <HelpCircle className="h-6 w-6 text-[var(--sf-muted)]" aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--sf-muted)] font-bold">
            {role}
          </span>
          <span className="text-xs text-[var(--sf-muted)]">Inconnu</span>
        </CardContent>
      </Card>
    )
  }

  const sexeBadge =
    node.sexe === 'M' ? '♂' : '♀'

  return (
    <Link href={`/cheptel/${node.id}`} className="block">
      <Card
        className={
          highlight
            ? 'border-2 border-[var(--sf-primary)] hover:shadow-md transition-shadow'
            : 'hover:shadow-md transition-shadow'
        }
      >
        <CardContent className="p-3 flex flex-col items-center text-center gap-1">
          <div className="h-14 w-14 rounded-md overflow-hidden bg-[var(--sf-surface-2)] border border-[var(--sf-line)] flex items-center justify-center">
            {node.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={node.photo_url} alt={node.tag} className="object-cover h-full w-full" />
            ) : (
              <PiggyBank className="h-6 w-6 text-[var(--sf-muted)]" aria-hidden />
            )}
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--sf-muted)] font-bold">
            {role}
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono tabular-nums font-bold text-[var(--sf-ink)] text-sm">
              {node.tag}
            </span>
            <span className="text-[var(--sf-muted)]">{sexeBadge}</span>
          </div>
          {node.nom ? (
            <span className="text-xs text-[var(--sf-ink)] truncate max-w-full">{node.nom}</span>
          ) : null}
          <Badge variant="outline" className="capitalize text-[10px]">
            {node.categorie}
          </Badge>
        </CardContent>
      </Card>
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

  const eyebrowCls =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold'

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="mb-2">
          <Link
            href={`/cheptel/${id}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à la fiche
          </Link>
        </div>
        <h1
          className="text-4xl font-bold tracking-[0.01em] text-[var(--sf-ink)] uppercase"
          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          Généalogie — {animal.tag}
          {animal.nom ? <span className="ml-2 text-2xl text-[var(--sf-muted)]">({animal.nom})</span> : null}
        </h1>
        <p className="text-sm text-[var(--sf-muted)] mt-1">
          Arbre généalogique sur 3 générations.
        </p>
      </div>

      {/* === Arbre 3 colonnes === */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Gen 1 — l'animal */}
        <section className="md:col-span-3 space-y-2">
          <h2 className={eyebrowCls}>Génération 1</h2>
          <AnimalCard node={animal} role="Sujet" highlight />
        </section>

        {/* Gen 2 — père/mère */}
        <section className="md:col-span-4 space-y-3">
          <h2 className={eyebrowCls}>Génération 2 — Parents</h2>
          <div className="space-y-2">
            <AnimalCard node={pere} role="Père (verrat)" />
            <AnimalCard node={mere} role="Mère (truie)" />
          </div>
        </section>

        {/* Gen 3 — 4 grands-parents */}
        <section className="md:col-span-5 space-y-3">
          <h2 className={eyebrowCls}>Génération 3 — Grands-parents</h2>
          <div className="grid grid-cols-2 gap-2">
            <AnimalCard node={perePere} role="Grand-père ♂ paternel" />
            <AnimalCard node={pereMere} role="Grand-mère ♀ paternelle" />
            <AnimalCard node={merePere} role="Grand-père ♂ maternel" />
            <AnimalCard node={mereMere} role="Grand-mère ♀ maternelle" />
          </div>
        </section>
      </div>

      {/* Légende */}
      <Card>
        <CardContent className="p-4 text-xs text-[var(--sf-muted)]">
          <strong className="text-[var(--sf-ink)]">Lecture :</strong> chaque
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
