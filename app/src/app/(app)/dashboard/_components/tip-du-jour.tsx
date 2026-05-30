import Link from 'next/link'
import Image from 'next/image'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/server'

/**
 * Smart Farm — TipDuJour widget (C2-SCHEMA + V2-H polish)
 * -------------------------------------------------------------------------
 * Card "💡 Tip du jour" sur le dashboard avec image héro à gauche.
 * Tip pseudo-aléatoire mais déterministe par jour : tous les utilisateurs
 * voient le même tip le même jour (formule : tips[dayOfYear % total]).
 *
 * Résilient : si la table tips_conseiller n'existe pas encore ou est vide,
 * affiche un EmptyState propre.
 *
 * Visuel héro : l'image vient de /public/images/ds/icons/r1-*.webp. Mapping
 * catégorie → image thématique (fallback r1-mise-bas).
 */

const CATEGORIE_LABELS: Record<string, string> = {
  reproduction: 'Reproduction',
  sanitaire: 'Sanitaire',
  nutrition: 'Nutrition',
  conduite: 'Conduite',
  economique: 'Économique',
  installation: 'Installation',
}

const CATEGORIE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
> = {
  reproduction: 'info',
  sanitaire: 'danger',
  nutrition: 'success',
  conduite: 'secondary',
  economique: 'warning',
  installation: 'default',
}

/**
 * Mapping catégorie → image héro (assets r1-*.webp disponibles).
 * Choix thématique :
 *  - reproduction → saillie
 *  - sanitaire    → mortalité (signal sanitaire le plus fort)
 *  - nutrition    → stock-aliment
 *  - conduite     → regroupement
 *  - economique   → reforme-perf
 *  - installation → transition
 */
const CATEGORIE_IMAGE: Record<string, string> = {
  reproduction: '/images/ds/icons/r8-saillie.webp',
  sanitaire: '/images/ds/icons/r4-mortalite.webp',
  nutrition: '/images/ds/icons/r5-stock-aliment.webp',
  conduite: '/images/ds/icons/r6-regroupement.webp',
  economique: '/images/ds/icons/r11-reforme-perf.webp',
  installation: '/images/ds/icons/r15-transition.webp',
}

const FALLBACK_IMAGE = '/images/ds/icons/r1-mise-bas.webp'

/**
 * Mapping catégorie → fond de la zone héro (aplats sémantiques carnet).
 * Utilise les tokens success/warning/danger/info-bg quand pertinent.
 */
const CATEGORIE_BG: Record<string, string> = {
  reproduction: 'var(--sf-info-bg, #D7E4F2)',
  sanitaire: 'var(--sf-danger-bg, #F1D4CE)',
  nutrition: 'var(--sf-success-bg, #DCE9CB)',
  conduite: 'var(--sf-surface-2, #F1ECE0)',
  economique: 'var(--sf-warning-bg, #F5E6C5)',
  installation: 'var(--sf-warm, #F5EBD9)',
}

/** Numéro du jour de l'année 1..366 (UTC pour stabilité). */
function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.floor((now - start) / 86_400_000)
}

const MAX_RESUME = 180

export async function TipDuJour() {
  const sb = await createClient()

  // Resilience : si la table n'existe pas, on dégrade en empty state.
  let total = 0
  let tips: Array<{
    slug: string
    titre: string
    categorie: string
    resume: string
  }> = []

  try {
    // 1) Compte total
    const { count } = await sb
      .from('tips_conseiller')
      .select('*', { count: 'exact', head: true })
    total = count ?? 0
  } catch {
    total = 0
  }

  if (total > 0) {
    // Index déterministe pour aujourd'hui
    const idx = dayOfYearUTC(new Date()) % total
    try {
      const { data } = await sb
        .from('tips_conseiller')
        .select('slug, titre, categorie, resume')
        .order('slug', { ascending: true })
        .range(idx, idx)
      tips = data ?? []
    } catch {
      tips = []
    }
  }

  const tip = tips[0]

  const eyebrowCls =
    "font-[family-name:var(--sf-font-display)] text-[11px] text-[var(--sf-muted)] font-bold"
  const seeAllCls =
    "inline-flex items-center min-h-[44px] py-2 px-1 -mx-1 text-[11px] font-bold text-[var(--sf-primary)] hover:underline"

  // Pas de tip → EmptyState dans une Card simple (pas de héro)
  if (!tip) {
    return (
      <Card className="h-full min-h-[320px]">
        <CardContent className="pt-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className={eyebrowCls}>
              <Lightbulb className="inline size-3 mr-1 -mt-0.5" aria-hidden />
              Tip du jour
            </h2>
            <Link href="/conseiller" className={seeAllCls}>
              Voir tous →
            </Link>
          </div>
          <EmptyState
            icon={Lightbulb}
            title="Conseiller en construction"
            description="Le catalogue de 300 conseils sera bientôt disponible."
            cta={{ label: 'Explorer le conseiller', href: '/conseiller' }}
          />
        </CardContent>
      </Card>
    )
  }

  // Tip présent → carte héro avec image à gauche, texte à droite
  const heroImage = CATEGORIE_IMAGE[tip.categorie] ?? FALLBACK_IMAGE
  const heroBg = CATEGORIE_BG[tip.categorie] ?? 'var(--sf-warm, #F5EBD9)'
  const resumeText =
    tip.resume.length > MAX_RESUME
      ? tip.resume.slice(0, MAX_RESUME).trimEnd() + '…'
      : tip.resume

  return (
    <Card className="h-full min-h-[320px] overflow-hidden">
      <div className="grid h-full grid-cols-1 md:grid-cols-[180px_1fr]">
        {/* Zone héro : aplat thématique + image r1-*.webp */}
        <div
          className="relative h-32 md:h-auto md:min-h-[320px] flex items-center justify-center"
          style={{ background: heroBg }}
          aria-hidden
        >
          <Image
            src={heroImage}
            alt=""
            width={140}
            height={140}
            className="object-contain p-4 max-h-full"
            priority={false}
          />
        </div>

        {/* Zone texte */}
        <div className="flex flex-col p-5">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className={eyebrowCls}>
              <Lightbulb className="inline size-3 mr-1 -mt-0.5" aria-hidden />
              Tip du jour
            </h2>
            <Link href="/conseiller" className={seeAllCls}>
              Voir tous →
            </Link>
          </div>

          <Badge
            variant={CATEGORIE_BADGE_VARIANT[tip.categorie] ?? 'secondary'}
            className="self-start mb-2"
          >
            {CATEGORIE_LABELS[tip.categorie] ?? tip.categorie}
          </Badge>

          <Link
            href={`/conseiller/${tip.slug}`}
            className="block text-base font-semibold text-[var(--sf-ink)] hover:underline leading-tight mb-2"
          >
            {tip.titre}
          </Link>

          <p className="text-sm text-[var(--sf-muted)] leading-relaxed flex-1">
            {resumeText}
          </p>

          <Link
            href={`/conseiller/${tip.slug}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sf-primary)] hover:underline mt-3"
          >
            Lire le conseil
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default TipDuJour
