import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { ExportButton } from '@/components/export-button'
import { Activity, Plus, ChevronLeft, AlertTriangle } from 'lucide-react'
import { formatDateContextuel } from '@/lib/format/dates'

import { DialogConsommation, type ConsoRow } from './_dialog-conso'
import { supprimerConsommation } from './_actions'
import { ConsommationsFab } from './_fab'

/* -------------------------------------------------------------------------- */
/*  Server action button                                                      */
/* -------------------------------------------------------------------------- */

function FormDelete({ id }: { id: string }) {
  async function action() {
    'use server'
    await supprimerConsommation(id)
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

function fmtXof(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                       */
/*                                                                             */
/*  FIX 2026-05-24 BUG-SC12 : la table joint `formules` (FAF, achetée…), PAS  */
/*  une table `types_aliment` inexistante. Coût = qte_kg × formules.cout_kg.  */
/* -------------------------------------------------------------------------- */

export default async function ConsommationsPage() {
  const sb = await createClient()

  const [
    { data: consoData, error },
    { data: bandesData },
    { data: formulesData },
  ] = await Promise.all([
    sb
      .from('consommations_aliment')
      .select(
        'id, bande_id, formule_id, date, qte_kg, observations, bande:bande_id(id, code, nom), formule:formule_id(id, nom, cout_kg_fcfa)',
      )
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(30),
    sb
      .from('bandes')
      .select('id, code, nom')
      .is('deleted_at', null)
      .order('code', { ascending: false }),
    sb
      .from('formules')
      .select('id, nom')
      .is('deleted_at', null)
      .order('nom'),
  ])

  type Row = ConsoRow & {
    bande: { id: string; code: string; nom: string } | null
    formule: { id: string; nom: string; cout_kg_fcfa: number | null } | null
  }

  const rows = (consoData ?? []) as unknown as Row[]

  const totalKg = rows.reduce((s, r) => s + Number(r.qte_kg ?? 0), 0)
  // Coût total dérivé : pour chaque ligne, qte_kg × formules.cout_kg_fcfa
  const totalCout = rows.reduce((s, r) => {
    const c = Number(r.formule?.cout_kg_fcfa ?? 0) * Number(r.qte_kg ?? 0)
    return s + (Number.isFinite(c) ? c : 0)
  }, 0)

  const bandes = (bandesData ?? []) as Array<{
    id: string
    code: string
    nom: string
  }>
  const formules = (formulesData ?? []) as Array<{ id: string; nom: string }>

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
            <Activity className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Consommations d’aliment
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Suivi quotidien / hebdomadaire des distributions par bande.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton table="consommations_aliment" />
          <DialogConsommation
            mode="create"
            bandes={bandes}
            formules={formules}
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
              {rows.length}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-success-ink, #1F3B12)' }}
            >
              Dernières saisies (30 max)
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
              {new Intl.NumberFormat('fr-FR').format(Math.round(totalKg))} kg
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              Total distribué (vue)
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
            <div className="text-3xl font-bold tabular-nums">
              {fmtXof(totalCout)}
            </div>
            <div className="eyebrow text-[11px] mt-1 text-[var(--sf-muted,#5C5346)]">
              Coût cumulé (vue)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE -------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">30 dernières consommations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                Consommations : chargement impossible
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
                Aucune consommation enregistrée — démarrez le suivi.
              </p>
              <DialogConsommation
                mode="create"
                bandes={bandes}
                formules={formules}
                trigger={
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Saisir une première consommation
                  </Button>
                }
              />
            </div>
          ) : (
            <ResponsiveTable
              data={rows}
              columns={[
                {
                  key: 'date',
                  label: 'DATE',
                  primary: true,
                  className: 'text-sm tabular-nums',
                  render: (v: string | null) => v ? formatDateContextuel(v) : '—',
                },
                {
                  key: 'bande',
                  label: 'BANDE',
                  render: (bande: any) => (
                    <div className="font-medium">{bande?.code ?? '—'}</div>
                  ),
                },
                {
                  key: 'formule',
                  label: 'ALIMENT',
                  className: 'text-sm',
                  render: (formule: any) => formule?.nom ?? '—',
                },
                {
                  key: 'qte_kg',
                  label: 'QUANTITÉ (KG)',
                  className: 'text-right tabular-nums font-medium',
                  headerClassName: 'text-right',
                  render: (v: number | null) =>
                    new Intl.NumberFormat('fr-FR').format(Number(v ?? 0)),
                },
                {
                  key: 'cout',
                  label: 'COÛT',
                  className: 'text-right tabular-nums',
                  headerClassName: 'text-right',
                  render: (_: any, item: any) => {
                    const coutLigne =
                      Number(item.formule?.cout_kg_fcfa ?? 0) *
                      Number(item.qte_kg ?? 0)
                    return fmtXof(Number.isFinite(coutLigne) ? coutLigne : null)
                  },
                },
                {
                  key: 'observations',
                  label: 'OBSERVATIONS',
                  className: 'text-xs text-[var(--sf-muted,#5C5346)] max-w-[16rem] truncate',
                },
                {
                  key: 'actions',
                  label: 'ACTIONS',
                  headerClassName: 'text-right',
                  render: (_: any, c: any) => (
                    <div className="flex justify-end gap-1 flex-wrap">
                      <DialogConsommation
                        mode="edit"
                        initial={{
                          id: c.id,
                          bande_id: c.bande_id,
                          formule_id: c.formule_id,
                          date: c.date,
                          qte_kg: Number(c.qte_kg),
                          observations: c.observations,
                        }}
                        bandes={bandes}
                        formules={formules}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Modifier
                          </Button>
                        }
                      />
                      <FormDelete id={c.id} />
                    </div>
                  ),
                },
              ]}
              getRowKey={(item) => item.id}
              emptyMessage="Aucune consommation enregistrée"
            />
          )}
        </CardContent>
      </Card>

      {/* === FAB mobile === */}
      <ConsommationsFab bandes={bandes} formules={formules} />
    </div>
  )
}
