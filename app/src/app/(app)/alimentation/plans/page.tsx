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
import { Calendar, Plus, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { DialogPlan, type PlanRow } from './_dialog-plan'
import { supprimerPlan } from './_actions'
import { calculerStatutPlan, type StatutPlan } from './_schemas'

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
/*  PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PlansAlimentationPage(props: {
  searchParams?: Promise<{ statut?: string; bande?: string }>
}) {
  const sp = (await props.searchParams) ?? {}
  const filtreStatut = sp.statut as StatutPlan | undefined
  const filtreBande = sp.bande

  const sb = await createClient()

  const [
    { data: plansData, error },
    { data: bandesData },
    { data: typesData },
  ] = await Promise.all([
    sb
      .from('plans_alimentation')
      .select(
        'id, bande_id, type_aliment_id, date_debut, date_fin, ration_kg_jour, bande:bande_id(id, code, nom, statut), type_aliment:type_aliment_id(id, nom)',
      )
      .order('date_debut', { ascending: false }),
    sb
      .from('bandes')
      .select('id, code, nom, statut')
      .is('deleted_at', null)
      .order('code', { ascending: false }),
    sb.from('types_aliment').select('id, nom').order('nom'),
  ])

  type Row = PlanRow & {
    bande: { id: string; code: string; nom: string; statut: string } | null
    type_aliment: { id: string; nom: string } | null
  }

  const rowsAll = (plansData ?? []) as unknown as Row[]
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

  const bandes = (bandesData ?? []) as Array<{
    id: string
    code: string
    nom: string
    statut: string
  }>
  const typesAliment = (typesData ?? []) as Array<{ id: string; nom: string }>

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
            typesAliment={typesAliment}
            trigger={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nouveau plan
              </Button>
            }
          />
        </div>
      </div>

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
          className={`px-3 py-1.5 rounded-md border ${!filtreStatut && !filtreBande ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          Tous
        </Link>
        <Link
          href="/alimentation/plans?statut=en_cours"
          className={`px-3 py-1.5 rounded-md border ${filtreStatut === 'en_cours' ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          En cours
        </Link>
        <Link
          href="/alimentation/plans?statut=a_venir"
          className={`px-3 py-1.5 rounded-md border ${filtreStatut === 'a_venir' ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          À venir
        </Link>
        <Link
          href="/alimentation/plans?statut=termine"
          className={`px-3 py-1.5 rounded-md border ${filtreStatut === 'termine' ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-transparent' : 'border-slate-200 hover:bg-slate-50'}`}
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
          {error ? (
            <p className="p-6 text-sm text-[var(--sf-danger-ink,#7A2A1F)]">
              Erreur de chargement : {error.message}
            </p>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-[var(--sf-muted,#5C5346)]">
                Aucun plan d’alimentation enregistré pour ce filtre.
              </p>
              <DialogPlan
                mode="create"
                bandes={bandes}
                typesAliment={typesAliment}
                trigger={
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Créer un premier plan
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bande</TableHead>
                  <TableHead>Aliment</TableHead>
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
                      {p.type_aliment?.nom ?? '—'}
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
                            type_aliment_id: p.type_aliment_id,
                            date_debut: p.date_debut,
                            date_fin: p.date_fin,
                            ration_kg_jour: p.ration_kg_jour,
                          }}
                          bandes={bandes}
                          typesAliment={typesAliment}
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
