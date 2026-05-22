import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Activity,
  Microscope,
  Pill,
  Shield,
  FileText,
  Scale,
  Stethoscope,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MALADIES_PORCINES,
  getMaladieBySlug,
  GRAVITE_BADGE_VARIANT,
  CATEGORIE_LABELS,
} from '@/lib/maladies-porcines'

// Pré-génération statique des 15 routes
export function generateStaticParams() {
  return MALADIES_PORCINES.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const m = getMaladieBySlug(slug)
  if (!m) return { title: 'Maladie inconnue — Smart Farm' }
  return {
    title: `${m.nom} — Catalogue maladies`,
    description: `Symptômes, diagnostic, traitement et prévention de ${m.nom} chez le porc.`,
  }
}

type SectionProps = {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-[var(--sf-ink,#1a1a1a)]">
          <span className="text-[var(--sf-primary,#2D4A1F)]">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[var(--sf-ink,#1a1a1a)] space-y-2">
        {children}
      </CardContent>
    </Card>
  )
}

export default async function MaladieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const m = getMaladieBySlug(slug)

  if (!m) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/sanitaire/maladies"
          className="inline-flex items-center gap-1 text-sm text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary,#2D4A1F)] transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--sf-ink,#1a1a1a)] flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
              {m.nom}
            </h1>
            <p className="text-sm italic text-[var(--sf-muted,#5C5346)] mt-1">
              {m.nom_scientifique}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant={GRAVITE_BADGE_VARIANT[m.gravite]}>
              Gravité {m.gravite}
            </Badge>
            <Badge variant="outline">{CATEGORIE_LABELS[m.categorie]}</Badge>
            <Badge variant="secondary">Contagiosité {m.contagiosite}</Badge>
          </div>
        </div>
      </div>

      {/* Méta-données */}
      <Card className="bg-[var(--sf-surface-2,#EFE7D6)]/50">
        <CardContent className="py-4">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--sf-muted,#5C5346)] font-semibold">
                Âge concerné
              </dt>
              <dd className="text-[var(--sf-ink,#1a1a1a)]">{m.age_concerne}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--sf-muted,#5C5346)] font-semibold">
                Catégorie
              </dt>
              <dd className="text-[var(--sf-ink,#1a1a1a)]">
                {CATEGORIE_LABELS[m.categorie]}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--sf-muted,#5C5346)] font-semibold">
                Contagiosité
              </dt>
              <dd className="text-[var(--sf-ink,#1a1a1a)] capitalize">
                {m.contagiosite}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Grille des sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Symptômes */}
        <Section icon={<Activity className="h-5 w-5" />} title="Symptômes">
          <ul className="list-disc list-inside space-y-1 marker:text-[var(--sf-primary,#2D4A1F)]">
            {m.symptomes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>

        {/* Diagnostic */}
        <Section icon={<Microscope className="h-5 w-5" />} title="Diagnostic">
          <div>
            <p className="font-medium text-[var(--sf-ink,#1a1a1a)] mb-1">
              Diagnostic différentiel :
            </p>
            <ul className="list-disc list-inside space-y-1 marker:text-[var(--sf-primary,#2D4A1F)]">
              {m.diagnostic_differentiel.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="pt-2">
            <p className="font-medium text-[var(--sf-ink,#1a1a1a)] mb-1">
              Examens recommandés :
            </p>
            <ul className="list-disc list-inside space-y-1 marker:text-[var(--sf-primary,#2D4A1F)]">
              {m.examens_recommandes.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Traitement */}
        <Section icon={<Pill className="h-5 w-5" />} title="Traitement">
          <div className="space-y-3">
            {m.traitement.map((t, i) => (
              <div
                key={i}
                className="rounded-md border border-[var(--sf-muted,#5C5346)]/20 p-3 bg-[var(--sf-bg,white)]"
              >
                <p className="font-semibold text-[var(--sf-ink,#1a1a1a)]">
                  {t.molecule}
                </p>
                <p className="text-xs text-[var(--sf-muted,#5C5346)] mt-1">
                  <span className="font-medium">Posologie :</span> {t.posologie}
                </p>
                <p className="text-xs text-[var(--sf-muted,#5C5346)]">
                  <span className="font-medium">Durée :</span> {t.duree}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Prévention */}
        <Section icon={<Shield className="h-5 w-5" />} title="Prévention">
          <ul className="list-disc list-inside space-y-1 marker:text-[var(--sf-primary,#2D4A1F)]">
            {m.prevention.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Réglementation CI */}
      <Section
        icon={<Scale className="h-5 w-5" />}
        title="Réglementation Côte d'Ivoire"
      >
        <p>{m.reglementation_ci}</p>
      </Section>

      {/* Notes terrain */}
      <Section
        icon={<FileText className="h-5 w-5" />}
        title="Notes terrain"
      >
        <p className="leading-relaxed">{m.notes_terrain}</p>
      </Section>

      {/* Footer sources */}
      <p className="text-xs text-[var(--sf-muted,#5C5346)] italic pt-4 border-t border-[var(--sf-muted,#5C5346)]/20">
        Sources : OIE/WOAH Manual of Diagnostic Tests, FAO EMPRES Animal
        Health, INRAE/IFIP Mémento de l&apos;éleveur de porc, CIRAD Précis
        de pathologie porcine tropicale. Outil d&apos;aide à la décision —
        toute prescription doit être validée par un vétérinaire agréé.
      </p>
    </div>
  )
}
