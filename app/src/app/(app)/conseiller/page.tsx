import Link from 'next/link'
import { Lightbulb, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { SearchTips } from './_components/search-tips'
import { TipCard, CATEGORIE_LABELS, NIVEAU_LABELS } from './_components/tip-card'

export const metadata = {
  title: 'Conseiller — Smart Farm',
  description:
    '300 conseils agritech pour gérer ton élevage porcin : reproduction, sanitaire, nutrition, conduite, économique, installation.',
}

const CATEGORIES = [
  'reproduction',
  'sanitaire',
  'nutrition',
  'conduite',
  'economique',
  'installation',
] as const

const NIVEAUX = ['debutant', 'intermediaire', 'expert'] as const

const PAGE_SIZE = 50

type SearchParams = {
  q?: string
  categorie?: string
  niveau?: string
  page?: string
}

export default async function ConseillerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const categorie = CATEGORIES.find((c) => c === sp.categorie) ?? null
  const niveau = NIVEAUX.find((n) => n === sp.niveau) ?? null
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)

  const sb = await createClient()

  // KPI counts (résilient : si la table n'existe pas encore on dégrade)
  let total = 0
  let totalRepro = 0
  let totalSanit = 0
  let totalNutri = 0
  let tableMissing = false

  try {
    const [allRes, reproRes, sanitRes, nutriRes] = await Promise.all([
      sb.from('tips_conseiller').select('*', { count: 'exact', head: true }),
      sb
        .from('tips_conseiller')
        .select('*', { count: 'exact', head: true })
        .eq('categorie', 'reproduction'),
      sb
        .from('tips_conseiller')
        .select('*', { count: 'exact', head: true })
        .eq('categorie', 'sanitaire'),
      sb
        .from('tips_conseiller')
        .select('*', { count: 'exact', head: true })
        .eq('categorie', 'nutrition'),
    ])
    if (allRes.error) tableMissing = true
    total = allRes.count ?? 0
    totalRepro = reproRes.count ?? 0
    totalSanit = sanitRes.count ?? 0
    totalNutri = nutriRes.count ?? 0
  } catch {
    tableMissing = true
  }

  // Requête liste avec filtres
  let tips: Array<{
    slug: string
    titre: string
    categorie: string
    niveau: string
    resume: string
    tags: string[]
  }> = []
  let nbResults = 0

  if (!tableMissing) {
    let query = sb
      .from('tips_conseiller')
      .select('slug, titre, categorie, niveau, resume, tags', {
        count: 'exact',
      })

    if (categorie) query = query.eq('categorie', categorie)
    if (niveau) query = query.eq('niveau', niveau)

    if (q) {
      // ilike sur titre OU résumé. Les tags sont matchés à part via overlaps.
      // .or() de supabase-js attend "col.ilike.%val%,col.ilike.%val%"
      const escaped = q.replace(/[%_,]/g, (m) => `\\${m}`)
      query = query.or(
        `titre.ilike.%${escaped}%,resume.ilike.%${escaped}%`
      )
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query
      .order('categorie', { ascending: true })
      .order('titre', { ascending: true })
      .range(from, to)

    const { data, count, error } = await query
    if (!error && data) {
      tips = data as typeof tips
      nbResults = count ?? data.length
    }
  }

  const nbPages = Math.max(1, Math.ceil(nbResults / PAGE_SIZE))

  // Helper pour construire un lien filtre en préservant q
  const buildFilterHref = (
    nextCategorie: string | null,
    nextNiveau: string | null
  ) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (nextCategorie) params.set('categorie', nextCategorie)
    if (nextNiveau) params.set('niveau', nextNiveau)
    const s = params.toString()
    return s ? `/conseiller?${s}` : '/conseiller'
  }

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (categorie) params.set('categorie', categorie)
    if (niveau) params.set('niveau', niveau)
    if (p > 1) params.set('page', String(p))
    const s = params.toString()
    return s ? `/conseiller?${s}` : '/conseiller'
  }

  // Pill class helper
  const pillCls = (active: boolean) =>
    'rounded-full px-3 py-1 text-xs font-medium transition-colors border ' +
    (active
      ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-[var(--sf-primary,#2D4A1F)]'
      : 'bg-transparent text-[var(--sf-ink,#1a1a1a)] border-[var(--sf-muted,#5C5346)]/30 hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]')

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)]">
          <Lightbulb className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
          Conseiller
        </h1>
        <p className="text-sm text-[var(--sf-muted,#5C5346)]">
          300 conseils pour gérer ton élevage porcin
        </p>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted,#5C5346)] font-bold">
              Total tips
            </div>
            <div className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-primary,#2D4A1F)] leading-none tabular-nums text-3xl mt-2">
              {total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted,#5C5346)] font-bold">
              Reproduction
            </div>
            <div className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-ink,#1a1a1a)] leading-none tabular-nums text-3xl mt-2">
              {totalRepro}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted,#5C5346)] font-bold">
              Sanitaire
            </div>
            <div className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-ink,#1a1a1a)] leading-none tabular-nums text-3xl mt-2">
              {totalSanit}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted,#5C5346)] font-bold">
              Nutrition
            </div>
            <div className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-ink,#1a1a1a)] leading-none tabular-nums text-3xl mt-2">
              {totalNutri}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recherche */}
      <SearchTips initial={q} />

      {/* Filtres catégorie */}
      <div className="space-y-2">
        <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-muted,#5C5346)] font-bold">
          Catégorie
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildFilterHref(null, niveau)}
            className={pillCls(!categorie)}
          >
            Toutes
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={buildFilterHref(c, niveau)}
              className={pillCls(categorie === c)}
            >
              {CATEGORIE_LABELS[c]}
            </Link>
          ))}
        </div>
      </div>

      {/* Filtres niveau */}
      <div className="space-y-2">
        <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-muted,#5C5346)] font-bold">
          Niveau
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildFilterHref(categorie, null)}
            className={pillCls(!niveau)}
          >
            Tous
          </Link>
          {NIVEAUX.map((n) => (
            <Link
              key={n}
              href={buildFilterHref(categorie, n)}
              className={pillCls(niveau === n)}
            >
              {NIVEAU_LABELS[n]}
            </Link>
          ))}
        </div>
      </div>

      {/* Compteur résultats */}
      <p className="text-sm text-[var(--sf-muted,#5C5346)]">
        {nbResults} conseil{nbResults > 1 ? 's' : ''} affiché
        {nbResults > 1 ? 's' : ''}
        {nbPages > 1 && (
          <span className="ml-2">
            · page {page} / {nbPages}
          </span>
        )}
      </p>

      {/* Grille de tips */}
      {tips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--sf-muted,#5C5346)]/30 p-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-[var(--sf-muted,#5C5346)]" />
          <p className="mt-3 text-sm text-[var(--sf-muted,#5C5346)]">
            {tableMissing
              ? 'Le catalogue est en cours de construction. Les conseils arriveront bientôt.'
              : total === 0
              ? 'Aucun conseil pour le moment — le catalogue sera bientôt rempli.'
              : 'Aucun conseil ne correspond à votre recherche.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tips.map((t) => (
            <TipCard key={t.slug} tip={t} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {nbPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2 pt-2"
        >
          {page > 1 && (
            <Link
              href={buildPageHref(page - 1)}
              className="rounded-md px-3 py-1.5 text-sm border border-[var(--sf-muted,#5C5346)]/30 text-[var(--sf-ink,#1a1a1a)] hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]"
            >
              ← Précédent
            </Link>
          )}
          <span className="text-sm text-[var(--sf-muted,#5C5346)] tabular-nums">
            {page} / {nbPages}
          </span>
          {page < nbPages && (
            <Link
              href={buildPageHref(page + 1)}
              className="rounded-md px-3 py-1.5 text-sm border border-[var(--sf-muted,#5C5346)]/30 text-[var(--sf-ink,#1a1a1a)] hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]"
            >
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
