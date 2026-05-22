import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExportButton } from '@/components/export-button'
import { Activity, Plus, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { DialogConsommation, type ConsoRow } from './_dialog-conso'
import { supprimerConsommation } from './_actions'

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

function fmtDate(d: string | null) {
  if (!d) return '—'
  try {
    return format(new Date(d), 'dd MMM yyyy', { locale: fr })
  } catch {
    return d
  }
}

function fmtXof(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ConsommationsPage() {
  const sb = await createClient()

  const [
    { data: consoData, error },
    { data: bandesData },
    { data: typesData },
  ] = await Promise.all([
    sb
      .from('consommations_aliment')
      .select(
        'id, bande_id, type_aliment_id, date, quantite_kg, cout, observations, bande:bande_id(id, code, nom), type_aliment:type_aliment_id(id, nom)',
      )
      .order('date', { ascending: false })
      .limit(30),
    sb
      .from('bandes')
      .select('id, code, nom')
      .is('deleted_at', null)
      .order('code', { ascending: false }),
    sb.from('types_aliment').select('id, nom').order('nom'),
  ])

  type Row = ConsoRow & {
    bande: { id: string; code: string; nom: string } | null
    type_aliment: { id: string; nom: string } | null
  }

  const rows = (consoData ?? []) as unknown as Row[]

  const totalKg = rows.reduce((s, r) => s + Number(r.quantite_kg ?? 0), 0)
  const totalCout = rows.reduce((s, r) => s + Number(r.cout ?? 0), 0)

  const bandes = (bandesData ?? []) as Array<{
    id: string
    code: string
    nom: string
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
            typesAliment={typesAliment}
            trigger={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle saisie
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
            <p className="p-6 text-sm text-[var(--sf-danger-ink,#7A2A1F)]">
              Erreur de chargement : {error.message}
            </p>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-[var(--sf-muted,#5C5346)]">
                Aucune consommation enregistrée — démarrez le suivi.
              </p>
              <DialogConsommation
                mode="create"
                bandes={bandes}
                typesAliment={typesAliment}
                trigger={
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Saisir une première consommation
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bande</TableHead>
                  <TableHead>Aliment</TableHead>
                  <TableHead className="text-right">Quantité (kg)</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead>Observations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm tabular-nums">
                      {fmtDate(c.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{c.bande?.code ?? '—'}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.type_aliment?.nom ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {new Intl.NumberFormat('fr-FR').format(
                        Number(c.quantite_kg ?? 0),
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtXof(c.cout)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--sf-muted,#5C5346)] max-w-[16rem] truncate">
                      {c.observations ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <DialogConsommation
                          mode="edit"
                          initial={{
                            id: c.id,
                            bande_id: c.bande_id,
                            type_aliment_id: c.type_aliment_id,
                            date: c.date,
                            quantite_kg: Number(c.quantite_kg),
                            cout: c.cout,
                            observations: c.observations,
                          }}
                          bandes={bandes}
                          typesAliment={typesAliment}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                          }
                        />
                        <FormDelete id={c.id} />
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
