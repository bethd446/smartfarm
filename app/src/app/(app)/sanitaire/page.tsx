import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardDescription } from '@/components/ui/card'
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
} from 'lucide-react'
import type { Metadata } from 'next'
import { MALADIES_PORCINES } from '@/lib/maladies-porcines'
import { SanitaireFab } from './_fab'

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

      <section aria-labelledby="sanitaire-modules-titre">
        <h2
          id="sanitaire-modules-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-2 mb-3"
        >
          Modules sanitaires
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href} className="block">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="h-8 w-8 text-[var(--sf-primary)]" />
                    {m.badge && <Badge variant={m.badge.variant}>{m.badge.label}</Badge>}
                  </div>
                  <h3
                    data-slot="card-title"
                    className="mt-2 text-base leading-snug font-semibold tracking-[0.02em] text-[var(--sf-ink,#1a1a1a)]"
                    style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', system-ui, sans-serif)" }}
                  >
                    {m.title}
                  </h3>
                  <CardDescription>{m.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
        </div>
      </section>
      <SanitaireFab />
    </div>
  )
}
