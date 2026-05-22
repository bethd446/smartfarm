import { Card, CardContent } from '@/components/ui/card'
import { Syringe, Skull, AlertTriangle, Activity } from 'lucide-react'
import { getSanitaireStats } from '../calendrier/_queries'

/**
 * SanitaireStats — 4 KPI cards en haut de la page /sanitaire
 * Server Component : fait ses queries lui-même via getSanitaireStats().
 *   1. Couverture vaccinale (30j)
 *   2. Taux mortalité (30j)
 *   3. Actes sanitaires en retard
 *   4. Top cause mortalité (90j)
 */
export async function SanitaireStats() {
  const stats = await getSanitaireStats()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1 — Couverture vaccinale */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Syringe
              className="h-5 w-5"
              style={{ color: 'var(--sf-primary, #2D4A1F)' }}
            />
            <span
              className="eyebrow text-[10px]"
              style={{ color: 'var(--sf-muted, #5C5346)' }}
            >
              30 j
            </span>
          </div>
          <div
            className="text-3xl font-bold tabular-nums mt-2"
            style={{ color: 'var(--sf-ink, #1a1a1a)' }}
          >
            {stats.couvertureVaccinalePct == null
              ? '—'
              : `${stats.couvertureVaccinalePct} %`}
          </div>
          <div
            className="eyebrow text-[11px] mt-1"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            Couverture vaccinale
          </div>
          <div
            className="text-[11px] mt-1 tabular-nums"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            {stats.couvertureLabel}
          </div>
        </CardContent>
      </Card>

      {/* 2 — Taux mortalité 30j */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skull
              className="h-5 w-5"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            />
            <span
              className="eyebrow text-[10px]"
              style={{ color: 'var(--sf-muted, #5C5346)' }}
            >
              30 j
            </span>
          </div>
          <div
            className="text-3xl font-bold tabular-nums mt-2"
            style={{ color: 'var(--sf-ink, #1a1a1a)' }}
          >
            {stats.tauxMortalite30jPct == null
              ? '—'
              : `${stats.tauxMortalite30jPct} %`}
          </div>
          <div
            className="eyebrow text-[11px] mt-1"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            Taux mortalité
          </div>
          <div
            className="text-[11px] mt-1 tabular-nums"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            {stats.morts30j} / {stats.effectifMoyen} animaux
          </div>
        </CardContent>
      </Card>

      {/* 3 — Actes sanitaires en retard */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <AlertTriangle
              className="h-5 w-5"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            />
            <span
              className="eyebrow text-[10px]"
              style={{ color: 'var(--sf-muted, #5C5346)' }}
            >
              calendrier
            </span>
          </div>
          <div
            className="text-3xl font-bold tabular-nums mt-2"
            style={{ color: 'var(--sf-ink, #1a1a1a)' }}
          >
            {stats.actesEnRetard}
          </div>
          <div
            className="eyebrow text-[11px] mt-1"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            Actes en retard
          </div>
          <div
            className="text-[11px] mt-1"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            Vaccins / soins à rattraper
          </div>
        </CardContent>
      </Card>

      {/* 4 — Top cause mortalité 90j */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Activity
              className="h-5 w-5"
              style={{ color: 'var(--sf-info-ink, #1F3A55)' }}
            />
            <span
              className="eyebrow text-[10px]"
              style={{ color: 'var(--sf-muted, #5C5346)' }}
            >
              90 j
            </span>
          </div>
          <div
            className="text-xl font-bold mt-2 leading-tight line-clamp-2"
            style={{ color: 'var(--sf-ink, #1a1a1a)' }}
          >
            {stats.topCauseMortalite ?? 'Aucune perte'}
          </div>
          <div
            className="eyebrow text-[11px] mt-1"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            Cause principale
          </div>
          <div
            className="text-[11px] mt-1 tabular-nums"
            style={{ color: 'var(--sf-muted, #5C5346)' }}
          >
            {stats.topCauseMortalite
              ? `${stats.topCauseMortaliteCount} cas`
              : '—'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
