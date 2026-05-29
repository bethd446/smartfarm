import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Alerte } from '@/lib/alertes-engine'
import { REGLES_ALERTES } from '@/lib/alertes-regles'
import { RelativeTime } from './relative-time'

/**
 * Smart Farm — Ligne d'alerte (registre dense)
 * Affiche : dot de gravité (sévérité par forme : plein/anneau/contour) +
 * titre + cible + date détection + description (line-clamp) + chevron si lien.
 *
 * Sévérité par FORME (cf DESIGN.md, registre conseiller) :
 *   critique → dot plein rouge       (urgence absolue)
 *   élevée   → anneau plein rouge    (contour épais)
 *   moyenne  → anneau ambre          (contour)
 *   info     → dot creux bleu        (discret)
 *
 * API stable : `{ alerte }` — `alertes-list.tsx` (read-only) superpose un
 * bouton snooze en absolu top-2/right-2. On garde donc le coin haut-droit
 * libre (`pr-28` réserve la place du bouton sur la ligne).
 */

/**
 * Retourne un libellé de CTA contextuel selon le type d'alerte.
 * Remplace le générique "Aller voir" par une action métier précise.
 */
function getCtaLabel(type: string): string {
  const t = type.toLowerCase()

  // Patterns spécifiques (ordre d'importance décroissant)
  if (t.includes('porcelets_pret_croissance')) return 'Voir liste à transférer'
  if (t.includes('porcelets_22_24kg') || t.includes('porcelets_anticipation_croissance')) return 'Voir liste'
  if (t.includes('portees_zombies')) return 'Nettoyer portées'
  if (t.includes('truies_vides')) return 'Surveiller truies'
  if (t.includes('colostrum')) return 'Vérifier colostrum'
  if (t.includes('sevrage')) return 'Traiter sevrage'
  if (t.includes('gestation') || t.includes('echo')) return 'Faire diag gestation'
  if (t.includes('chaleur')) return 'Vérifier chaleurs'
  if (t.includes('soins_porcelets') || t.includes('j3')) return 'Soins J3 porcelets'
  if (t.includes('transition')) return 'Transférer'
  if (t.includes('vaccin')) return 'Vacciner'

  // Fallback générique
  return 'Ouvrir alerte'
}

/**
 * FIX S5-L3 : la view `v_alertes_actives` n'expose PAS `lien_suggere` →
 * l'engine retombait sur `'#'` pour 100 % des alertes. On reconstruit ici
 * un lien contextuel à partir du `regle_id` (= `type` SQL) + de la cible.
 *
 * Retourne `null` si on n'a pas de destination crédible : le call-site
 * masque alors le CTA (pas de bouton mort).
 */
function computeLien(alerte: Alerte): string | null {
  // Lien déjà fourni par la BDD (cas legacy) → on respecte
  if (alerte.lien_suggere && alerte.lien_suggere !== '#') {
    return alerte.lien_suggere
  }

  const t = (alerte.regle_id ?? '').toLowerCase()

  // Colostrum J+1 → page check colostrum (formulaire existant)
  if (t.includes('colostrum')) {
    return '/mises-bas/check-j1'
  }
  // Sevrage à effectuer / planifier → page mises-bas (dialog Sevrage trigger)
  if (t.includes('sevrage')) {
    return '/mises-bas'
  }
  // Soins porcelets J3 → calendrier sanitaire
  if (t.startsWith('soins_porcelets') || t.includes('j3')) {
    return '/sanitaire/calendrier'
  }
  // R27 / R30 transfert Croissance
  if (t.includes('porcelets_pret_croissance') || t.includes('porcelets_anticipation_croissance')) {
    return '/cheptel?stade=demarrage'
  }
  // R28 truies vides post-sevrage
  if (t.includes('truies_vides')) {
    return '/cheptel?stade=truie_vide'
  }
  // R29 portées zombies → liste mises-bas
  if (t.includes('portees_zombies')) {
    return '/mises-bas'
  }
  // Chaleurs / diag / saillies
  if (t.includes('chaleur') || t.includes('retour_chaleurs')) {
    return '/reproduction/saillies'
  }
  if (t.includes('gestation') || t.includes('diag_gestation') || t.includes('echo')) {
    return '/reproduction/saillies'
  }
  if (t.includes('saillie')) {
    return '/reproduction/saillies'
  }
  if (t.includes('mise_bas') || t.includes('surveillance_mb') || t.includes('transfert_maternite')) {
    return '/mises-bas'
  }
  // Sanitaire générique
  if (t.includes('vaccin') || t.includes('traitement') || t.includes('vermifuge') || t.includes('fer_porcelet')) {
    return '/sanitaire/calendrier'
  }
  // Stock / nutrition
  if (t.startsWith('stock')) return '/stocks'
  if (t.startsWith('aliment') || t.includes('transition')) return '/alimentation/plans'
  if (t.startsWith('eau')) return '/sanitaire/eau'
  // Observations manuelles
  if (t === 'observation_manuelle' || t.startsWith('observation')) return '/alertes'
  // Cible animale connue : on tente la fiche
  if (alerte.cible_type === 'truie' || alerte.cible_type === 'animal' || alerte.cible_type === 'verrat') {
    if (alerte.cible_id) return `/cheptel/${alerte.cible_id}`
  }

  // Aucun lien crédible : le call-site masquera le CTA
  return null
}

const GRAVITE_LABEL: Record<Alerte['gravite'], string> = {
  critique: 'Critique',
  'élevée': 'Élevée',
  moyenne: 'Moyenne',
  info: 'Info',
}

/**
 * Sévérité par FORME (pas seulement couleur — DESIGN.md règle alertes).
 *   critique : disque plein rouge danger
 *   élevée   : anneau plein rouge (inset box-shadow épais, centre transparent)
 *   moyenne  : anneau ambre (inset box-shadow, centre transparent)
 *   info     : anneau bleu discret
 */
const GRAVITE_DOT: Record<Alerte['gravite'], CSSProperties> = {
  critique: { background: 'var(--sf-danger,#DC2626)' },
  'élevée': {
    background: 'transparent',
    boxShadow: 'inset 0 0 0 3px var(--sf-danger,#DC2626)',
  },
  moyenne: {
    background: 'transparent',
    boxShadow: 'inset 0 0 0 2px var(--sf-warning,#A16207)',
  },
  info: {
    background: 'transparent',
    boxShadow: 'inset 0 0 0 2px var(--sf-info-ink,#1F3344)',
  },
}

const CIBLE_LABEL: Record<Alerte['cible_type'], string> = {
  truie: 'Truie',
  verrat: 'Verrat',
  animal: 'Animal',
  bande: 'Bande',
  ferme: 'Ferme',
  matiere: 'Matière',
}

export function AlerteCard({ alerte }: { alerte: Alerte }) {
  const regle = REGLES_ALERTES?.[alerte.regle_id]
  const categorie = regle?.categorie
  const detecteLe = alerte.detecte_le instanceof Date
    ? alerte.detecte_le
    : new Date(alerte.detecte_le)

  // FIX S5-L3 : URL contextuelle (sinon CTA masqué — pas de lien mort)
  const lien = computeLien(alerte)
  const dotStyle = GRAVITE_DOT[alerte.gravite]
  const cibleTxt = alerte.cible_label || (lien ? 'Voir' : '—')

  // Contenu de ligne partagé (lien ↔ statique). `pr-28` réserve la place du
  // bouton snooze superposé par alertes-list.tsx (absolu top-2/right-2).
  const ligne = (
    <div className="flex items-start gap-3 md:gap-4 min-h-[44px] px-2 py-4 pr-28">
      {/* Dot gravité — sévérité par forme (plein / anneau / contour) */}
      <span
        className="shrink-0 mt-1.5 h-2.5 w-2.5 rounded-full"
        style={dotStyle}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        {/* Titre + métadonnées inline (gravité · catégorie) */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3
            className="text-[15px] md:text-base font-semibold leading-tight text-[var(--sf-ink)] tracking-[0.01em]"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            {alerte.titre}
          </h3>
          <span className="eyebrow text-[10px] text-[var(--sf-subtle,#6B6354)] capitalize">
            {GRAVITE_LABEL[alerte.gravite]}
            {categorie ? ` · ${categorie}` : ''}
          </span>
        </div>

        {/* Description */}
        <p className="mt-1 text-sm text-[var(--sf-muted)] line-clamp-2">
          {alerte.description}
        </p>

        {/* Cible + date détection */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--sf-subtle,#6B6354)]">
          <span className="eyebrow text-[10px]">
            {CIBLE_LABEL[alerte.cible_type]}
          </span>
          <span
            className={
              lien
                ? 'font-medium text-[var(--sf-primary,#2D4A1F)]'
                : 'font-medium text-[var(--sf-ink,#1a1a1a)]'
            }
          >
            {cibleTxt}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            <RelativeTime date={detecteLe} />
          </span>
        </div>
      </div>

      {/* Chevron — présent si lien (sinon ligne statique sans affordance) */}
      {lien && (
        <ChevronRight className="shrink-0 mt-1 h-4 w-4 text-[var(--sf-subtle)] group-hover:translate-x-0.5 transition-transform" />
      )}
    </div>
  )

  // Lien crédible → toute la ligne est cliquable (CTA implicite = getCtaLabel).
  if (lien) {
    return (
      <Link
        href={lien}
        aria-label={getCtaLabel(alerte.regle_id)}
        className="group block border-b border-[var(--sf-line)] transition-colors hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]"
      >
        {ligne}
      </Link>
    )
  }

  // Pas de lien → ligne statique (pas de bouton mort, pas de hover trompeur).
  return <div className="block border-b border-[var(--sf-line)]">{ligne}</div>
}
