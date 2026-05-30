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
import {
  Calendar,
  Plus,
  ChevronLeft,
  TrendingDown,
  AlertTriangle,
  Wheat,
} from 'lucide-react'
import { EmptyOnboarding } from '@/components/ui/empty-onboarding'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { DialogPlan, type PlanRow } from './_dialog-plan'
import { supprimerPlan } from './_actions'
import { calculerStatutPlan, type StatutPlan } from './_schemas'

/* -------------------------------------------------------------------------- */
/*  FIX S5 LANE4 (2026-05-25)                                                  */
/*  Bug : page exposait stack trace PostgREST                                  */
/*        "Could not find a relationship between 'plans_alimentation' and     */
/*        'type_aliment_id' in the schema cache"                              */
/*  Cause racine : le code référait `type_aliment_id` / `types_aliment` mais  */
/*  le schéma BDD (genesis 2026-05-23) utilise `formule_id REFERENCES         */
/*  formules(id)` — colonne `type_aliment_id` inexistante.                    */
/*  Fix Option B (propre) : alignement complet du code sur le schéma réel.    */
/*  Fix Option A (safety net) : try/catch global + EmptyState métier au       */
/*  lieu d'exposer un message d'erreur technique brut à l'utilisateur.        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  PROJECTION STOCK — feature nutrition prédictive (2026-05-24)              */
/* -------------------------------------------------------------------------- */

type ProjectionRow = {
  formule_id: string
  formule_nom: string
  formule_stade: string | null
  conso_quotidienne_kg: number
  stock_kg_actuel: number
  jours_restants: number | null
  date_epuisement: string | null
}

function variantPourJours(j: number | null): 'success' | 'warning' | 'danger' | 'secondary' {
  if (j === null) return 'secondary'
  if (j < 7) return 'danger'
  if (j < 14) return 'warning'
  return 'success'
}

function styleBgPourVariant(v: 'success' | 'warning' | 'danger' | 'secondary'): {
  background: string
  color: string
} {
  if (v === 'danger') {
    return { background: 'var(--sf-danger-bg, #F5D9D2)', color: 'var(--sf-danger-ink, #7A2A1F)' }
  }
  if (v === 'warning') {
    return { background: 'var(--sf-warning-bg, #F5E0B8)', color: 'var(--sf-warning-ink, #5A3E0E)' }
  }
  if (v === 'success') {
    return { background: 'var(--sf-success-bg, #D6E3CC)', color: 'var(--sf-success-ink, #1F3B12)' }
  }
  return { background: 'transparent', color: 'var(--sf-muted, #5C5346)' }
}

/* -------------------------------------------------------------------------- */
/*  Server action button                                                      */
/* -------------------------------------------------------------------------- */

function FormDelete({ id }: { id: string }) {
  async function action() {
    'use server'
    await supprimerPlan(id)
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
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const LABEL_STATUT: Record<StatutPlan, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
}

function badgeStatut(s: StatutPlan) {
  if (s === 'en_cours') {
    return (
      <Badge
        style={{
          background: 'var(--sf-success-bg, #D6E3CC)',
          color: 'var(--sf-success-ink, #1F3B12)',
        }}
      >
        {LABEL_STATUT[s]}
      </Badge>
    )
  }
  if (s === 'a_venir') {
    return (
      <Badge
        style={{
          background: 'var(--sf-warning-bg, #F5E0B8)',
          color: 'var(--sf-warning-ink, #5A3E0E)',
        }}
      >
        {LABEL_STATUT[s]}
      </Badge>
    )
  }
  return <Badge variant="outline">{LABEL_STATUT[s]}</Badge>
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try {
    return format(new Date(d), 'dd MMM yyyy', { locale: fr })
  } catch {
    return d
  }
}

/* -------------------------------------------------------------------------- */
/*  Composant erreur métier (EmptyState a11y)                                  */
/* -------------------------------------------------------------------------- */

function ChargementImpossible({ details }: { details?: string }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-8 text-center space-y-3 border border-dashed border-[var(--sf-border,#E5DDD0)] rounded-md"
    >
      <AlertTriangle
        className="h-8 w-8 mx-auto text-[var(--sf-warning-ink,#5A3E0E)]"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-[var(--sf-ink,#1a1a1a)]">
        Plans d’alimentation : configuration en cours
      </p>
      <p className="text-xs text-[var(--sf-muted,#5C5346)] max-w-md mx-auto">
        Le module est temporairement indisponible. Contactez votre administrateur
        si le problème persiste.
      </p>
      {process.env.NODE_ENV !== 'production' && details ? (
        <pre className="text-[10px] text-[var(--sf-muted,#5C5346)] bg-[var(--sf-surface-1,rgba(0,0,0,0.02))] p-2 rounded mt-2 overflow-x-auto text-left">
          {details}
        </pre>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                       */
/* -------------------------------------------------------------------------- */

type PageData =
  | {
      ok: true
      plans: Array<
        PlanRow & {
          bande: { id: string; code: string; nom: string; statut: string } | null
          formule: { id: string; nom: string } | null
        }
      >
      bandes: Array<{ id: string; code: string; nom: string; statut: string }>
      formules: Array<{ id: string; nom: string }>
      projections: ProjectionRow[]
    }
  | { ok: false; error: string }

async function loadPageData(): Promise<PageData> {
  try {
    const sb = await createClient()

    const [
      { data: plansData, error: errPlans },
      { data: bandesData, error: errBandes },
      { data: formulesData, error: errFormules },
      { data: projectionData },
    ] = await Promise.all([
      sb
        .from('plans_alimentation')
        .select(
          'id, bande_id, formule_id, date_debut, date_fin, ration_kg_jour, bande:bande_id(id, code, nom, statut), formule:formule_id(id, nom)',
        )
        .is('deleted_at', null)
        .order('date_debut', { ascending: false }),
      sb
        .from('bandes')
        .select('id, code, nom, statut')
        .is('deleted_at', null)
        .order('code', { ascending: false }),
      sb
        .from('formules')
        .select('id, nom')
        .is('deleted_at', null)
        .order('nom'),
      sb
        .from('v_stock_projection_ferme')
        .select(
          'formule_id, formule_nom, formule_stade, conso_quotidienne_kg, stock_kg_actuel, jours_restants, date_epuisement',
        )
        .order('jours_restants', { ascending: true, nullsFirst: false }),
    ])

    // Si une des 3 queries critiques échoue → renvoyer l'erreur la + parlante
    const blockingError = errPlans ?? errBandes ?? errFormules
    if (blockingError) {
      console.error('[alimentation/plans] supabase error:', blockingError)
      return { ok: false, error: blockingError.message }
    }

    type Row = PlanRow & {
      bande: { id: string; code: string; nom: string; statut: string } | null
      formule: { id: string; nom: string } | null
    }

    const plans = ((plansData ?? []) as unknown) as Row[]

    const projections = (((projectionData ?? []) as unknown) as ProjectionRow[]).map(
      (p) => ({
        ...p,
        conso_quotidienne_kg: Number(p.conso_quotidienne_kg ?? 0),
        stock_kg_actuel: Number(p.stock_kg_actuel ?? 0),
      }),
    )

    return {
      ok: true,
      plans,
      bandes: (bandesData ?? []) as Array<{
        id: string
        code: string
        nom: string
        statut: string
      }>,
      formules: (formulesData ?? []) as Array<{ id: string; nom: string }>,
      projections,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    console.error('[alimentation/plans] unexpected error:', e)
    return { ok: false, error: msg }
  }
}

export default async function PlansAlimentationPage(props: {
  searchParams?: Promise<{ statut?: string; bande?: string }>
}) {
  const sp = (await props.searchParams) ?? {}
  const filtreStatut = sp.statut as StatutPlan | undefined
  const filtreBande = sp.bande

  const result = await loadPageData()

  // === Cas erreur globale : EmptyState métier (pas de stack SQL exposée) ===
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/alimentation"
            className="text-xs uppercase tracking-[0.08em] text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary)] inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Retour à l’alimentation
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)] mt-1">
            <Calendar className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Plans d’alimentation
          </h1>
        </div>
        <ChargementImpossible details={result.error} />
      </div>
    )
  }

  const { plans: rowsAll, bandes, formules, projections } = result

  const rowsWithStatut = rowsAll.map((r) => ({
    ...r,
    _statut: calculerStatutPlan(r.date_debut, r.date_fin),
  }))

  const rows = rowsWithStatut.filter((r) => {
    if (filtreStatut && r._statut !== filtreStatut) return false
    if (filtreBande && r.bande_id !== filtreBande) return false
    return true
  })

  const totalEnCours = rowsWithStatut.filter((r) => r._statut === 'en_cours').length
  const totalAVenir = rowsWithStatut.filter((r) => r._statut === 'a_venir').length
  const totalTermine = rowsWithStatut.filter((r) => r._statut === 'termine').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/alimentation"
            className="text-xs uppercase tracking-[0.08em] text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary)] inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Retour à l’alimentation
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)] mt-1">
            <Calendar className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Plans d’alimentation
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Planification des rations par bande d’élevage.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DialogPlan
            mode="create"
            bandes={bandes}
            formules={formules}
            trigger={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nouveau plan
              </Button>
            }
          />
        </div>
      </div>

      {/* === PROJECTION STOCK (en tête, feature nutrition prédictive) === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-[var(--sf-primary)]" />
            Projection stock par formule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {projections.length === 0 ? (
            <p className="p-6 text-sm text-[var(--sf-muted,#5C5346)] italic">
              Aucune formule configurée — ajouter des composants matières premières pour activer
              la projection.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formule</TableHead>
                  <TableHead className="text-right">Conso (kg/j)</TableHead>
                  <TableHead className="text-right">Stock (kg)</TableHead>
                  <TableHead className="text-right">Jours restants</TableHead>
                  <TableHead>Épuisement</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projections.map((p) => {
                  const v = variantPourJours(p.jours_restants)
                  return (
                    <TableRow key={p.formule_id}>
                      <TableCell>
                        <div className="font-medium">{p.formule_nom}</div>
                        {p.formule_stade && (
                          <div className="text-xs text-[var(--sf-muted,#5C5346)] capitalize">
                            {p.formule_stade.replace('_', ' ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono">
                        {p.conso_quotidienne_kg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono">
                        {p.stock_kg_actuel.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.jours_restants !== null ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tabular-nums"
                            style={styleBgPourVariant(v)}
                          >
                            {v === 'danger' && <AlertTriangle className="h-3 w-3" />}
                            {p.jours_restants} j
                          </span>
                        ) : (
                          <span className="text-[var(--sf-muted,#5C5346)] italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {p.date_epuisement
                          ? new Date(p.date_epuisement).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.jours_restants !== null && p.jours_restants < 14 ? (
                          <Link
                            href={`/alimentation/formulation?formule=${p.formule_id}`}
                            className="inline-flex items-center justify-center rounded-md border border-[var(--sf-line,rgba(0,0,0,0.08))] px-3 py-1.5 text-xs font-medium hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.02))]"
                          >
                            Anticiper production
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--sf-muted,#5C5346)]">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* KPI ----------------------------------------------------------------- */}
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
              {totalEnCours}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-success-ink, #1F3B12)' }}
            >
              Plans en cours
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
              {totalAVenir}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              À venir
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
            <div className="text-3xl font-bold tabular-nums">{totalTermine}</div>
            <div className="eyebrow text-[11px] mt-1 text-[var(--sf-muted,#5C5346)]">
              Terminés
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres ------------------------------------------------------------ */}
      <div className="flex gap-2 flex-wrap text-xs">
        <Link
          href="/alimentation/plans"
          className={`px-3 py-1.5 rounded-md border ${!filtreStatut && !filtreBande ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-[var(--sf-line,#E7E5E4)] hover:bg-[var(--sf-surface-1)]'}`}
        >
          Tous
        </Link>
        <Link
          href="/alimentation/plans?statut=en_cours"
          className={`px-3 py-1.5 rounded-md border ${filtreStatut === 'en_cours' ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-[var(--sf-line,#E7E5E4)] hover:bg-[var(--sf-surface-1)]'}`}
        >
          En cours
        </Link>
        <Link
          href="/alimentation/plans?statut=a_venir"
          className={`px-3 py-1.5 rounded-md border ${filtreStatut === 'a_venir' ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-[var(--sf-line,#E7E5E4)] hover:bg-[var(--sf-surface-1)]'}`}
        >
          À venir
        </Link>
        <Link
          href="/alimentation/plans?statut=termine"
          className={`px-3 py-1.5 rounded-md border ${filtreStatut === 'termine' ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-[var(--sf-line,#E7E5E4)] hover:bg-[var(--sf-surface-1)]'}`}
        >
          Terminés
        </Link>
      </div>

      {/* TABLE -------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liste des plans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyOnboarding
                icon={<Wheat className="h-12 w-12" />}
                eyebrow="PLANS D'ALIMENTATION"
                title="Aucun plan d’alimentation enregistré pour ce filtre"
                description="Planifie la ration de chaque bande selon son stade physiologique (gestation, lactation, sevrage…). Smart Farm calcule les quantités et coûts auto."
                cta={{
                  label: 'Créer un premier plan',
                  href: '/alimentation/plans?action=new',
                }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bande</TableHead>
                  <TableHead>Formule</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-right">Ration (kg/j)</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.bande?.code ?? '—'}</div>
                      {p.bande?.nom ? (
                        <div className="text-xs text-[var(--sf-muted,#5C5346)]">
                          {p.bande.nom}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.formule?.nom ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {fmtDate(p.date_debut)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {fmtDate(p.date_fin)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.ration_kg_jour ?? '—'}
                    </TableCell>
                    <TableCell>{badgeStatut(p._statut)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <DialogPlan
                          mode="edit"
                          initial={{
                            id: p.id,
                            bande_id: p.bande_id,
                            formule_id: p.formule_id,
                            date_debut: p.date_debut,
                            date_fin: p.date_fin,
                            ration_kg_jour: p.ration_kg_jour,
                          }}
                          bandes={bandes}
                          formules={formules}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                          }
                        />
                        <FormDelete id={p.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
