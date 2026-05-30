import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageTitle } from '@/components/ui/page-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import { Syringe, ChevronLeft, AlertTriangle, FileText, FileSpreadsheet } from 'lucide-react'
import { DialogActe, type ProduitOption } from './_dialog-acte'

export const metadata: Metadata = { title: 'Actes sanitaires' }

type ActeRow = {
  id: string
  date_administration: string
  dose: number
  unite_dose: string
  voie: string
  duree_jours: number
  motif: string | null
  delai_attente_viande_jours: number | null
  date_fin_delai_attente: string | null
  animal: { tag: string | null; nom: string | null } | null
  bande: { code: string | null; nom: string | null } | null
  produit: { nom: string; type: string } | null
  operateur_user_id: string | null
}

const PAGE_SIZE = 50

export default async function ActesSanitairesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string
    mois?: string // 'YYYY-MM'
    type?: string
    animal_id?: string
  }>
}) {
  const sb = await createClient()
  const params = (await searchParams) ?? {}
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const filterMois = params.mois?.match(/^\d{4}-\d{2}$/) ? params.mois : null
  const filterType = params.type?.trim() || null
  const filterAnimalId = params.animal_id?.match(/^[0-9a-f-]{36}$/i)
    ? params.animal_id
    : null
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // ---------------------- Référentiel véto (graceful) ----------------------
  // Si Lane B1 pas encore appliquée → graceful fallback.
  let produits: ProduitOption[] = []
  let vetoMissing = false
  try {
    const { data: prodData, error: prodErr } = await sb
      .from('veterinaires_standards')
      .select('id, nom, type, voie, delai_attente_j, max_jours')
      .order('nom')
    if (prodErr) {
      // table absente OU GRANT manquant
      if (
        prodErr.code === '42P01' || // undefined_table
        prodErr.code === '42501'    // insufficient_privilege
      ) {
        vetoMissing = true
      } else {
        console.error('[actes-sanitaires] veto query error:', prodErr)
      }
    } else {
      produits = (prodData ?? []) as ProduitOption[]
      if (produits.length === 0) vetoMissing = true
    }
  } catch (e) {
    console.error('[actes-sanitaires] veto unexpected:', e)
    vetoMissing = true
  }

  // ---------------------- Animaux + Bandes (pour selects) ------------------
  // Animaux vivants uniquement (cf brain L100)
  const { data: animauxData } = await sb
    .from('animaux')
    .select('id, tag, nom')
    .in('statut', ['actif', 'malade'])
    .is('deleted_at', null)
    .order('tag', { ascending: true })

  const { data: bandesData } = await sb
    .from('bandes')
    .select('id, code, nom')
    .order('date_debut', { ascending: false })

  const animaux = (animauxData ?? []).map((a) => ({
    id: a.id as string,
    tag: (a.tag as string) ?? '—',
    nom: (a.nom as string | null) ?? null,
  }))
  const bandes = (bandesData ?? []).map((b) => ({
    id: b.id as string,
    code: (b.code as string | null) ?? null,
    nom: (b.nom as string | null) ?? null,
  }))

  // ---------------------- Actes (page courante) ----------------------------
  let actes: ActeRow[] = []
  let total = 0
  let actesError: string | null = null

  try {
    let q = sb
      .from('actes_sanitaires')
      .select(
        `
        id,
        date_administration,
        dose,
        unite_dose,
        voie,
        duree_jours,
        motif,
        delai_attente_viande_jours,
        date_fin_delai_attente,
        operateur_user_id,
        animal:animaux ( tag, nom ),
        bande:bandes ( code, nom ),
        produit:veterinaires_standards ( nom, type )
        `,
        { count: 'exact' },
      )

    if (filterMois) {
      const [y, m] = filterMois.split('-').map(Number)
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString()
      const end = new Date(Date.UTC(y, m, 1)).toISOString()
      q = q.gte('date_administration', start).lt('date_administration', end)
    }
    if (filterAnimalId) {
      q = q.eq('animal_id', filterAnimalId)
    }
    // filterType (type de produit) → filtre côté résultats via FK ; on filtre
    // côté SQL via .eq sur veterinaires_standards.type via foreign-key syntax.
    if (filterType) {
      q = q.eq('veterinaires_standards.type', filterType)
    }

    const { data, error, count } = await q
      .order('date_administration', { ascending: false })
      .range(from, to)

    if (error) {
      // 42P01 = table absente (migration B3 pas appliquée)
      if (error.code === '42P01') {
        actesError = 'Migration B3 pas encore appliquée — table actes_sanitaires manquante.'
      } else if (error.code === '42501') {
        actesError = 'Accès refusé (RLS/GRANT).'
      } else {
        actesError = `Erreur chargement : ${error.message}`
      }
    } else {
      // Supabase peut typer animal/bande/produit comme array selon la version
      actes = (data ?? []).map((r: any) => ({
        ...r,
        animal: Array.isArray(r.animal) ? r.animal[0] ?? null : r.animal ?? null,
        bande: Array.isArray(r.bande) ? r.bande[0] ?? null : r.bande ?? null,
        produit: Array.isArray(r.produit) ? r.produit[0] ?? null : r.produit ?? null,
      })) as ActeRow[]
      total = count ?? actes.length
    }
  } catch (e) {
    console.error('[actes-sanitaires] query unexpected:', e)
    actesError = 'Erreur inattendue chargement actes.'
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/sanitaire"
          className="inline-flex items-center text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Sanitaire
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle
            eyebrow="CARNET MIRAH"
            icon={<Syringe className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            Actes sanitaires
          </PageTitle>
          <p className="text-sm text-[var(--sf-muted)]">
            {total} acte{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''} ·
            traçabilité traitements véto
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {total > 0 && (
            <>
              <Link
                href={`/sanitaire/actes/export?format=pdf${filterMois ? `&from=${filterMois}-01&to=${filterMois}-31` : ''}`}
                prefetch={false}
              >
                <Button variant="outline" size="lg" className="h-12">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF MIRAH
                </Button>
              </Link>
              <Link
                href={`/sanitaire/actes/export?format=csv${filterMois ? `&from=${filterMois}-01&to=${filterMois}-31` : ''}`}
                prefetch={false}
              >
                <Button variant="outline" size="lg" className="h-12">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV MIRAH
                </Button>
              </Link>
            </>
          )}
          <DialogActe
            animaux={animaux}
            bandes={bandes}
            produits={produits}
            vetoMissing={vetoMissing}
          />
        </div>
      </div>

      {vetoMissing && (
        <div className="rounded-md border border-[var(--sf-warning-border,#A16207)] bg-[var(--sf-warning-bg,#FFFBEB)] p-4 text-sm text-[var(--sf-warning-ink,#9A6700)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <strong>Référentiel véto manquant.</strong>
              <p className="mt-1">
                Appliquer la migration B1 (<code>seed_veterinaires_standards</code>)
                pour activer l&apos;enregistrement de traitements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres GET (mois / type produit / animal) */}
      {!actesError && !vetoMissing && (
        <form
          method="get"
          action="/sanitaire/actes"
          className="flex flex-wrap items-end gap-3 text-sm"
        >
          <div>
            <label
              htmlFor="filter-mois"
              className="block text-xs uppercase tracking-wide text-[var(--sf-muted)] mb-1"
            >
              Mois
            </label>
            <input
              id="filter-mois"
              type="month"
              name="mois"
              defaultValue={filterMois ?? ''}
              className="h-9 px-2 rounded border border-[var(--sf-line,rgba(0,0,0,0.18))] bg-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="filter-type"
              className="block text-xs uppercase tracking-wide text-[var(--sf-muted)] mb-1"
            >
              Type produit
            </label>
            <select
              id="filter-type"
              name="type"
              defaultValue={filterType ?? ''}
              className="h-9 px-2 rounded border border-[var(--sf-line,rgba(0,0,0,0.18))] bg-transparent"
            >
              <option value="">Tous</option>
              <option value="tonique">Tonique</option>
              <option value="vitamine">Vitamine</option>
              <option value="mineral">Minéral</option>
              <option value="antibiotique">Antibiotique</option>
              <option value="antiparasitaire">Antiparasitaire</option>
              <option value="vaccin">Vaccin</option>
              <option value="desinfectant">Désinfectant</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="filter-animal"
              className="block text-xs uppercase tracking-wide text-[var(--sf-muted)] mb-1"
            >
              Animal
            </label>
            <select
              id="filter-animal"
              name="animal_id"
              defaultValue={filterAnimalId ?? ''}
              className="h-9 px-2 rounded border border-[var(--sf-line,rgba(0,0,0,0.18))] bg-transparent max-w-[240px]"
            >
              <option value="">Tous</option>
              {animaux.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom ? `${a.tag} — ${a.nom}` : a.tag}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Filtrer
          </Button>
          {(filterMois || filterType || filterAnimalId) && (
            <Link href="/sanitaire/actes">
              <Button type="button" variant="secondary" size="sm" className="h-9">
                Reset
              </Button>
            </Link>
          )}
        </form>
      )}

      {actesError ? (
        <div className="rounded-md border border-[var(--sf-danger-border,#7A2A1F)] bg-[var(--sf-danger-bg,#FBE9E7)] p-4 text-sm text-[var(--sf-danger-ink,#7A2A1F)]">
          {actesError}
        </div>
      ) : actes.length === 0 ? (
        <EmptyState
          icon={Syringe}
          title="Aucun acte enregistré"
          description="Enregistrez un traitement véto (vitamine, antibiotique, vaccin…) pour démarrer le carnet sanitaire MIRAH."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--sf-line,rgba(0,0,0,0.12))]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--sf-surface-1,rgba(0,0,0,0.03))] text-left">
              <tr className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xs">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Cible</th>
                <th className="px-3 py-2">Produit</th>
                <th className="px-3 py-2">Dose / Voie</th>
                <th className="px-3 py-2">Durée</th>
                <th className="px-3 py-2">Fin délai attente</th>
              </tr>
            </thead>
            <tbody>
              {actes.map((a) => {
                const cible = a.animal
                  ? a.animal.nom
                    ? `${a.animal.tag} — ${a.animal.nom}`
                    : a.animal.tag ?? '—'
                  : a.bande
                    ? a.bande.nom
                      ? `${a.bande.code ?? '—'} · ${a.bande.nom}`
                      : a.bande.code ?? '—'
                    : '—'
                return (
                  <tr
                    key={a.id}
                    className="border-t border-[var(--sf-line,rgba(0,0,0,0.08))]"
                  >
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      <FormattedDateTime date={a.date_administration} />
                    </td>
                    <td className="px-3 py-2">{cible}</td>
                    <td className="px-3 py-2">
                      {a.produit?.nom ?? <span className="text-[var(--sf-muted)]">—</span>}
                      {a.produit?.type && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {a.produit.type}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.dose} {a.unite_dose} · {a.voie}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{a.duree_jours} j</td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.date_fin_delai_attente ? (
                        <FormattedDateTime date={a.date_fin_delai_attente} />
                      ) : (
                        <span className="text-[var(--sf-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (() => {
        const baseQs = new URLSearchParams()
        if (filterMois) baseQs.set('mois', filterMois)
        if (filterType) baseQs.set('type', filterType)
        if (filterAnimalId) baseQs.set('animal_id', filterAnimalId)
        const linkFor = (p: number) => {
          const qs = new URLSearchParams(baseQs)
          qs.set('page', String(p))
          return `/sanitaire/actes?${qs.toString()}`
        }
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--sf-muted)]">
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={linkFor(page - 1)}>
                  <Button variant="secondary" size="sm">
                    Précédent
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={linkFor(page + 1)}>
                  <Button variant="secondary" size="sm">
                    Suivant
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
