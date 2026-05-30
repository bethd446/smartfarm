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
import { Plus, ChevronLeft, Beaker, Trash2 } from 'lucide-react'

import {
  computeMixNutrition,
  compareWithRequirements,
  BESOINS_NUTRITIONNELS,
  type Ingredient,
  type StadePorc,
} from '@/lib/nutrition-engine'
import { LABEL_STADE, STADES_PORC } from './_schemas'
import { supprimerFormulation } from './_actions'
import { FormattedDateTime } from '@/components/ui/formatted-date'

export const dynamic = 'force-dynamic'

/* -------------------------------------------------------------------------- */
/*  Types tolérants (colonnes nutritionnelles encore optionnelles)            */
/* -------------------------------------------------------------------------- */

type IngredientRow = {
  matiere_premiere_id: string
  pourcentage: number
  matiere: {
    id: string
    nom: string
    mat_pct?: number | null
    em_porc_kcal_kg?: number | null
    lysine_pct?: number | null
    methionine_pct?: number | null
    calcium_pct?: number | null
    phosphore_pct?: number | null
    fibre_pct?: number | null
    prix_indicatif_xof_kg?: number | null
    cout_moyen_unite?: number | null
  } | null
}

type FormulationRow = {
  id: string
  nom: string
  date_creation: string | null
  cout_kg: number | null
  actif: boolean | null
  stade_cible?: string | null
  ingredients?: IngredientRow[] | null
}

function isStade(v: unknown): v is StadePorc {
  return typeof v === 'string' && (STADES_PORC as readonly string[]).includes(v)
}

/* -------------------------------------------------------------------------- */
/*  Bouton suppression (form server action)                                    */
/* -------------------------------------------------------------------------- */

function FormSupprimer({ id }: { id: string }) {
  async function action() {
    'use server'
    await supprimerFormulation(id)
  }
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-[var(--sf-danger-ink,#7A2A1F)]"
        aria-label="Supprimer la formulation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function FormulationListPage() {
  const sb = await createClient()

  // 1. Récup des formulations + ingrédients + matières (avec colonnes nutri si dispo)
  const { data: rawFormulations, error } = await sb
    .from('formulations')
    .select(
      `
      id,
      nom,
      date_creation,
      cout_kg,
      actif,
      stade_cible,
      ingredients:formulation_ingredients (
        matiere_premiere_id,
        pourcentage,
        matiere:matiere_premiere_id (*)
      )
    `,
    )
    .order('date_creation', { ascending: false })
    .limit(100)

  // Fallback si la colonne stade_cible n'existe pas encore (avant C6-A)
  let formulations: FormulationRow[] = (rawFormulations as unknown as FormulationRow[]) ?? []
  if (error && /stade_cible/i.test(error.message)) {
    const retry = await sb
      .from('formulations')
      .select(
        `
        id,
        nom,
        date_creation,
        cout_kg,
        actif,
        ingredients:formulation_ingredients (
          matiere_premiere_id,
          pourcentage,
          matiere:matiere_premiere_id (*)
        )
      `,
      )
      .order('date_creation', { ascending: false })
      .limit(100)
    formulations = (retry.data as unknown as FormulationRow[]) ?? []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/alimentation"
            className="text-xs text-[var(--mut)] inline-flex items-center gap-1 mb-1 hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Alimentation
          </Link>
          <h1 className="text-3xl font-[family-name:var(--disp)] font-extrabold tracking-[-0.02em] flex items-center gap-2 text-[var(--ink)]">
            <Beaker className="h-7 w-7 text-[var(--sage-d)]" />
            Formulations
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">
            Catalogue des recettes calculées · besoins NRC 2012 / INRA 2018
          </p>
        </div>
        <Link href="/alimentation/formulation/nouveau">
          <Button size="lg" className="h-12 text-base">
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle formulation
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Formulations enregistrées
            <span className="ml-2 text-xs font-normal text-[var(--mut)]">
              {formulations.length} résultat{formulations.length > 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formulations.length === 0 ? (
            <div className="text-sm text-[var(--mut)] py-8 text-center">
              Aucune formulation — démarre avec{' '}
              <Link
                href="/alimentation/formulation/nouveau"
                className="font-medium text-[var(--sage-d)] hover:underline"
              >
                le calculateur
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Stade cible</TableHead>
                  <TableHead className="text-right">MAT %</TableHead>
                  <TableHead className="text-right">EM kcal/kg</TableHead>
                  <TableHead className="text-right">Lysine %</TableHead>
                  <TableHead className="text-right">Coût FCFA/kg</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulations.map((f) => {
                  // Recalcule live à partir des ingrédients liés (source de vérité)
                  const ings: Ingredient[] = (f.ingredients ?? []).map((i) => ({
                    id: i.matiere?.id ?? i.matiere_premiere_id,
                    nom: i.matiere?.nom ?? '?',
                    pourcentage: Number(i.pourcentage),
                    mat_pct: i.matiere?.mat_pct ?? null,
                    em_porc_kcal_kg: i.matiere?.em_porc_kcal_kg ?? null,
                    lysine_pct: i.matiere?.lysine_pct ?? null,
                    methionine_pct: i.matiere?.methionine_pct ?? null,
                    calcium_pct: i.matiere?.calcium_pct ?? null,
                    phosphore_pct: i.matiere?.phosphore_pct ?? null,
                    fibre_pct: i.matiere?.fibre_pct ?? null,
                    prix_xof_kg:
                      i.matiere?.prix_indicatif_xof_kg ??
                      i.matiere?.cout_moyen_unite ??
                      null,
                  }))
                  const mix = computeMixNutrition(ings)
                  const stade = isStade(f.stade_cible) ? f.stade_cible : null
                  const conf = stade
                    ? compareWithRequirements(mix, stade)
                    : null

                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nom}</TableCell>
                      <TableCell className="text-xs">
                        {stade ? LABEL_STADE[stade] : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {mix.mat_pct || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {mix.em_kcal_kg || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {mix.lysine_pct || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {f.cout_kg
                          ? Math.round(Number(f.cout_kg))
                          : mix.cout_kg_xof
                          ? Math.round(mix.cout_kg_xof)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {conf ? (
                          <Badge
                            variant="outline"
                            className={
                              conf.ok
                                ? 'bg-[var(--sf-success,#E1F2DA)] text-[var(--sf-success-ink,#2F5D2B)] border-0'
                                : 'bg-[var(--sf-danger,#FCE9E4)] text-[var(--sf-danger-ink,#7A2A1F)] border-0'
                            }
                          >
                            {conf.ok ? 'Conforme' : 'Carence'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                        {f.actif === false ? (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            inactif
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {f.date_creation
                          ? <FormattedDateTime date={f.date_creation} format="date" />
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <FormSupprimer id={f.id} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sidebar pédagogique : rappel des besoins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Besoins de référence (NRC 2012 / INRA 2018)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stade</TableHead>
                <TableHead className="text-right">MAT</TableHead>
                <TableHead className="text-right">EM</TableHead>
                <TableHead className="text-right">Lys</TableHead>
                <TableHead className="text-right">Met</TableHead>
                <TableHead className="text-right">Ca</TableHead>
                <TableHead className="text-right">P</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STADES_PORC.map((s) => {
                const b = BESOINS_NUTRITIONNELS[s]
                return (
                  <TableRow key={s}>
                    <TableCell className="text-xs">{LABEL_STADE[s]}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.mat_min_pct} %
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.em_min_kcal_kg}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.lysine_min_pct} %
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.methionine_min_pct} %
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.calcium_min_pct} %
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.phosphore_min_pct} %
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
