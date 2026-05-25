import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Wheat, Plus, ChevronLeft, RotateCcw, Search, AlertTriangle } from 'lucide-react'

import { DialogMatiere, type MatiereRow } from './_dialog-matiere'
import {
  reinitialiserMatieresStandards,
  supprimerMatiere,
} from './_actions'
import {
  CATEGORIES_NUTRITIONNELLES,
  LABEL_CATEGORIE,
  LABEL_ORIGINE,
  type CategorieNutritionnelle,
} from '@/lib/nutrition-data'

/* -------------------------------------------------------------------------- */
/*  Formulaires actions serveur                                               */
/* -------------------------------------------------------------------------- */

function FormResetStandards() {
  async function action() {
    'use server'
    await reinitialiserMatieresStandards()
  }
  return (
    <form action={action}>
      <Button type="submit" variant="outline" size="sm">
        <RotateCcw className="h-4 w-4 mr-1" />
        Réinitialiser au catalogue standard
      </Button>
    </form>
  )
}

function FormDelete({ id }: { id: string }) {
  async function action() {
    'use server'
    await supprimerMatiere(id)
  }
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-[var(--sf-danger-ink,#7A2A1F)]"
      >
        Supprimer
      </Button>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Filtres (server, via searchParams)                                        */
/* -------------------------------------------------------------------------- */

function FiltresMatieres({
  q,
  cat,
}: {
  q: string
  cat: string
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3"
      role="search"
    >
      <div className="flex-1 min-w-[220px]">
        <label
          htmlFor="q"
          className="eyebrow text-[11px] block mb-1"
        >
          Recherche
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sf-muted,#5C5346)]" />
          <input
            id="q"
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Maïs, tourteau, IVOGRAIN…"
            className="h-9 w-full rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] pl-8 pr-3 text-sm outline-none focus:border-[var(--sf-primary)]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cat" className="eyebrow text-[11px] block mb-1">
          Catégorie
        </label>
        <select
          id="cat"
          name="cat"
          defaultValue={cat}
          className="h-9 rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] px-2 text-sm"
        >
          <option value="">Toutes</option>
          {CATEGORIES_NUTRITIONNELLES.map((c) => (
            <option key={c} value={c}>
              {LABEL_CATEGORIE[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Filtrer
        </Button>
        <Link
          href="/alimentation/matieres"
          className="inline-flex items-center justify-center rounded-md border border-[var(--sf-border,#E5DDD0)] px-3 text-sm h-9 hover:bg-[var(--sf-bg,#F5F1E8)]"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers d'affichage                                                       */
/* -------------------------------------------------------------------------- */

function n(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—'
  return Number(v).toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function nint(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—'
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

type SP = { q?: string; cat?: string }

export default async function MatieresPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const cat = (sp.cat ?? '').trim()

  const sb = await createClient()
  let query = sb
    .from('matieres_premieres')
    .select(
      'id, nom, type, unite, categorie_nutritionnelle, origine, fournisseur, mat_pct, em_porc_kcal_kg, lysine_pct, methionine_pct, calcium_pct, phosphore_pct, fibre_pct, matiere_seche_pct, prix_indicatif_xof_kg, cout_moyen_unite, stock_actuel, seuil_alerte, notes_terrain, observations',
    )
    .neq('categorie_nutritionnelle', 'concentré_commercial')
    .order('categorie_nutritionnelle', { ascending: true, nullsFirst: false })
    .order('nom', { ascending: true })

  if (q) {
    query = query.or(`nom.ilike.%${q}%,fournisseur.ilike.%${q}%`)
  }
  if (cat) {
    query = query.eq('categorie_nutritionnelle', cat)
  }

  const { data, error } = await query
  const rows = (data ?? []) as MatiereRow[]

  const total = rows.length
  const totalLocal = rows.filter((r) => r.origine === 'locale_ci').length
  const totalImporte = rows.filter((r) => r.origine === 'importee').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/alimentation"
            className="text-xs uppercase tracking-[0.08em] text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary)] inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Retour à l&apos;alimentation
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)] mt-1">
            <Wheat className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Matières premières
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Référentiel nutritionnel des ingrédients de formulation
            (céréales, tourteaux, minéraux, additifs).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FormResetStandards />
          <DialogMatiere
            mode="create"
            trigger={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle matière
              </Button>
            }
          />
        </div>
      </div>

      {/* KPI ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          style={{
            background: 'var(--sf-success-bg, #D6E3CC)',
            color: 'var(--sf-success-ink, #1F3B12)',
          }}
        >
          <CardContent className="p-5">
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-success-ink, #1F3B12)' }}
            >
              {total}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-success-ink, #1F3B12)' }}
            >
              Matières au catalogue
            </div>
          </CardContent>
        </Card>
        <Card
          style={{
            background: 'var(--sf-warning-bg, #F5E0B8)',
            color: 'var(--sf-warning-ink, #5A3E0E)',
          }}
        >
          <CardContent className="p-5">
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              {totalLocal}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              Origine locale CI
            </div>
          </CardContent>
        </Card>
        <Card
          style={{
            background: 'var(--sf-bg, #F5F1E8)',
            color: 'var(--sf-ink, #1a1a1a)',
          }}
        >
          <CardContent className="p-5">
            <div className="text-3xl font-bold tabular-nums">{totalImporte}</div>
            <div className="eyebrow text-[11px] mt-1 text-[var(--sf-muted,#5C5346)]">
              Importées
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTRES ----------------------------------------------------------- */}
      <Card>
        <CardContent className="p-4">
          <FiltresMatieres q={q} cat={cat} />
        </CardContent>
      </Card>

      {/* TABLE ------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liste des matières</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="p-8 text-center space-y-3 border border-dashed border-[var(--sf-border,#E5DDD0)] rounded-md mx-4 my-4"
            >
              <AlertTriangle
                className="h-8 w-8 mx-auto text-[var(--sf-warning-ink,#5A3E0E)]"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-[var(--sf-ink,#1a1a1a)]">
                Matières premières : chargement impossible
              </p>
              <p className="text-xs text-[var(--sf-muted,#5C5346)] max-w-md mx-auto">
                Le module est temporairement indisponible. Contactez votre administrateur
                si le problème persiste.
              </p>
              {process.env.NODE_ENV !== 'production' ? (
                <pre className="text-[10px] text-[var(--sf-muted,#5C5346)] bg-[var(--sf-surface-1,rgba(0,0,0,0.02))] p-2 rounded mt-2 overflow-x-auto text-left">
                  {error.message}
                </pre>
              ) : null}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-[var(--sf-muted,#5C5346)]">
                Aucune matière ne correspond à ces filtres.
              </p>
              <FormResetStandards />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead className="text-right">MAT %</TableHead>
                  <TableHead className="text-right">EM kcal/kg</TableHead>
                  <TableHead className="text-right">Lys SID %</TableHead>
                  <TableHead className="text-right">Met SID %</TableHead>
                  <TableHead className="text-right">Ca %</TableHead>
                  <TableHead className="text-right">P %</TableHead>
                  <TableHead className="text-right">Prix XOF/kg</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => {
                  const cat = m.categorie_nutritionnelle as
                    | CategorieNutritionnelle
                    | null
                  const sousAlerte =
                    m.seuil_alerte != null &&
                    m.stock_actuel != null &&
                    Number(m.stock_actuel) < Number(m.seuil_alerte)
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.nom}</div>
                        {m.fournisseur ? (
                          <div className="text-xs text-[var(--sf-muted,#5C5346)]">
                            {m.fournisseur}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {cat ? (
                          <Badge variant="outline" className="text-xs">
                            {LABEL_CATEGORIE[cat]}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.origine ? LABEL_ORIGINE[m.origine] : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(m.mat_pct)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {nint(m.em_porc_kcal_kg)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(m.lysine_pct, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(m.methionine_pct, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(m.calcium_pct, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(m.phosphore_pct, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {nint(m.prix_indicatif_xof_kg)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            sousAlerte
                              ? 'text-[var(--sf-danger-ink,#7A2A1F)] font-semibold'
                              : ''
                          }
                        >
                          {nint(m.stock_actuel)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <DialogMatiere
                            mode="edit"
                            initial={m}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Modifier
                              </Button>
                            }
                          />
                          <FormDelete id={m.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
