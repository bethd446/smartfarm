import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Package,
  ChevronLeft,
  RotateCcw,
  Factory,
  AlertTriangle,
} from 'lucide-react'

import { DialogMatiere, type MatiereRow } from '../matieres/_dialog-matiere'
import {
  reinitialiserMatieresStandards,
  ajouterStockMatiere,
} from '../matieres/_actions'
import { FOURNISSEURS_CONCENTRES } from '@/lib/nutrition-data'

/* -------------------------------------------------------------------------- */
/*  Heuristique d'inférence du stade visé à partir du nom commercial          */
/* -------------------------------------------------------------------------- */

const STADES_FILTRE = [
  { value: 'porcelet', label: 'Porcelet' },
  { value: 'croissance', label: 'Croissance' },
  { value: 'finition', label: 'Finition' },
  { value: 'truie', label: 'Truie' },
  { value: 'verrat', label: 'Verrat' },
] as const
type StadeFiltre = (typeof STADES_FILTRE)[number]['value']

function inferStade(nom: string): StadeFiltre | null {
  const n = nom.toLowerCase()
  if (/(porcelet|piglet|pre.?starter|starter|1er.?âge|premier.?age)/.test(n))
    return 'porcelet'
  if (/(croissance|grower|growing)/.test(n)) return 'croissance'
  if (/(finition|finisher|finishing)/.test(n)) return 'finition'
  if (/(truie|sow|gestante|allaitante|lactating)/.test(n)) return 'truie'
  if (/(verrat|boar)/.test(n)) return 'verrat'
  return null
}

const LABEL_STADE_FILTRE: Record<StadeFiltre, string> = {
  porcelet: 'Porcelet',
  croissance: 'Croissance',
  finition: 'Finition',
  truie: 'Truie',
  verrat: 'Verrat',
}

const STADE_TAG: Record<StadeFiltre, string> = {
  porcelet: 'tag t-apri',
  croissance: 'tag t-sage',
  finition: 'tag t-grey',
  truie: 'tag t-plum',
  verrat: 'tag t-grey',
}

/* -------------------------------------------------------------------------- */
/*  Server actions wrappers                                                   */
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

function FormAjouterStock({ id }: { id: string }) {
  async function action(formData: FormData) {
    'use server'
    const qty = Number(formData.get('qty'))
    if (Number.isFinite(qty) && qty > 0) {
      await ajouterStockMatiere(id, qty)
    }
  }
  return (
    <form action={action} className="flex items-center gap-1">
      <Input
        name="qty"
        type="number"
        min={1}
        step={1}
        defaultValue={50}
        className="h-8 w-20 text-sm"
        aria-label="Quantité à ajouter en stock"
      />
      <Button type="submit" size="sm" variant="outline">
        + Stock
      </Button>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
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

type SP = { fournisseur?: string; stade?: string }

export default async function ConcentresPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = (await searchParams) ?? {}
  const fournisseur = (sp.fournisseur ?? '').trim()
  const stade = (sp.stade ?? '').trim() as StadeFiltre | ''

  const sb = await createClient()
  let query = sb
    .from('matieres_premieres')
    .select(
      'id, nom, type, unite, categorie_nutritionnelle, origine, fournisseur, mat_pct, em_porc_kcal_kg, lysine_pct, methionine_pct, calcium_pct, phosphore_pct, fibre_pct, matiere_seche_pct, prix_indicatif_xof_kg, cout_moyen_unite, stock_actuel, seuil_alerte, notes_terrain, observations',
    )
    .eq('categorie_nutritionnelle', 'concentré_commercial')
    .order('fournisseur', { ascending: true, nullsFirst: false })
    .order('nom', { ascending: true })

  if (fournisseur) {
    query = query.eq('fournisseur', fournisseur)
  }

  const { data, error } = await query
  let rows = (data ?? []) as MatiereRow[]

  if (stade) {
    rows = rows.filter((r) => inferStade(r.nom) === stade)
  }

  const fournisseursPresents = Array.from(
    new Set([
      ...FOURNISSEURS_CONCENTRES,
      ...rows.map((r) => r.fournisseur).filter(Boolean),
    ]),
  ) as string[]

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
            <Factory className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Concentrés industriels
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Aliments complets commercialisés en Côte d&apos;Ivoire
            (IVOGRAIN, De Heus, Koudijs, Vitalac…).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FormResetStandards />
          <DialogMatiere
            mode="create"
            initial={
              {
                id: '',
                nom: '',
                type: 'aliment_fini',
                unite: 'kg',
                categorie_nutritionnelle: 'concentré_commercial',
                origine: 'industrielle',
                fournisseur: null,
                mat_pct: null,
                em_porc_kcal_kg: null,
                lysine_pct: null,
                methionine_pct: null,
                calcium_pct: null,
                phosphore_pct: null,
                fibre_pct: null,
                matiere_seche_pct: 88,
                prix_indicatif_xof_kg: null,
                cout_moyen_unite: null,
                stock_actuel: 0,
                seuil_alerte: null,
                notes_terrain: null,
                observations: null,
              } as MatiereRow
            }
            createLabel="Nouveau concentré"
          />
        </div>
      </div>

      {/* Filtres ----------------------------------------------------------- */}
      <Card>
        <CardContent className="p-4">
          <form
            method="get"
            className="flex flex-wrap items-end gap-3"
            role="search"
          >
            <div>
              <label
                htmlFor="fournisseur"
                className="eyebrow text-[11px] block mb-1"
              >
                Fournisseur
              </label>
              <select
                id="fournisseur"
                name="fournisseur"
                defaultValue={fournisseur}
                className="h-9 rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] px-2 text-sm"
              >
                <option value="">Tous</option>
                {fournisseursPresents.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="stade"
                className="eyebrow text-[11px] block mb-1"
              >
                Stade
              </label>
              <select
                id="stade"
                name="stade"
                defaultValue={stade}
                className="h-9 rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] px-2 text-sm"
              >
                <option value="">Tous</option>
                {STADES_FILTRE.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Filtrer
              </Button>
              <Link
                href="/alimentation/concentres"
                className="inline-flex items-center justify-center rounded-md border border-[var(--sf-border,#E5DDD0)] px-3 text-sm h-9 hover:bg-[var(--sf-bg,#F5F1E8)]"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cards concentrés -------------------------------------------------- */}
      {error ? (
        <Card>
          <CardContent
            role="alert"
            aria-live="polite"
            className="p-8 text-center space-y-3"
          >
            <AlertTriangle
              className="h-8 w-8 mx-auto text-[var(--sf-warning-ink,#5A3E0E)]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--sf-ink,#1a1a1a)]">
              Concentrés industriels : chargement impossible
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
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <div className="sf-empty" role="status">
          <span className="sf-empty-ic">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3>Aucun concentré au catalogue</h3>
          <p>
            Aucun concentré ne correspond à ces filtres. Réinitialisez au
            catalogue standard pour retrouver les aliments commercialisés en CI.
          </p>
          <FormResetStandards />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => {
            const stadeC = inferStade(c.nom)
            return (
              <Card key={c.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="eyebrow text-[11px] text-[var(--sf-muted,#5C5346)]">
                        {c.fournisseur ?? 'Sans marque'}
                      </div>
                      <CardTitle className="text-base leading-snug mt-1">
                        {c.nom}
                      </CardTitle>
                    </div>
                    {stadeC ? (
                      <span className={STADE_TAG[stadeC]}>
                        {LABEL_STADE_FILTRE[stadeC]}
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="text-[var(--sf-muted,#5C5346)]">MAT</div>
                    <div className="text-right tabular-nums font-medium">
                      {n(c.mat_pct)} %
                    </div>
                    <div className="text-[var(--sf-muted,#5C5346)]">EM</div>
                    <div className="text-right tabular-nums font-medium">
                      {nint(c.em_porc_kcal_kg)} kcal
                    </div>
                    <div className="text-[var(--sf-muted,#5C5346)]">Lysine</div>
                    <div className="text-right tabular-nums">
                      {n(c.lysine_pct, 2)} %
                    </div>
                    <div className="text-[var(--sf-muted,#5C5346)]">
                      Méthionine
                    </div>
                    <div className="text-right tabular-nums">
                      {n(c.methionine_pct, 2)} %
                    </div>
                    <div className="text-[var(--sf-muted,#5C5346)]">Ca / P</div>
                    <div className="text-right tabular-nums">
                      {n(c.calcium_pct, 2)} / {n(c.phosphore_pct, 2)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--sf-border,#E5DDD0)] pt-2">
                    <div>
                      <div className="eyebrow text-[10px] text-[var(--sf-muted,#5C5346)]">
                        Prix
                      </div>
                      <div className="text-base font-semibold tabular-nums">
                        {nint(c.prix_indicatif_xof_kg)}
                        <span className="text-xs font-normal text-[var(--sf-muted,#5C5346)] ml-1">
                          FCFA/kg
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="eyebrow text-[10px] text-[var(--sf-muted,#5C5346)]">
                        Stock
                      </div>
                      <div className="text-base font-semibold tabular-nums">
                        {nint(c.stock_actuel)} kg
                      </div>
                    </div>
                  </div>

                  {c.notes_terrain ? (
                    <p className="text-xs text-[var(--sf-muted,#5C5346)] italic line-clamp-2">
                      {c.notes_terrain}
                    </p>
                  ) : null}
                </CardContent>
                <div className="px-6 pb-4 flex items-center justify-between gap-2">
                  <FormAjouterStock id={c.id} />
                  <DialogMatiere
                    mode="edit"
                    initial={c}
                    editLabel="Détails"
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
