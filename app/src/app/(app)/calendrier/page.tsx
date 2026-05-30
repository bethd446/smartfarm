import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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

// État visuel .ech dérivé du bucket temporel (présentation pure)
type EchState = 'late' | 'today' | 'soon'

function CarteEvenement({ e, etat }: { e: EvenementPrevu; etat: EchState }) {
  const Icon = ICON_BY_TYPE[e.type] ?? Calendar
  const enRetard = e.retard_jours > 0
  const aujourdhui = e.retard_jours === 0
  const joursLabel = enRetard
    ? `${e.retard_jours}j de retard`
    : aujourdhui
      ? "aujourd'hui"
      : `dans ${-e.retard_jours}j`

  return (
    <Link href={e.href} className={`ech ${etat} group no-underline`}>
      <span className="ed" aria-hidden />
      <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--ink-soft)]" aria-hidden />
      <span className="et min-w-0 flex-1">
        <b className="flex items-center gap-2 flex-wrap">
          <span className="truncate">{EVENEMENT_LABEL[e.type]}</span>
          <Badge variant={priorityBadgeVariant(e.priorite)}>{e.priorite}</Badge>
          {enRetard ? (
            <Badge variant="danger">{joursLabel}</Badge>
          ) : (
            <span className="text-[11px] font-normal text-[var(--mut)] tabular-nums">
              {joursLabel}
            </span>
          )}
        </b>
        <small className="block truncate">
          <span className="font-medium text-[var(--ink-soft)]">{e.cible_label}</span>
          {' · '}
          {e.description}
        </small>
        <small className="block tabular-nums">
          <FormattedDateTime date={e.date.toISOString()} />
        </small>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-[var(--mut)] transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
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

  // Bucket temporel → état visuel .ech (late rouge / today abricot / soon sage)
  const echByVariant: Record<typeof variant, EchState> = {
    retard: 'late',
    semaine: 'today',
    quinzaine: 'soon',
    mois: 'soon',
  }
  const etat = echByVariant[variant]

  return (
    <section className="pn">
      <div className="pn-h">
        <h3>{title}</h3>
        <span className="meta tabular-nums">{evts.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {evts.map((e) => (
          <CarteEvenement key={e.id} e={e} etat={etat} />
        ))}
      </div>
    </section>
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
          <h1 className="text-4xl font-bold tracking-tight text-[var(--ink)] flex items-center gap-2 font-[family-name:var(--disp)]">
            <Calendar className="h-7 w-7 text-[var(--sage)]" />
            Calendrier prévisionnel
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">
            Diagnostics, échographies, mises bas, sevrages, vaccins — projetés à partir des cycles physiologiques de la ferme.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right">
            <div className="text-xs text-[var(--mut)] uppercase tracking-wider">
              30 prochains jours
            </div>
            <div className="text-2xl font-bold tabular-nums text-[var(--sage)] font-[family-name:var(--disp)]">
              {total}
              <span className="text-sm font-normal text-[var(--mut)] ml-1">
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
          <div className="pn py-12 text-center">
            <div className="text-5xl mb-3 text-[var(--sage)]">✓</div>
            <div className="text-lg font-semibold text-[var(--sage)] font-[family-name:var(--disp)]">
              Tout est à jour
            </div>
            <div className="text-sm text-[var(--mut)] mt-1">
              Aucun rendez-vous physiologique dans les 30 prochains jours.
            </div>
          </div>
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
