import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, AlertCircle, BellRing, Clock, Syringe, Calendar } from 'lucide-react'
import { EmptyOnboarding } from '@/components/ui/empty-onboarding'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { getCalendrierSanitaire, getActesPorcelets, type ActeSanitaire, type ActePorcelet, type ActesPorceletsGrouped } from './_queries'
import { enregistrerVaccinDepuisCalendrier, marquerEvenementFait } from './_actions'
import { marquerActePorceletFait } from './_actions-porcelets'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Calendrier sanitaire',
}

export const dynamic = 'force-dynamic'

export default async function CalendrierSanitairePage({
  searchParams,
}: {
  searchParams?: Promise<{ toast?: string; msg?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const toastKind = sp.toast
  const toastMsg = sp.msg
  const cal = await getCalendrierSanitaire()
  const actesPorcelets = await getActesPorcelets()

  // PROD-B : tous les évènements `evenements_prevus` à venir / en retard
  // (vermifuges, vaccins cochette, transferts, sevrages, diag gestation…)
  const sb = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const minDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const { data: aFaireRaw } = await sb
    .from('evenements_prevus')
    .select(
      'id, type_evenement, date_prevue, statut, priorite, notes, animal:animal_id(tag, nom), bande:bande_id(code, nom)',
    )
    .eq('statut', 'planifie')
    .gte('date_prevue', minDate)
    .lte('date_prevue', maxDate)
    .order('date_prevue', { ascending: true })
    .limit(100)
  type EvenementARéaliser = {
    id: string
    type_evenement: string
    date_prevue: string
    statut: string
    priorite: number | null
    notes: string | null
    animal: { tag: string | null; nom: string | null } | null
    bande: { code: string | null; nom: string | null } | null
  }
  const aFaire = (aFaireRaw ?? []) as unknown as EvenementARéaliser[]

  const totalActes =
    cal.retards.length + cal.aujourdhui.length + cal.avenir.length

  return (
    <div className="space-y-6">
      {toastKind === 'success' && toastMsg ? (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: 'var(--sf-success-bg, #D6E3CC)',
            color: 'var(--sf-success-ink, #1F3B12)',
          }}
        >
          ✅ {decodeURIComponent(toastMsg)}
        </div>
      ) : null}
      {toastKind === 'error' && toastMsg ? (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: 'var(--sf-danger-bg, #F1D4CE)',
            color: 'var(--sf-danger-ink, #7A2A1F)',
          }}
        >
          ⚠ {decodeURIComponent(toastMsg)}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)]">
            <CalendarDays className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Calendrier sanitaire
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Actes prévus sur les 30 prochains jours · déclenchés par âge des
            animaux et des bandes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/sanitaire/protocoles">
            <Button variant="outline" size="sm">
              <Syringe className="h-4 w-4 mr-1" />
              Protocoles
            </Button>
          </Link>
          <Link href="/sanitaire">
            <Button variant="default" size="sm">
              Retour Soins
            </Button>
          </Link>
        </div>
      </div>

      {/* Récap chiffré */}
      <div className="grid grid-cols-3 gap-4">
        <RecapCard
          label="En retard"
          value={cal.retards.length}
          tone="danger"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <RecapCard
          label="Aujourd'hui"
          value={cal.aujourdhui.length}
          tone="warning"
          icon={<BellRing className="h-4 w-4" />}
        />
        <RecapCard
          label="À venir (30 j)"
          value={cal.avenir.length}
          tone="info"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Cas DB vide */}
      {cal.protocolesCount === 0 ? (
        <EmptyOnboarding
          icon={<Calendar className="h-12 w-12" />}
          eyebrow="CALENDRIER SANITAIRE"
          title="Aucun acte planifié pour ce filtre"
          description="Les actes attendus (fer J3, vaccins J21, vermifuges) sont auto-générés depuis tes protocoles vaccinaux + bandes en cours."
          cta={{ label: 'Voir les protocoles', href: '/sanitaire/protocoles' }}
        />
      ) : totalActes === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-[var(--sf-muted,#5C5346)]">
            Aucun acte prévu dans les 30 prochains jours. Tous les animaux sont
            à jour 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <SectionActes
            titre="En retard"
            emoji="❗"
            tone="danger"
            actes={cal.retards}
            emptyMessage="Aucun retard détecté."
          />
          <SectionActes
            titre="Aujourd'hui"
            emoji="🔔"
            tone="warning"
            actes={cal.aujourdhui}
            emptyMessage="Aucun acte prévu aujourd'hui."
          />
          <SectionActes
            titre="À venir"
            emoji="📅"
            tone="info"
            actes={cal.avenir}
            emptyMessage="Aucun acte à venir dans les 30 prochains jours."
          />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* PROD-B — Tous mes évènements à venir (evenements_prevus)            */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <SectionEvenementsPrevus actes={aFaire} today={today} />

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* V2-B — Actes porcelets attendus (mises-bas récentes)                 */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <SectionPorcelets actes={actesPorcelets} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function RecapCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'danger' | 'warning' | 'info'
  icon: React.ReactNode
}) {
  const palette = {
    danger: {
      bg: 'var(--sf-danger-bg, #F1D4CE)',
      ink: 'var(--sf-danger-ink, #7A2A1F)',
    },
    warning: {
      bg: 'var(--sf-warning-bg, #F5E0B8)',
      ink: 'var(--sf-warning-ink, #5A3E0E)',
    },
    info: {
      bg: 'var(--sf-info-bg, #D6E2EE)',
      ink: 'var(--sf-info-ink, #1F3A55)',
    },
  }[tone]

  return (
    <Card style={{ background: palette.bg, color: palette.ink }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2" style={{ color: palette.ink }}>
          {icon}
          <span className="eyebrow text-[11px]">{label}</span>
        </div>
        <div
          className="text-3xl font-bold tabular-nums mt-2"
          style={{ color: palette.ink }}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionActes({
  titre,
  emoji,
  tone,
  actes,
  emptyMessage,
}: {
  titre: string
  emoji: string
  tone: 'danger' | 'warning' | 'info'
  actes: ActeSanitaire[]
  emptyMessage: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow text-[13px] flex items-center gap-2">
          <span aria-hidden>{emoji}</span>
          <span>
            {titre}{' '}
            <span className="text-[var(--sf-muted,#5C5346)] tabular-nums">
              ({actes.length})
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actes.length === 0 ? (
          <div className="text-sm text-[var(--sf-muted,#5C5346)] py-4 text-center">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--sf-ink,#1a1a1a)] text-left">
                <tr className="eyebrow text-[11px] text-[var(--sf-muted,#5C5346)]">
                  <th className="pb-3 pr-4 font-semibold">Cible</th>
                  <th className="pb-3 pr-4 font-semibold">Acte</th>
                  <th className="pb-3 pr-4 font-semibold">Produit</th>
                  <th className="pb-3 pr-4 font-semibold">Voie / Dose</th>
                  <th className="pb-3 pr-4 font-semibold">Date prévue</th>
                  <th className="pb-3 pr-4 font-semibold">Écart</th>
                  <th className="pb-3 pl-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {actes.map((a) => (
                  <LigneActe key={a.id} acte={a} tone={tone} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LigneActe({
  acte,
  tone,
}: {
  acte: ActeSanitaire
  tone: 'danger' | 'warning' | 'info'
}) {
  const ecart = acte.ageJoursActuel - acte.ageJoursAttendu
  const ecartLabel =
    ecart === 0
      ? 'pile'
      : ecart > 0
        ? `+${ecart} j`
        : `${ecart} j`

  const animalId = acte.cibleType === 'animal' ? acte.cibleId : null
  const bandeId = acte.cibleType === 'bande' ? acte.cibleId : null
  const action = enregistrerVaccinDepuisCalendrier.bind(
    null,
    acte.protocoleId,
    animalId,
    bandeId,
  )

  return (
    <tr className="border-b border-[var(--sf-line,rgba(0,0,0,0.12))]">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <Badge variant={acte.cibleType === 'animal' ? 'outline' : 'secondary'}>
            {acte.cibleType === 'animal' ? 'Animal' : 'Bande'}
          </Badge>
          <div>
            <div className="text-[var(--sf-ink,#1a1a1a)] font-medium">
              {acte.cibleLabel}
            </div>
            {acte.cibleSousLabel ? (
              <div className="text-[11px] text-[var(--sf-muted,#5C5346)] font-mono">
                {acte.cibleSousLabel}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-[var(--sf-ink,#1a1a1a)]">
        <div className="flex items-center gap-2">
          <span>{acte.protocoleNom}</span>
          {acte.obligatoire ? (
            <Badge variant="danger" className="text-[9px]">
              Obligatoire
            </Badge>
          ) : null}
        </div>
        <div className="text-[11px] text-[var(--sf-muted,#5C5346)]">
          Âge attendu : J{acte.ageJoursAttendu} · âge actuel : J
          {acte.ageJoursActuel}
        </div>
      </td>
      <td className="py-3 pr-4">
        {acte.produit ? (
          <Badge variant="outline">{acte.produit}</Badge>
        ) : (
          <span className="text-[var(--sf-muted,#5C5346)]">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-[var(--sf-ink,#1a1a1a)]">
        <span className="font-mono tabular-nums text-[12px]">
          {acte.voie ?? '—'}
          {acte.doseMl != null ? ` · ${acte.doseMl} ml` : ''}
        </span>
      </td>
      <td className="py-3 pr-4 font-mono tabular-nums text-[var(--sf-ink,#1a1a1a)]">
        {format(acte.datePrevue, 'dd MMM yyyy', { locale: fr })}
      </td>
      <td className="py-3 pr-4">
        <Badge variant={badgeForTone(tone)}>{ecartLabel}</Badge>
      </td>
      <td className="py-3 pl-4 text-right">
        <form action={action}>
          <Button type="submit" variant="default" size="sm">
            Marquer fait
          </Button>
        </form>
      </td>
    </tr>
  )
}

function badgeForTone(
  tone: 'danger' | 'warning' | 'info',
): 'danger' | 'warning' | 'info' {
  return tone
}

/* -------------------------------------------------------------------------- */
/*  V2-B — Section actes porcelets attendus                                   */
/* -------------------------------------------------------------------------- */

function SectionPorcelets({ actes }: { actes: ActesPorceletsGrouped }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow text-[13px] flex items-center gap-2">
          <span aria-hidden>🐖</span>
          <span>
            Actes porcelets attendus (mises-bas récentes){' '}
            <span className="text-[var(--sf-muted,#5C5346)] tabular-nums">
              ({actes.total})
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actes.total === 0 ? (
          <div className="text-sm text-[var(--sf-muted,#5C5346)] py-4 text-center">
            Aucun acte porcelet à venir — aucune mise-bas récente.
          </div>
        ) : (
          <div className="space-y-6">
            <BlocPorcelets
              titre="En retard"
              emoji="❗"
              tone="danger"
              actes={actes.retard}
            />
            <BlocPorcelets
              titre="Aujourd'hui"
              emoji="🔔"
              tone="warning"
              actes={actes.aujourd_hui}
            />
            <BlocPorcelets
              titre="Cette semaine"
              emoji="📅"
              tone="warning"
              actes={actes.semaine}
            />
            <BlocPorcelets
              titre="Ce mois"
              emoji="🗓"
              tone="info"
              actes={actes.mois}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BlocPorcelets({
  titre,
  emoji,
  tone,
  actes,
}: {
  titre: string
  emoji: string
  tone: 'danger' | 'warning' | 'info'
  actes: ActePorcelet[]
}) {
  if (actes.length === 0) return null
  return (
    <div>
      <div className="eyebrow text-[11px] text-[var(--sf-muted,#5C5346)] mb-2 flex items-center gap-2">
        <span aria-hidden>{emoji}</span>
        <span>
          {titre}{' '}
          <span className="tabular-nums">({actes.length})</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--sf-ink,#1a1a1a)] text-left">
            <tr className="eyebrow text-[11px] text-[var(--sf-muted,#5C5346)]">
              <th className="pb-3 pr-4 font-semibold">Truie</th>
              <th className="pb-3 pr-4 font-semibold">Acte</th>
              <th className="pb-3 pr-4 font-semibold">Jour</th>
              <th className="pb-3 pr-4 font-semibold">Date prévue</th>
              <th className="pb-3 pr-4 font-semibold">Mise bas</th>
              <th className="pb-3 pl-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {actes.map((a) => (
              <LignePorcelet key={a.acteId} acte={a} tone={tone} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LignePorcelet({
  acte,
  tone,
}: {
  acte: ActePorcelet
  tone: 'danger' | 'warning' | 'info'
}) {
  const datePrevue = new Date(acte.datePrevue)
  const dateMb = new Date(acte.dateMiseBas)
  return (
    <tr className="border-b border-[var(--sf-line,rgba(0,0,0,0.12))]">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Truie</Badge>
          <div>
            <div className="text-[var(--sf-ink,#1a1a1a)] font-medium">
              {acte.truieTag}
            </div>
            <div className="text-[11px] text-[var(--sf-muted,#5C5346)]">
              {acte.nesVivants} porcelet{acte.nesVivants > 1 ? 's' : ''} vivant
              {acte.nesVivants > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-[var(--sf-ink,#1a1a1a)]">
        <div className="flex items-center gap-2 flex-wrap">
          <span>{acte.acte}</span>
          {acte.gravite === 'élevée' ? (
            <Badge variant="danger" className="text-[9px]">
              Obligatoire
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[9px]">
            {acte.typeActe === 'vaccination' ? 'Vaccin' : 'Soin'}
          </Badge>
        </div>
      </td>
      <td className="py-3 pr-4 font-mono tabular-nums text-[12px] text-[var(--sf-ink,#1a1a1a)]">
        J{acte.jourOffset}
      </td>
      <td className="py-3 pr-4 font-mono tabular-nums text-[var(--sf-ink,#1a1a1a)]">
        {format(datePrevue, 'dd MMM yyyy', { locale: fr })}
        <Badge variant={badgeForTone(tone)} className="ml-2 text-[9px]">
          {acte.statutTemporel === 'retard'
            ? 'retard'
            : acte.statutTemporel === 'aujourd_hui'
              ? "auj."
              : acte.statutTemporel === 'semaine'
                ? '7 j'
                : '30 j'}
        </Badge>
      </td>
      <td className="py-3 pr-4 font-mono tabular-nums text-[11px] text-[var(--sf-muted,#5C5346)]">
        {format(dateMb, 'dd/MM', { locale: fr })}
      </td>
      <td className="py-3 pl-4 text-right">
        <form action={marquerActePorceletFait}>
          <input type="hidden" name="mise_bas_id" value={acte.miseBasId} />
          <input type="hidden" name="acte" value={acte.acte} />
          <input type="hidden" name="type" value={acte.typeActe} />
          <Button type="submit" variant="default" size="sm">
            Marquer fait
          </Button>
        </form>
      </td>
    </tr>
  )
}

/* -------------------------------------------------------------------------- */
/*  PROD-B — Section "Tous mes évènements à venir"                            */
/*  Source : table `evenements_prevus`. Couvre les types non-porcelets :      */
/*  vaccins cochette parvo/lepto/rouget, vermifuges, transferts maternité,    */
/*  sevrages, diagnostics gestation, rappels vaccinaux, etc.                  */
/* -------------------------------------------------------------------------- */

function libelleEvenement(type: string): string {
  return type.replace(/_/g, ' ')
}

function joursDecalage(dateIso: string, todayIso: string): number {
  const d = new Date(dateIso).getTime()
  const t = new Date(todayIso).getTime()
  return Math.floor((d - t) / 86400000)
}

function SectionEvenementsPrevus({
  actes,
  today,
}: {
  actes: Array<{
    id: string
    type_evenement: string
    date_prevue: string
    statut: string
    priorite: number | null
    notes: string | null
    animal: { tag: string | null; nom: string | null } | null
    bande: { code: string | null; nom: string | null } | null
  }>
  today: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow text-[13px] flex items-center gap-2">
          <span aria-hidden>🗂</span>
          <span>
            Tous mes évènements à venir{' '}
            <span className="text-[var(--sf-muted,#5C5346)] tabular-nums">
              ({actes.length})
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actes.length === 0 ? (
          <div className="text-sm text-[var(--sf-muted,#5C5346)] py-4 text-center">
            Aucun évènement planifié sur les 30 prochains jours.
          </div>
        ) : (
          <ul className="space-y-2">
            {actes.map((e) => {
              const jr = joursDecalage(e.date_prevue, today)
              const enRetard = jr < 0
              const cible =
                e.animal?.tag ??
                e.animal?.nom ??
                e.bande?.code ??
                e.bande?.nom ??
                '—'
              const label = enRetard
                ? `J${jr} retard`
                : jr === 0
                  ? "Aujourd'hui"
                  : `J+${jr}`
              return (
                <li
                  key={e.id}
                  className="border rounded-md p-3 flex items-center justify-between gap-3 flex-wrap"
                  style={{
                    borderColor: 'var(--sf-line, rgba(0,0,0,0.12))',
                    background: enRetard
                      ? 'var(--sf-danger-bg, #F1D4CE)'
                      : 'var(--sf-surface-1, #fff)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={enRetard ? 'danger' : 'secondary'}>
                        {label}
                      </Badge>
                      <span className="text-[var(--sf-ink,#1a1a1a)] font-medium capitalize">
                        {libelleEvenement(e.type_evenement)}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--sf-muted,#5C5346)] mt-1">
                      <span className="font-mono">{cible}</span> ·{' '}
                      {format(new Date(e.date_prevue), 'dd MMM yyyy', {
                        locale: fr,
                      })}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </div>
                  </div>
                  <form action={marquerEvenementFait}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="default"
                      className="min-h-[44px]"
                    >
                      Marquer fait
                    </Button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
