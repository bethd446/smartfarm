/* Hallmark · macrostructure: 11-catalogue · screen: /conseiller · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P5 H4 E4 S4 R4 V4 */
import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { SearchTips } from './_components/search-tips'
import {
  CATEGORIE_LABELS,
  CATEGORIE_BADGE_VARIANT,
  NIVEAU_LABELS,
} from './_components/tip-card'

export const metadata = {
  title: 'Conseiller',
  description:
    'Conseils techniques pour gérer ton élevage porcin : reproduction, sanitaire, nutrition, conduite, économique, installation.',
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

  // Inventaire par catégorie (résilient : si la table n'existe pas encore on dégrade)
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

  // Pill class helper — touch target ≥ 44px (audit mobile 2026-05-25)
  const pillCls = (active: boolean) =>
    'inline-flex items-center min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 border ' +
    (active
      ? 'bg-[var(--sf-primary)] text-[var(--sf-warm)] border-[var(--sf-primary)]'
      : 'bg-transparent text-[var(--sf-ink)] border-[var(--sf-line)] hover:bg-[var(--sf-surface-1)]')

  // Le compteur ouvre le catalogue (grammaire Catalogue : inventaire daté/compté).
  const nbCategoriesGarnies = [totalRepro, totalSanit, totalNutri].filter(
    (n) => n > 0
  ).length

  // Bornes catalogue : numéro de tête / fin du lot affiché.
  const firstNum = nbResults > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const lastNum = (page - 1) * PAGE_SIZE + tips.length

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* En-tête d'inventaire — le compte EST le titre (grammaire Catalogue) */}
      <header className="pb-5">
        <p className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.16em] text-[var(--sf-accent)] font-bold">
          Catalogue conseiller
        </p>
        <h1
          className="no-uppercase mt-1.5 font-[family-name:var(--sf-font-display)] text-[1.75rem] leading-[1.1] font-bold text-[var(--sf-ink)] tracking-[-0.01em]"
        >
          <span className="tabular-nums">{total}</span> conseil
          {total > 1 ? 's' : ''} techniques
          {!tableMissing && total > 0 && (
            <span className="text-[var(--sf-subtle)]">
              {' · '}
              <span className="tabular-nums">{CATEGORIES.length}</span>{' '}
              catégories
            </span>
          )}
        </h1>
        <p className="mt-1.5 max-w-prose font-[family-name:var(--sf-font-editorial)] text-base italic leading-snug text-[var(--sf-muted)]">
          Reproduction, sanitaire, nutrition, conduite : l’inventaire technique
          pour conduire ton élevage porcin.
        </p>
      </header>

      {/* Bande d'inventaire — registres variés, pas un quad de KPI uniformes.
          Total en tête (anchor), répartition par catégorie en filets. */}
      {!tableMissing && total > 0 && (
        <dl className="grid grid-cols-3 border-y border-[var(--sf-line)] divide-x divide-[var(--sf-line)]">
          {(
            [
              ['reproduction', totalRepro],
              ['sanitaire', totalSanit],
              ['nutrition', totalNutri],
            ] as const
          ).map(([cat, n]) => (
            <Link
              key={cat}
              href={buildFilterHref(cat, niveau)}
              className={
                'group flex flex-col gap-0.5 px-3 py-3 transition-colors duration-150 hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]' +
                (categorie === cat ? ' bg-[var(--sf-surface-2)]' : '')
              }
            >
              <dt className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.12em] text-[var(--sf-muted)] font-bold">
                {CATEGORIE_LABELS[cat]}
              </dt>
              <dd className="font-[family-name:var(--sf-font-display)] tabular-nums text-2xl font-semibold leading-none text-[var(--sf-ink)]">
                {n}
              </dd>
            </Link>
          ))}
        </dl>
      )}

      {/* Recherche */}
      <div className="pt-5">
        <SearchTips initial={q} />
      </div>

      {/* Filtres — catégorie puis niveau, alignés en filets (langage catalogue) */}
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-subtle)] font-bold w-[5.5rem] shrink-0">
            Catégorie
          </span>
          <div className="flex flex-1 flex-wrap gap-2">
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-subtle)] font-bold w-[5.5rem] shrink-0">
            Niveau
          </span>
          <div className="flex flex-1 flex-wrap gap-2">
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
      </div>

      {/* Ligne d'inventaire affiché (catalogue : bornes + total filtré) */}
      <div className="mt-5 flex items-baseline justify-between gap-2 border-b-2 border-[var(--sf-primary)] pb-1.5">
        <span className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-muted)] font-bold">
          {nbResults > 0 ? (
            <>
              <span className="tabular-nums">
                {String(firstNum).padStart(2, '0')}–
                {String(lastNum).padStart(2, '0')}
              </span>{' '}
              sur <span className="tabular-nums">{nbResults}</span>
            </>
          ) : (
            'Aucun conseil'
          )}
        </span>
        {nbPages > 1 && (
          <span className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-subtle)] font-bold tabular-nums">
            Page {page} / {nbPages}
          </span>
        )}
      </div>

      {/* Index des conseils — liste numérotée, bandeau de catégorie entre groupes */}
      {tips.length === 0 ? (
        <div className="mt-8 border border-dashed border-[var(--sf-line)] bg-[var(--sf-surface-1)] p-10 text-center">
          <AlertTriangle className="mx-auto h-9 w-9 text-[var(--sf-subtle)]" />
          <p className="mx-auto mt-3 max-w-prose text-sm text-[var(--sf-muted)]">
            {tableMissing
              ? 'Le catalogue est en cours de constitution. Les conseils arriveront bientôt.'
              : total === 0
              ? 'Aucun conseil pour le moment — le catalogue sera bientôt rempli.'
              : 'Aucun conseil ne correspond à cette recherche. Élargis la catégorie ou le niveau.'}
          </p>
          {!tableMissing && total > 0 && (categorie || niveau || q) && (
            <Link
              href="/conseiller"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-md border border-[var(--sf-line)] px-4 text-sm font-medium text-[var(--sf-ink)] transition-colors duration-150 hover:bg-[var(--sf-surface-2)]"
            >
              Réinitialiser les filtres
            </Link>
          )}
        </div>
      ) : (
        <ol>
          {tips.map((t, i) => {
            const catVariant =
              CATEGORIE_BADGE_VARIANT[t.categorie] ?? 'secondary'
            const visibleTags = t.tags.slice(0, 4)
            const extraTags = t.tags.length - visibleTags.length
            const num = (page - 1) * PAGE_SIZE + i + 1
            // Bandeau de catégorie quand la catégorie change (la requête ordonne par catégorie).
            const showBand =
              !categorie && (i === 0 || tips[i - 1].categorie !== t.categorie)

            return (
              <li key={t.slug}>
                {showBand && (
                  <div className="flex items-center gap-3 pt-6 pb-1">
                    <span className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.16em] text-[var(--sf-accent)] font-bold">
                      {CATEGORIE_LABELS[t.categorie] ?? t.categorie}
                    </span>
                    <span className="h-px flex-1 bg-[var(--sf-line)]" />
                  </div>
                )}
                <Link
                  href={`/conseiller/${t.slug}`}
                  className="group flex items-start gap-3 md:gap-4 min-h-[44px] border-b border-[var(--sf-line)] py-4 transition-colors duration-150 hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]"
                >
                  {/* Numéro de catalogue */}
                  <span className="shrink-0 tabular-nums text-[var(--sf-subtle)] text-sm font-semibold leading-tight pt-0.5 w-7 text-right font-[family-name:var(--sf-font-display)]">
                    {String(num).padStart(2, '0')}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Titre + badges catégorie/niveau */}
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h2 className="font-[family-name:var(--sf-font-display)] text-[15px] md:text-base font-semibold leading-tight text-[var(--sf-ink)] tracking-[0.01em]">
                        {t.titre}
                      </h2>
                      <span className="inline-flex flex-wrap gap-1.5">
                        <Badge variant={catVariant}>
                          {CATEGORIE_LABELS[t.categorie] ?? t.categorie}
                        </Badge>
                        <Badge variant="outline">
                          {NIVEAU_LABELS[t.niveau] ?? t.niveau}
                        </Badge>
                      </span>
                    </div>

                    {/* Résumé */}
                    <p className="mt-1 text-sm text-[var(--sf-muted)] line-clamp-2">
                      {t.resume}
                    </p>

                    {/* Tags */}
                    {visibleTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {visibleTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block bg-[var(--sf-surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--sf-muted)]"
                          >
                            #{tag}
                          </span>
                        ))}
                        {extraTags > 0 && (
                          <span className="inline-block px-1 py-0.5 text-[11px] text-[var(--sf-subtle)] tabular-nums">
                            +{extraTags}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="shrink-0 mt-1 h-4 w-4 text-[var(--sf-subtle)] transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            )
          })}
        </ol>
      )}

      {/* Pagination */}
      {nbPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between gap-2"
        >
          {page > 1 ? (
            <Link
              href={buildPageHref(page - 1)}
              className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--sf-line)] px-4 text-sm font-medium text-[var(--sf-ink)] transition-colors duration-150 hover:bg-[var(--sf-surface-1)]"
            >
              ← Précédent
            </Link>
          ) : (
            <span aria-hidden />
          )}
          <span className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.14em] text-[var(--sf-muted)] font-bold tabular-nums">
            {page} / {nbPages}
          </span>
          {page < nbPages ? (
            <Link
              href={buildPageHref(page + 1)}
              className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--sf-line)] px-4 text-sm font-medium text-[var(--sf-ink)] transition-colors duration-150 hover:bg-[var(--sf-surface-1)]"
            >
              Suivant →
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </nav>
      )}
    </div>
  )
}
