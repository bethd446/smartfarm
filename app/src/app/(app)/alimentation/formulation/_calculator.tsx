'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Sparkles, Save } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  BESOINS_NUTRITIONNELS,
  PRESETS_FORMULES,
  compareWithRequirements,
  computeMixNutrition,
  type Ingredient,
  type StadePorc,
} from '@/lib/nutrition-engine'
import { STADES_PORC, LABEL_STADE } from './_schemas'
import { creerFormulation } from './_actions'

/* -------------------------------------------------------------------------- */
/*  Types props                                                               */
/* -------------------------------------------------------------------------- */

export type MatierePremiereCatalog = {
  id: string
  nom: string
  categorie_nutritionnelle?: string | null
  mat_pct?: number | null
  em_porc_kcal_kg?: number | null
  lysine_pct?: number | null
  methionine_pct?: number | null
  calcium_pct?: number | null
  phosphore_pct?: number | null
  fibre_pct?: number | null
  prix_indicatif_xof_kg?: number | null
  cout_moyen_unite?: number | null
}

type Props = {
  catalog: MatierePremiereCatalog[]
}

type LigneMix = Ingredient & { key: string }

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fromCatalog(m: MatierePremiereCatalog, pct = 0): LigneMix {
  return {
    key: m.id + '_' + Math.random().toString(36).slice(2, 7),
    id: m.id,
    nom: m.nom,
    pourcentage: pct,
    mat_pct: m.mat_pct ?? null,
    em_porc_kcal_kg: m.em_porc_kcal_kg ?? null,
    lysine_pct: m.lysine_pct ?? null,
    methionine_pct: m.methionine_pct ?? null,
    calcium_pct: m.calcium_pct ?? null,
    phosphore_pct: m.phosphore_pct ?? null,
    fibre_pct: m.fibre_pct ?? null,
    prix_xof_kg: m.prix_indicatif_xof_kg ?? m.cout_moyen_unite ?? null,
  }
}

function findInCatalog(catalog: MatierePremiereCatalog[], token: string) {
  const t = token.toLowerCase()
  return catalog.find((m) => m.nom.toLowerCase().includes(t))
}

function fmt(x: number, digits = 2) {
  return Number.isFinite(x) ? x.toFixed(digits) : '—'
}

function statutColor(statut: 'ok' | 'sous' | 'sur'): string {
  if (statut === 'sous')
    return 'bg-[var(--sf-danger,#FCE9E4)] text-[var(--sf-danger-ink,#7A2A1F)]'
  if (statut === 'sur')
    return 'bg-[var(--sf-warning,#FFF3D6)] text-[var(--sf-warning-ink,#7A5A1F)]'
  return 'bg-[var(--sf-success,#E1F2DA)] text-[var(--sf-success-ink,#2F5D2B)]'
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export function FormulationCalculator({ catalog }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [nom, setNom] = useState<string>('')
  const [stade, setStade] = useState<StadePorc>('croissance')
  const [lignes, setLignes] = useState<LigneMix[]>([])
  const [picker, setPicker] = useState<string>('')

  /* ----- Calculs live ----- */
  const mix = useMemo(() => computeMixNutrition(lignes), [lignes])
  const conformite = useMemo(
    () => compareWithRequirements(mix, stade),
    [mix, stade],
  )
  const besoins = BESOINS_NUTRITIONNELS[stade]

  const totalEq100 = Math.abs(mix.totalPct - 100) < 0.01
  const canSubmit = nom.trim().length >= 2 && lignes.length > 0 && totalEq100

  /* ----- Actions sur lignes ----- */

  function ajouterIngredient(mpId: string) {
    if (!mpId) return
    const m = catalog.find((x) => x.id === mpId)
    if (!m) return
    setLignes((prev) => [...prev, fromCatalog(m, 0)])
    setPicker('')
  }

  function modifierPct(key: string, valeur: number) {
    setLignes((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, pourcentage: Number.isFinite(valeur) ? valeur : 0 } : l,
      ),
    )
  }

  function supprimerLigne(key: string) {
    setLignes((prev) => prev.filter((l) => l.key !== key))
  }

  function appliquerPreset(presetKey: string) {
    const preset = PRESETS_FORMULES.find((p) => p.key === presetKey)
    if (!preset) return
    const next: LigneMix[] = []
    const manquants: string[] = []
    for (const ing of preset.ingredients) {
      const m = findInCatalog(catalog, ing.match)
      if (m) {
        next.push(fromCatalog(m, ing.pct))
      } else {
        manquants.push(ing.match)
      }
    }
    setLignes(next)
    setStade(preset.stade)
    if (!nom) setNom(preset.label)
    if (manquants.length > 0) {
      toast.warning(
        `Préréglage appliqué partiel — manquant dans le catalogue : ${manquants.join(', ')}`,
      )
    } else {
      toast.success('Préréglage appliqué')
    }
  }

  function normaliserA100() {
    const total = lignes.reduce((s, l) => s + Number(l.pourcentage || 0), 0)
    if (total <= 0) return
    setLignes((prev) =>
      prev.map((l) => ({
        ...l,
        pourcentage:
          Math.round((Number(l.pourcentage || 0) / total) * 100 * 100) / 100,
      })),
    )
  }

  /* ----- Submit ----- */

  function onSubmit() {
    if (!canSubmit) {
      toast.error('Vérifie le nom, les ingrédients et que le total = 100 %')
      return
    }
    startTransition(async () => {
      const res = await creerFormulation({
        nom: nom.trim(),
        stade_cible: stade,
        cout_kg: mix.cout_kg_xof,
        ingredients: lignes.map((l) => ({
          matiere_premiere_id: l.id,
          pourcentage: l.pourcentage,
        })),
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Formulation enregistrée')
      router.push('/alimentation/formulation')
      router.refresh()
    })
  }

  /* ----- Render ----- */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLONNE GAUCHE = composer */}
      <div className="lg:col-span-2 space-y-4">
        {/* Préréglages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--sf-accent-warm,#A16207)]" />
              Préréglages « formules type »
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {PRESETS_FORMULES.map((p) => (
              <Button
                key={p.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appliquerPreset(p.key)}
                title={p.description}
              >
                {p.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Identité formule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identité de la formule</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex : Croissance maïs-soja v2026"
              />
            </div>
            <div>
              <Label htmlFor="stade">Stade cible</Label>
              <Select value={stade} onValueChange={(v) => setStade(v as StadePorc)}>
                <SelectTrigger id="stade">
                  <SelectValue placeholder="Choisir un stade" />
                </SelectTrigger>
                <SelectContent>
                  {STADES_PORC.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LABEL_STADE[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ingrédients */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ingrédients</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={picker} onValueChange={ajouterIngredient}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Ajouter une matière première…" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      Catalogue vide
                    </SelectItem>
                  ) : (
                    catalog.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nom}
                        {m.categorie_nutritionnelle
                          ? ` · ${m.categorie_nutritionnelle}`
                          : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={normaliserA100}
                disabled={lignes.length === 0}
              >
                Normaliser à 100 %
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lignes.length === 0 ? (
              <div className="text-sm text-[var(--sf-muted,#5C5346)] py-6 text-center">
                Aucun ingrédient — ajoute depuis le catalogue ou applique un préréglage.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead className="text-right">MAT%</TableHead>
                    <TableHead className="text-right">EM kcal</TableHead>
                    <TableHead className="text-right">Prix XOF/kg</TableHead>
                    <TableHead className="w-[130px]">% mix</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.map((l) => (
                    <TableRow key={l.key}>
                      <TableCell className="font-medium">{l.nom}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {l.mat_pct ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {l.em_porc_kcal_kg ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {l.prix_xof_kg ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          value={l.pourcentage}
                          onChange={(e) =>
                            modifierPct(l.key, parseFloat(e.target.value))
                          }
                          className="h-8 w-24 font-mono text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => supprimerLigne(l.key)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold text-right">
                      Total
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      <span
                        className={
                          totalEq100
                            ? 'text-[var(--sf-success-ink,#2F5D2B)]'
                            : 'text-[var(--sf-danger-ink,#7A2A1F)]'
                        }
                      >
                        {fmt(mix.totalPct, 2)} %
                      </span>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Action submit */}
        <div className="flex items-center justify-end gap-3">
          {!totalEq100 && lignes.length > 0 ? (
            <span className="text-xs text-[var(--sf-danger-ink,#7A2A1F)]">
              Le total des ingrédients doit faire exactement 100 % (actuel :{' '}
              {fmt(mix.totalPct, 2)} %)
            </span>
          ) : null}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || pending}
            className="bg-[var(--sf-accent-warm,#A16207)] hover:opacity-90"
          >
            <Save className="h-4 w-4 mr-2" />
            {pending ? 'Enregistrement…' : 'Enregistrer la formulation'}
          </Button>
        </div>
      </div>

      {/* COLONNE DROITE = besoins + récap nutritionnel */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Besoins — {LABEL_STADE[stade]}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="text-[11px] text-[var(--sf-muted,#5C5346)] mb-2">
              Source : NRC 2012 + INRA 2018 (minima)
            </div>
            <div className="flex justify-between">
              <span>MAT min</span>
              <span className="font-mono">{besoins.mat_min_pct} %</span>
            </div>
            <div className="flex justify-between">
              <span>EM min</span>
              <span className="font-mono">{besoins.em_min_kcal_kg} kcal/kg</span>
            </div>
            <div className="flex justify-between">
              <span>Lysine min</span>
              <span className="font-mono">{besoins.lysine_min_pct} %</span>
            </div>
            <div className="flex justify-between">
              <span>Méthionine min</span>
              <span className="font-mono">{besoins.methionine_min_pct} %</span>
            </div>
            <div className="flex justify-between">
              <span>Calcium min</span>
              <span className="font-mono">{besoins.calcium_min_pct} %</span>
            </div>
            <div className="flex justify-between">
              <span>Phosphore min</span>
              <span className="font-mono">{besoins.phosphore_min_pct} %</span>
            </div>
            <div className="flex justify-between">
              <span>Fibre max</span>
              <span className="font-mono">{besoins.fibre_max_pct} %</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Récap nutritionnel</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {conformite.ecarts.map((e) => (
              <div key={e.nutrient} className="flex items-center justify-between gap-2">
                <span className="flex-1">{e.nutrient}</span>
                <span className="font-mono">
                  {e.nutrient === 'Énergie EM'
                    ? Math.round(e.valeur)
                    : fmt(e.valeur, 2)}
                </span>
                <Badge
                  variant="outline"
                  className={`${statutColor(e.statut)} border-0 text-[10px]`}
                >
                  {e.statut === 'ok'
                    ? '✓ OK'
                    : e.statut === 'sous'
                    ? `↓ ${fmt(e.ecart_pct, 1)} %`
                    : `↑ ${fmt(e.ecart_pct, 1)} %`}
                </Badge>
              </div>
            ))}

            <div className="border-t mt-3 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Ratio Ca/P</span>
                <span className="font-mono">
                  {mix.phosphore_pct > 0
                    ? fmt(mix.calcium_pct / mix.phosphore_pct, 2)
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fibre</span>
                <span className="font-mono">{fmt(mix.fibre_pct, 2)} %</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1">
                <span>Coût</span>
                <span className="font-mono">
                  {Math.round(mix.cout_kg_xof)} FCFA/kg
                </span>
              </div>
            </div>

            {conformite.ok ? (
              <Badge className="w-full justify-center mt-2 bg-[var(--sf-success,#E1F2DA)] text-[var(--sf-success-ink,#2F5D2B)]">
                Conforme aux besoins du stade
              </Badge>
            ) : (
              <Badge className="w-full justify-center mt-2 bg-[var(--sf-danger,#FCE9E4)] text-[var(--sf-danger-ink,#7A2A1F)]">
                Carence détectée
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
