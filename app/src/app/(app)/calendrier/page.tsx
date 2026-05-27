import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import { EmptyOnboarding } from '@/components/ui/empty-onboarding'
import {
  Calendar,
  Stethoscope,
  Activity,
  Baby,
  Syringe,
  Sprout,
  Heart,
  Download,
  ChevronRight,
} from 'lucide-react'
import {
  projeterTous,
  bucketize,
  EVENEMENT_LABEL,
  type EvenementPrevu,
  type SaillieRow,
  type MiseBasRow,
  type SevrageRow,
  type DiagnosticGestationRow,
} from '@/lib/calendrier-helpers'

// Calendrier prévisionnel : recalcul à chaque visite (pas d'ISR)
export const dynamic = 'force-dynamic'

// ─── Icônes par type d'événement ─────────────────────────────────────────
const ICON_BY_TYPE: Record<EvenementPrevu['type'], React.ComponentType<{ className?: string }>> = {
  diag_gestation: Stethoscope,
  echographie: Activity,
  mise_bas_prevue: Baby,
  fer_porcelet: Syringe,
  sevrage_prevu: Sprout,
  retour_chaleurs: Heart,
  vaccin_coli: Syringe,
  vaccin_parvo: Syringe,
}

function priorityBadgeVariant(p: EvenementPrevu['priorite']): 'danger' | 'warning' | 'info' | 'secondary' {
  if (p === 'critique') return 'danger'
  if (p === 'eleve') return 'warning'
  if (p === 'moyen') return 'info'
  return 'secondary'
}

function CarteEvenement({ e }: { e: EvenementPrevu }) {
  const Icon = ICON_BY_TYPE[e.type] ?? Calendar
  const enRetard = e.retard_jours > 0
  const aujourdhui = e.retard_jours === 0
  const joursLabel = enRetard
    ? `${e.retard_jours}j de retard`
    : aujourdhui
      ? "aujourd'hui"
      : `dans ${-e.retard_jours}j`

  return (
    <div className="flex items-start gap-3 py-3 px-2 hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.02))] transition-colors rounded-md">
      <div
        className="shrink-0 mt-0.5"
        style={{ color: 'var(--sf-primary)' }}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--sf-ink,#1a1a1a)]">
            {EVENEMENT_LABEL[e.type]}
          </span>
          <Badge variant={priorityBadgeVariant(e.priorite)}>
            {e.priorite}
          </Badge>
          {enRetard ? (
            <Badge variant="danger">{joursLabel}</Badge>
          ) : (
            <span className="text-xs text-[var(--sf-muted,#5C5346)] tabular-nums">
              {joursLabel}
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--sf-muted,#5C5346)] mt-1 truncate">
          <span className="font-medium text-[var(--sf-ink-secondary,#3F362A)]">
            {e.cible_label}
          </span>
          {' · '}
          {e.description}
        </div>
        <div className="text-[11px] text-[var(--sf-muted,#5C5346)] mt-0.5 font-mono tabular-nums">
          <FormattedDateTime date={e.date.toISOString()} />
        </div>
      </div>
      <Link
        href={e.href}
        className="shrink-0 inline-flex items-center text-xs font-medium text-[var(--sf-primary)] hover:underline mt-1"
      >
        Voir <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function SectionEvenements({
  title,
  evts,
  variant,
}: {
  title: string
  evts: EvenementPrevu[]
  variant: 'retard' | 'semaine' | 'quinzaine' | 'mois'
}) {
  if (evts.length === 0) return null

  const styleByVariant: Record<typeof variant, { headerBg: string; cardBorder: string }> = {
    retard: {
      headerBg: 'var(--sf-danger-bg,#F1D4CE)',
      cardBorder: 'var(--sf-danger-border,#7A2A1F)',
    },
    semaine: {
      headerBg: 'var(--sf-warning-bg,#F5E0B8)',
      cardBorder: 'var(--sf-warning-border,#A16207)',
    },
    quinzaine: {
      headerBg: 'var(--sf-success-bg,#D6E3CC)',
      cardBorder: 'var(--sf-success-border,#2D4A1F)',
    },
    mois: {
      headerBg: 'var(--sf-info-bg,#D6E2EE)',
      cardBorder: 'var(--sf-info-border,#1F3A55)',
    },
  }
  const st = styleByVariant[variant]

  return (
    <Card style={{ borderColor: st.cardBorder, borderWidth: '1px' }}>
      <CardHeader
        className="flex flex-row items-center justify-between pb-3"
        style={{ background: st.headerBg, borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}
      >
        <CardTitle className="eyebrow text-[13px] uppercase tracking-wider">
          {title}
        </CardTitle>
        <Badge variant="outline">{evts.length}</Badge>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="divide-y divide-[var(--sf-line,rgba(0,0,0,0.08))]">
          {evts.map((e) => (
            <CarteEvenement key={e.id} e={e} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function CalendrierPage() {
  const sb = await createClient()

  // 1) Saillies (toutes — pas de filtre statut, RLS isole la ferme)
  const { data: saillesRaw, error: errSaillies } = await sb
    .from('saillies')
    .select('id, truie_id, verrat_id, date_saillie, truie:truie_id(tag,nom)')
    .order('date_saillie', { ascending: false })

  // 2) Mises bas
  const { data: mbRaw, error: errMb } = await sb
    .from('mises_bas')
    .select('id, truie_id, saillie_id, date_mise_bas, truie:truie_id(tag,nom)')
    .order('date_mise_bas', { ascending: false })

  // 3) Sevrages
  const { data: sevRaw, error: errSev } = await sb
    .from('sevrages')
    .select('id, mb_id, truie_id, date_sevrage, truie:truie_id(tag,nom)')
    .order('date_sevrage', { ascending: false })

  // 4) Diagnostics gestation (pour masquer diag/echo déjà tranchés)
  const { data: diagsRaw } = await sb
    .from('diagnostics_gestation')
    .select('saillie_id, resultat, date_diag')

  // Best-effort : on log mais on continue avec []
  if (errSaillies) console.error('[calendrier] saillies error:', errSaillies.message)
  if (errMb) console.error('[calendrier] mises_bas error:', errMb.message)
  if (errSev) console.error('[calendrier] sevrages error:', errSev.message)

  const saillies = (saillesRaw ?? []) as unknown as SaillieRow[]
  const mb = (mbRaw ?? []) as unknown as MiseBasRow[]
  const sev = (sevRaw ?? []) as unknown as SevrageRow[]
  const diags = (diagsRaw ?? []) as unknown as DiagnosticGestationRow[]

  // Projection (today UTC pour stabilité)
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const evts = projeterTous(saillies, mb, sev, today, { diagnostics: diags })
  const buckets = bucketize(evts)

  const total =
    buckets.enRetard.length +
    buckets.cetteSemaine.length +
    buckets.ces14Jours.length +
    buckets.apresJ14.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--sf-ink,#1a1a1a)] flex items-center gap-2">
            <Calendar className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Calendrier prévisionnel
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Diagnostics, échographies, mises bas, sevrages, vaccins — projetés à partir des cycles physiologiques de la ferme.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right">
            <div className="text-xs text-[var(--sf-muted,#5C5346)] uppercase tracking-wider">
              30 prochains jours
            </div>
            <div className="text-2xl font-bold tabular-nums text-[var(--sf-primary,#2D4A1F)]">
              {total}
              <span className="text-sm font-normal text-[var(--sf-muted,#5C5346)] ml-1">
                évén.
              </span>
            </div>
          </div>
          <a
            href="/api/calendrier/ical"
            download="smartfarm-calendrier.ics"
            className="inline-flex"
          >
            <Button variant="outline" size="default">
              <Download className="h-4 w-4 mr-1.5" />
              Exporter iCal
            </Button>
          </a>
        </div>
      </div>

      {/* Sections */}
      {total === 0 ? (
        saillies.length === 0 && mb.length === 0 && sev.length === 0 ? (
          <EmptyOnboarding
            icon={<Calendar className="h-12 w-12" />}
            eyebrow="CALENDRIER PRÉVISIONNEL"
            title="Aucun cycle à projeter pour le moment"
            description="Dès que vous enregistrez une saillie, une mise bas ou un sevrage, le calendrier projette automatiquement les rendez-vous physiologiques (diagnostic gestation, échographie, mise bas, fer porcelets, sevrage, retour chaleurs)."
            cta={{ label: 'Enregistrer une saillie', href: '/reproduction?action=new' }}
            ctaSecondary={{ label: 'Voir le cheptel', href: '/cheptel' }}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-5xl mb-3">✓</div>
              <div className="text-lg font-semibold text-[var(--sf-primary,#2D4A1F)]">
                Tout est à jour
              </div>
              <div className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
                Aucun rendez-vous physiologique dans les 30 prochains jours.
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <SectionEvenements
            title="En retard"
            evts={buckets.enRetard}
            variant="retard"
          />
          <SectionEvenements
            title="Cette semaine (J0-J7)"
            evts={buckets.cetteSemaine}
            variant="semaine"
          />
          <SectionEvenements
            title="14 prochains jours (J8-J14)"
            evts={buckets.ces14Jours}
            variant="quinzaine"
          />
          <SectionEvenements
            title="Plus tard (J15-J30)"
            evts={buckets.apresJ14}
            variant="mois"
          />
        </>
      )}
    </div>
  )
}
