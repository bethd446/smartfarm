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
  if (!m) return { title: 'Maladie inconnue' }
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
    <div className="pn h-full">
      <div className="pn-h">
        <h3 className="flex items-center gap-2 text-[var(--ink)]">
          <span className="text-[var(--sage-d)]">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="text-sm text-[var(--ink)] space-y-2">{children}</div>
    </div>
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
          className="inline-flex items-center gap-1 text-sm text-[var(--mut)] hover:text-[var(--sage-d)] transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)] flex items-center gap-2 font-[family-name:var(--disp)] tracking-[-0.02em]">
              <Stethoscope className="h-7 w-7 text-[var(--sage-d)]" />
              {m.nom}
            </h1>
            <p className="text-sm italic text-[var(--mut)] mt-1">
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
      <div className="pn bg-[var(--paper-3)]">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-[11px] text-[var(--mut)] font-semibold">
              Âge concerné
            </dt>
            <dd className="text-[var(--ink)] mt-1">{m.age_concerne}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--mut)] font-semibold">
              Catégorie
            </dt>
            <dd className="text-[var(--ink)] mt-1">
              {CATEGORIE_LABELS[m.categorie]}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--mut)] font-semibold">
              Contagiosité
            </dt>
            <dd className="text-[var(--ink)] capitalize mt-1">
              {m.contagiosite}
            </dd>
          </div>
        </dl>
      </div>

      {/* Grille des sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Symptômes */}
        <Section icon={<Activity className="h-5 w-5" />} title="Symptômes">
          <ul className="list-disc list-inside space-y-1 marker:text-[var(--sage-d)]">
            {m.symptomes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>

        {/* Diagnostic */}
        <Section icon={<Microscope className="h-5 w-5" />} title="Diagnostic">
          <div>
            <p className="font-medium text-[var(--ink)] mb-1">
              Diagnostic différentiel :
            </p>
            <ul className="list-disc list-inside space-y-1 marker:text-[var(--sage-d)]">
              {m.diagnostic_differentiel.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="pt-2">
            <p className="font-medium text-[var(--ink)] mb-1">
              Examens recommandés :
            </p>
            <ul className="list-disc list-inside space-y-1 marker:text-[var(--sage-d)]">
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
                className="rounded-[12px] border border-[var(--line2)] p-3 bg-[var(--paper)]"
              >
                <p className="font-semibold text-[var(--ink)]">
                  {t.molecule}
                </p>
                <p className="text-xs text-[var(--mut)] mt-1">
                  <span className="font-medium">Posologie :</span> {t.posologie}
                </p>
                <p className="text-xs text-[var(--mut)]">
                  <span className="font-medium">Durée :</span> {t.duree}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Prévention */}
        <Section icon={<Shield className="h-5 w-5" />} title="Prévention">
          <ul className="list-disc list-inside space-y-1 marker:text-[var(--sage-d)]">
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
      <p className="text-xs text-[var(--mut)] italic pt-4 border-t border-[var(--line)]">
        Sources : OIE/WOAH Manual of Diagnostic Tests, FAO EMPRES Animal
        Health, INRAE/IFIP Mémento de l&apos;éleveur de porc, CIRAD Précis
        de pathologie porcine tropicale. Outil d&apos;aide à la décision —
        toute prescription doit être validée par un vétérinaire agréé.
      </p>
    </div>
  )
}
