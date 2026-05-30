import { createClient } from '@/lib/supabase/server'
import { PageTitle } from '@/components/ui/page-title'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Stethoscope,
  CalendarClock,
  ShieldCheck,
  FlaskConical,
  Syringe,
  AlertTriangle,
  Activity,
  ChevronRight,
} from 'lucide-react'
import type { Metadata } from 'next'
import { MALADIES_PORCINES } from '@/lib/maladies-porcines'
import { SanitaireFab } from './_fab'
import { SanitaireStats } from './_components/sanitaire-stats'

export const metadata: Metadata = { title: 'Sanitaire' }

/**
 * V2-HARMONIE (HARM-A) — Hub sanitaire à 6 cards
 * -------------------------------------------------------------------------
 * Avant : page mixte (KPI + cards + tables) → trop chargée.
 * Après : hub net = 6 modules + 1 KPI rapide (alertes santé actives).
 *
 * Les pages /sanitaire/eau, /sanitaire/calendrier, etc. restent
 * accessibles par URL. Seule /sanitaire/eau est désactivée par redirect.
 */
export default async function SanitairePage() {
  const sb = await createClient()

  // KPI rapide : nombre d'alertes sanitaires actives
  const { count: alertesSantePending } = await sb
    .from('v_alertes_actives')
    .select('*', { count: 'exact', head: true })
    .in('regle_id', [
      'R06-porcelets-non-vaccines-J14',
      'R12-acte-sanitaire-en-retard',
      'R13-truie-anorexie',
      'R17-eau-chute-importante',
      'R18-lot-non-analyse',
      'R23-vermifuge-truie-pre-mb',
      'R24-fer-porcelet-j3',
      'R25-bcs-sevrage-bas',
    ])

  const { count: nbProtocoles } = await sb
    .from('protocoles_vaccinaux')
    .select('*', { count: 'exact', head: true })
    .eq('actif', true)

  const nbMaladies = MALADIES_PORCINES.length

  const modules: Array<{
    href: string
    icon: typeof CalendarClock
    title: string
    desc: string
    badge: { label: string; variant: 'danger' | 'warning' | 'success' | 'secondary' } | null
  }> = [
    {
      href: '/sanitaire/calendrier',
      icon: CalendarClock,
      title: 'Calendrier sanitaire',
      desc: 'Actes porcelets attendus (Fer, vaccins, sevrage) + protocoles à venir',
      badge: null,
    },
    {
      href: '/sanitaire/ppa',
      icon: AlertTriangle,
      title: 'PPA — Surveillance',
      desc: 'Peste Porcine Africaine — déclaration OIE/WOAH obligatoire',
      badge: { label: 'OBLIGATOIRE', variant: 'danger' },
    },
    {
      href: '/sanitaire/biosecurite',
      icon: ShieldCheck,
      title: 'Biosécurité',
      desc: 'Checklist 12 items + registre visiteurs avec audit',
      badge: null,
    },
    {
      href: '/sanitaire/mycotoxines',
      icon: FlaskConical,
      title: 'Mycotoxines',
      desc: 'Lots maïs/arachide/soja, analyses (Afla, ZEA, DON, OTA, FUM)',
      badge: { label: 'Saison pluies', variant: 'warning' },
    },
    {
      href: '/sanitaire/maladies',
      icon: Activity,
      title: 'Maladies',
      desc: `${nbMaladies} fiches maladies porcines (PPA, mycoplasmose, etc.)`,
      badge: null,
    },
    {
      href: '/sanitaire/protocoles',
      icon: Syringe,
      title: 'Protocoles vaccinaux',
      desc: `${nbProtocoles ?? 0} protocoles actifs (cochette, porcelet, truie, verrat)`,
      badge: null,
    },
    {
      href: '/sanitaire/actes',
      icon: Syringe,
      title: 'Actes sanitaires',
      desc: 'Enregistrer traitements véto + carnet MIRAH (délais attente viande)',
      badge: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <PageTitle
          eyebrow="SANTÉ"
          icon={<Stethoscope className="h-9 w-9 text-[var(--sf-primary)]" />}
          className="mb-1"
        >
          Sanitaire
        </PageTitle>
        <p className="text-sm text-[var(--sf-muted)]">
          Hub santé : {alertesSantePending ?? 0} alerte(s) sanitaire(s) active(s)
        </p>
      </div>

      <SanitaireStats />

      <section aria-labelledby="sanitaire-modules-titre">
        <h2
          id="sanitaire-modules-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-2 mb-3"
        >
          Modules sanitaires
        </h2>
        {/* Registre modules : liste dense hairline (ex-grille de cards identiques) */}
        <div className="border-t-2" style={{ borderTopColor: 'var(--sf-primary)' }}>
          <ul>
            {modules.map((m, i) => {
              const Icon = m.icon
              return (
                <li key={m.href} className="border-b border-[var(--sf-line)]">
                  <Link
                    href={m.href}
                    className="group flex items-center gap-3 min-h-[56px] px-2 py-3 transition-colors hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]"
                  >
                    <span
                      className="tabular-nums text-[var(--sf-subtle)] text-sm font-semibold shrink-0 w-6 text-right"
                      style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Icon className="h-6 w-6 shrink-0 text-[var(--sf-primary)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3
                          className="min-w-0 truncate text-[15px] font-semibold leading-tight tracking-[0.01em] text-[var(--sf-ink)]"
                          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                        >
                          {m.title}
                        </h3>
                        {m.badge && (
                          <Badge variant={m.badge.variant} className="shrink-0 ml-auto">
                            {m.badge.label}
                          </Badge>
                        )}
                      </div>
                      <p
                        className="mt-0.5 text-xs leading-snug text-[var(--sf-muted)] line-clamp-2 md:line-clamp-1"
                        style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
                      >
                        {m.desc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--sf-subtle)] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
      <SanitaireFab />
    </div>
  )
}
