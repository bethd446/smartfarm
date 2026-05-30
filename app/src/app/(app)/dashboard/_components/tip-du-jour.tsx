import Link from 'next/link'
import Image from 'next/image'
import { Lightbulb, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

/**
 * Smart Farm — Note d'atelier « Tip du jour » (pied du poste de travail)
 * -------------------------------------------------------------------------
 * Bande horizontale sobre (registre note d'atelier, PAS card-héro marketing).
 * Vignette image compacte à gauche, conseil dense à droite, lien d'ouverture.
 * Tip pseudo-aléatoire déterministe par jour : tips[dayOfYear % total].
 *
 * Résilient : si la table tips_conseiller n'existe pas / est vide,
 * affiche une note minimale sans héro.
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

/** Mapping catégorie → image héro (assets r1-*.webp disponibles). */
const CATEGORIE_IMAGE: Record<string, string> = {
  reproduction: '/images/ds/icons/r8-saillie.webp',
  sanitaire: '/images/ds/icons/r4-mortalite.webp',
  nutrition: '/images/ds/icons/r5-stock-aliment.webp',
  conduite: '/images/ds/icons/r6-regroupement.webp',
  economique: '/images/ds/icons/r11-reforme-perf.webp',
  installation: '/images/ds/icons/r15-transition.webp',
}

const FALLBACK_IMAGE = '/images/ds/icons/r1-mise-bas.webp'

/** Mapping catégorie → fond de la vignette (aplats sémantiques carnet). */
const CATEGORIE_BG: Record<string, string> = {
  reproduction: 'var(--sf-info-bg, #CDD9E3)',
  sanitaire: 'var(--sf-danger-bg, #F4CCC8)',
  nutrition: 'var(--sf-success-bg, #DCE9CB)',
  conduite: 'var(--sf-surface-2, #FEF3C7)',
  economique: 'var(--sf-warning-bg, #FBE7C4)',
  installation: 'var(--sf-warm, #FFFBEB)',
}

/** Numéro du jour de l'année 1..366 (UTC pour stabilité). */
function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.floor((now - start) / 86_400_000)
}

const MAX_RESUME = 150

export async function TipDuJour() {
  const sb = await createClient()

  let total = 0
  let tips: Array<{
    slug: string
    titre: string
    categorie: string
    resume: string
  }> = []

  try {
    const { count } = await sb
      .from('tips_conseiller')
      .select('*', { count: 'exact', head: true })
    total = count ?? 0
  } catch {
    total = 0
  }

  if (total > 0) {
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

  const panelLabel =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.16em] text-[var(--sf-muted)] font-bold'
  const openCls =
    'group/open inline-flex items-center gap-1 min-h-[44px] py-2 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline'

  // Pas de tip → note minimale, registre atelier
  if (!tip) {
    return (
      <div className="flex items-center justify-between gap-3 border border-[var(--sf-line)] bg-[var(--sf-surface-1)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Lightbulb className="size-4 shrink-0 text-[var(--sf-accent-deep)]" aria-hidden />
          <span className="text-sm text-[var(--sf-muted)]">
            <span className={panelLabel}>Conseil du jour</span>
            <span className="ml-2">Catalogue de conseils en construction.</span>
          </span>
        </div>
        <Link href="/conseiller" className={openCls}>
          Conseiller
          <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
        </Link>
      </div>
    )
  }

  const heroImage = CATEGORIE_IMAGE[tip.categorie] ?? FALLBACK_IMAGE
  const heroBg = CATEGORIE_BG[tip.categorie] ?? 'var(--sf-warm, #FFFBEB)'
  const resumeText =
    tip.resume.length > MAX_RESUME
      ? tip.resume.slice(0, MAX_RESUME).trimEnd() + '…'
      : tip.resume

  return (
    <div className="flex items-stretch gap-0 border border-[var(--sf-line)] bg-[var(--sf-surface-0)]">
      {/* Vignette compacte — aplat thématique + asset r*.webp */}
      <div
        className="relative hidden w-[88px] shrink-0 items-center justify-center border-r border-[var(--sf-line)] sm:flex"
        style={{ background: heroBg }}
        aria-hidden
      >
        <Image
          src={heroImage}
          alt=""
          width={56}
          height={56}
          className="object-contain p-2"
          priority={false}
        />
      </div>

      {/* Texte dense */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-3.5 shrink-0 text-[var(--sf-accent-deep)]" aria-hidden />
            <span className={panelLabel}>Conseil du jour</span>
            <Badge variant={CATEGORIE_BADGE_VARIANT[tip.categorie] ?? 'secondary'}>
              {CATEGORIE_LABELS[tip.categorie] ?? tip.categorie}
            </Badge>
          </div>
          <Link href="/conseiller" className={`${openCls} hidden sm:inline-flex`}>
            Conseiller
            <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
          </Link>
        </div>

        <Link
          href={`/conseiller/${tip.slug}`}
          className="text-[15px] font-semibold leading-tight text-[var(--sf-ink)] hover:underline"
        >
          {tip.titre}
        </Link>

        <p className="text-sm leading-snug text-[var(--sf-muted)]">{resumeText}</p>

        <Link
          href={`/conseiller/${tip.slug}`}
          className="group/open mt-0.5 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline"
        >
          Lire le conseil
          <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

export default TipDuJour
