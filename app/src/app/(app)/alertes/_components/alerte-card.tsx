import Link from 'next/link'
import { AlertCircle, AlertTriangle, Info, Siren, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Alerte } from '@/lib/alertes-engine'
import { REGLES_ALERTES } from '@/lib/alertes-regles'
import { RelativeTime } from './relative-time'

/**
 * Smart Farm — Carte d'alerte individuelle
 * Affiche : badge gravité + titre + description + cible (lien) + date détection + CTA contextuel.
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

const GRAVITE_VARIANT: Record<
  Alerte['gravite'],
  'destructive' | 'danger' | 'warning' | 'info'
> = {
  critique: 'destructive',
  'élevée': 'danger',
  moyenne: 'warning',
  info: 'info',
}

const GRAVITE_LABEL: Record<Alerte['gravite'], string> = {
  critique: 'Critique',
  'élevée': 'Élevée',
  moyenne: 'Moyenne',
  info: 'Info',
}

const GRAVITE_ICON: Record<Alerte['gravite'], typeof AlertCircle> = {
  critique: Siren,
  'élevée': AlertTriangle,
  moyenne: AlertCircle,
  info: Info,
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
  const variant = GRAVITE_VARIANT[alerte.gravite]
  const Icon = GRAVITE_ICON[alerte.gravite]
  const regle = REGLES_ALERTES?.[alerte.regle_id]
  const detecteLe = alerte.detecte_le instanceof Date
    ? alerte.detecte_le
    : new Date(alerte.detecte_le)

  // FIX S5-L3 : URL contextuelle (sinon CTA masqué — pas de lien mort)
  const lien = computeLien(alerte)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icône gravité */}
          <div className="shrink-0">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{
                background:
                  alerte.gravite === 'critique' || alerte.gravite === 'élevée'
                    ? 'var(--sf-danger-bg, #F1D4CE)'
                    : alerte.gravite === 'moyenne'
                    ? 'var(--sf-warning-bg, #F5E0B8)'
                    : 'var(--sf-info-bg, #D6E2EE)',
                color:
                  alerte.gravite === 'critique' || alerte.gravite === 'élevée'
                    ? 'var(--sf-danger-ink, #7A2A1F)'
                    : alerte.gravite === 'moyenne'
                    ? 'var(--sf-warning-ink, #5A3E0E)'
                    : 'var(--sf-info-ink, #1F3A55)',
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={variant}>{GRAVITE_LABEL[alerte.gravite]}</Badge>
              {regle?.categorie && (
                <Badge variant="outline" className="capitalize">
                  {regle.categorie}
                </Badge>
              )}
              <span className="text-xs text-[var(--sf-muted,#5C5346)] eyebrow">
                <RelativeTime date={detecteLe} />
              </span>
            </div>

            <div>
              <div className="font-semibold text-[var(--sf-ink,#1a1a1a)]">
                {alerte.titre}
              </div>
              <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-0.5">
                {alerte.description}
              </p>
            </div>

            <div className="text-xs text-[var(--sf-muted,#5C5346)]">
              <span className="eyebrow text-[11px]">
                {CIBLE_LABEL[alerte.cible_type]} ·
              </span>{' '}
              {lien ? (
                <Link
                  href={lien}
                  className="inline-flex items-center min-h-11 py-2 font-medium text-[var(--sf-primary,#2D4A1F)] hover:underline"
                >
                  {alerte.cible_label || 'Voir'}
                </Link>
              ) : (
                <span className="inline-flex items-center min-h-11 py-2 font-medium text-[var(--sf-ink,#1a1a1a)]">
                  {alerte.cible_label || '—'}
                </span>
              )}
            </div>
          </div>

          {/* CTA — masqué si pas de lien crédible (pas de bouton mort) */}
          {lien && (
            <div className="shrink-0 sm:self-center">
              <Link href={lien} className="inline-flex">
                <Button variant="outline" size="default" className="min-h-11">
                  {getCtaLabel(alerte.regle_id)}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
