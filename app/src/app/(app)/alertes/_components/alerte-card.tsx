import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertCircle, AlertTriangle, Info, Siren, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Alerte } from '@/lib/alertes-engine'
import { REGLES_ALERTES } from '@/lib/alertes-regles'

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
  if (t.includes('porcelets_22_24kg')) return 'Voir liste'
  if (t.includes('portees_zombies')) return 'Nettoyer portées'
  if (t.includes('truies_vides_8j')) return 'Surveiller truies'
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
              <span className="text-[11px] text-[var(--sf-muted,#5C5346)] eyebrow">
                il y a {formatDistanceToNow(detecteLe, { locale: fr })}
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
              <span className="eyebrow text-[10px]">
                {CIBLE_LABEL[alerte.cible_type]} ·
              </span>{' '}
              <Link
                href={alerte.lien_suggere}
                className="font-medium text-[var(--sf-primary,#2D4A1F)] hover:underline"
              >
                {alerte.cible_label}
              </Link>
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0 sm:self-center">
            <Link href={alerte.lien_suggere}>
              <Button variant="outline" size="sm">
                {getCtaLabel(alerte.regle_id)}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
