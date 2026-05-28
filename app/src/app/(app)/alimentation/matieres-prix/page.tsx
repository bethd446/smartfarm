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
import {
  Banknote,
  Plus,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react'

import { DialogPrix } from './_dialog-prix'
import { supprimerPrixMatiere } from './_actions'

// Types ---------------------------------------------------------------------
type PrixRow = {
  id: string
  matiere_id: string
  date_releve: string
  prix_xof_kg: number
  source: string | null
  observations: string | null
  matieres_premieres: { nom: string } | { nom: string }[] | null
}

type MatiereOption = { id: string; nom: string }

// Helpers -------------------------------------------------------------------
function n(v: number | null | undefined, dec = 0): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—'
  return Number(v).toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function fmtDate(iso: string): string {
  // Affichage côté serveur déterministe (locale fr, UTC pour éviter hydration)
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function nomMatiere(row: PrixRow): string {
  const m = row.matieres_premieres
  if (!m) return '—'
  if (Array.isArray(m)) return m[0]?.nom ?? '—'
  return m.nom ?? '—'
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

// KPI card factorisée -------------------------------------------------------
function KpiCard({
  value,
  label,
  bg,
  ink,
}: {
  value: string
  label: string
  bg: string
  ink: string
}) {
  return (
    <Card style={{ background: bg, color: ink }}>
      <CardContent className="p-5">
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color: ink }}
        >
          {value}
        </div>
        <div className="eyebrow text-[11px] mt-1" style={{ color: ink }}>
          {label}
        </div>
      </CardContent>
    </Card>
  )
}

// Form delete (server action wrapper) ---------------------------------------
function FormDelete({ id }: { id: string }) {
  async function action() {
    'use server'
    await supprimerPrixMatiere(id)
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

// Filtres (server, via searchParams) ----------------------------------------
function FiltresPrix({
  matieres,
  m,
  from,
  to,
}: {
  matieres: MatiereOption[]
  m: string
  from: string
  to: string
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3"
      role="search"
    >
      <div className="min-w-[220px]">
        <label htmlFor="m" className="eyebrow text-[11px] block mb-1">
          Matière
        </label>
        <select
          id="m"
          name="m"
          defaultValue={m}
          className="h-9 w-full rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] px-2 text-sm"
        >
          <option value="">Toutes</option>
          {matieres.map((mat) => (
            <option key={mat.id} value={mat.id}>
              {mat.nom}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="from" className="eyebrow text-[11px] block mb-1">
          Depuis
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          className="h-9 rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] px-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="to" className="eyebrow text-[11px] block mb-1">
          Jusqu&apos;à
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={to}
          className="h-9 rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] px-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Filtrer
        </Button>
        <Link
          href="/alimentation/matieres-prix"
          className="inline-flex items-center justify-center rounded-md border border-[var(--sf-border,#E5DDD0)] px-3 text-sm h-9 hover:bg-[var(--sf-bg,#F5F1E8)]"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  )
}

// PAGE ----------------------------------------------------------------------
type SP = { m?: string; from?: string; to?: string }

export default async function MatieresPrixPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = (await searchParams) ?? {}
  const m = (sp.m ?? '').trim()
  const from = (sp.from ?? '').trim()
  const to = (sp.to ?? '').trim()

  const sb = await createClient()

  // Liste des matières (pour filtre + dialog)
  const { data: matieresData } = await sb
    .from('matieres_premieres')
    .select('id, nom')
    .order('nom', { ascending: true })
  const matieres = (matieresData ?? []) as MatiereOption[]

  // Historique filtré
  let q = sb
    .from('prix_matieres_historique')
    .select(
      'id, matiere_id, date_releve, prix_xof_kg, source, observations, matieres_premieres ( nom )',
    )
    .order('date_releve', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)

  if (m) q = q.eq('matiere_id', m)
  if (from) q = q.gte('date_releve', from)
  if (to) q = q.lte('date_releve', to)

  const { data, error } = await q
  const rows = (data ?? []) as PrixRow[]

  // KPI
  const total = rows.length
  const seuil30 = daysAgoIso(30)
  const recents = rows.filter((r) => r.date_releve >= seuil30)
  const nbRecents = recents.length
  const prixMoyenRecent =
    recents.length > 0
      ? recents.reduce((s, r) => s + Number(r.prix_xof_kg || 0), 0) /
        recents.length
      : null

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
            <Banknote className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Historique prix matières
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Traçabilité des relevés de prix CI dans le temps.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DialogPrix
            matieres={matieres}
            trigger={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nouveau prix
              </Button>
            }
          />
        </div>
      </div>

      {/* KPI ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          value={String(total)}
          label="Relevés totaux"
          bg="var(--sf-success-bg, #D6E3CC)"
          ink="var(--sf-success-ink, #1F3B12)"
        />
        <KpiCard
          value={String(nbRecents)}
          label="Sur les 30 derniers jours"
          bg="var(--sf-warning-bg, #F5E0B8)"
          ink="var(--sf-warning-ink, #5A3E0E)"
        />
        <KpiCard
          value={prixMoyenRecent !== null ? n(prixMoyenRecent, 0) : '—'}
          label="Prix moyen XOF/kg (30 j)"
          bg="var(--sf-bg, #F5F1E8)"
          ink="var(--sf-ink, #1a1a1a)"
        />
      </div>

      {/* FILTRES ----------------------------------------------------------- */}
      <Card>
        <CardContent className="p-4">
          <FiltresPrix matieres={matieres} m={m} from={from} to={to} />
        </CardContent>
      </Card>

      {/* TABLE ------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relevés de prix</CardTitle>
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
                Historique prix : chargement impossible
              </p>
              <p className="text-xs text-[var(--sf-muted,#5C5346)] max-w-md mx-auto">
                Le module est temporairement indisponible. Contactez votre
                administrateur si le problème persiste.
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
                Aucun relevé. Commencez par ajouter votre premier prix.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matière</TableHead>
                  <TableHead>Date relevé</TableHead>
                  <TableHead className="text-right">Prix XOF/kg</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Observations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{nomMatiere(r)}</div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {fmtDate(r.date_releve)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {n(r.prix_xof_kg, 0)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--sf-muted,#5C5346)]">
                      {r.source || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--sf-muted,#5C5346)] max-w-[280px]">
                      <span className="line-clamp-2">
                        {r.observations || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <FormDelete id={r.id} />
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
