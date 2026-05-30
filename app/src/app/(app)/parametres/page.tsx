/* Hallmark · macrostructure: 13 Index-First · screen: /parametres · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P5 H5 E4 S5 R5 V5 */
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function ParametresPage() {
  const sb = await createClient()
  const [{ data: fermes }, { data: utilisateurs }, { data: regles }] = await Promise.all([
    sb.from('fermes').select('*'),
    sb.from('utilisateurs').select('*'),
    sb.from('regles_sevrage').select('*'),
  ])

  const fermesList = fermes ?? []
  const usersList = utilisateurs ?? []
  const reglesList = regles ?? []

  return (
    <div className="parametres-index max-w-3xl">
      {/* Intitulé d'index — pas de display monstre, juste l'en-tête de ce qui suit */}
      <header className="pb-[var(--sf-space-lg)]">
        <p
          className="eyebrow text-[var(--sf-subtle)]"
          style={{ fontFamily: 'var(--sf-font-display)' }}
        >
          Carnet d&apos;exploitation
        </p>
        <h1
          className="no-uppercase mt-[var(--sf-space-xs)] text-[1.75rem] leading-[1.1] tracking-[-0.01em] text-[var(--sf-ink)]"
          style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
        >
          Réglages
        </h1>
        <p className="mt-[var(--sf-space-sm)] max-w-[52ch] text-sm leading-[1.5] text-[var(--sf-muted)]">
          Les paramètres qui gouvernent l&apos;exploitation : fermes déclarées, comptes
          d&apos;accès, seuils de sevrage et registre officiel.
        </p>
      </header>

      {/* === 01 · Fermes === */}
      <IndexSection num="01" titre="Fermes" compte={fermesList.length} unite="déclarée">
        {fermesList.length === 0 ? (
          <EmptyRow message="Aucune ferme déclarée." />
        ) : (
          <ul className="divide-y divide-[var(--sf-line)]">
            {fermesList.map((f: any) => (
              <li
                key={f.id}
                className="index-row flex min-h-[var(--sf-touch-default)] items-center justify-between gap-[var(--sf-space-md)] py-[var(--sf-space-sm)]"
              >
                <div className="min-w-0">
                  <span className="block truncate font-medium text-[var(--sf-ink)]">{f.nom}</span>
                  <span className="block truncate font-mono text-xs text-[var(--sf-subtle)]">
                    {f.code} · {f.localisation}
                  </span>
                </div>
                <span
                  className="eyebrow shrink-0 whitespace-nowrap text-[var(--sf-terre)]"
                  style={{ fontFamily: 'var(--sf-font-display)' }}
                >
                  {f.type}
                </span>
              </li>
            ))}
          </ul>
        )}
      </IndexSection>

      {/* === 02 · Utilisateurs === */}
      <IndexSection num="02" titre="Utilisateurs" compte={usersList.length} unite="compte">
        {usersList.length === 0 ? (
          <EmptyRow message="Aucun compte d'accès." />
        ) : (
          <ul className="divide-y divide-[var(--sf-line)]">
            {usersList.map((u: any) => (
              <li
                key={u.id}
                className="index-row flex min-h-[var(--sf-touch-default)] items-center justify-between gap-[var(--sf-space-md)] py-[var(--sf-space-sm)]"
              >
                <div className="min-w-0">
                  <span className="block truncate font-medium text-[var(--sf-ink)]">
                    {u.prenom} {u.nom}
                  </span>
                  <span className="block truncate font-mono text-xs text-[var(--sf-subtle)]">
                    {u.email}
                  </span>
                </div>
                <span
                  className="eyebrow shrink-0 whitespace-nowrap text-[var(--sf-primary)]"
                  style={{ fontFamily: 'var(--sf-font-display)' }}
                >
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </IndexSection>

      {/* === 03 · Règles de sevrage === */}
      <IndexSection num="03" titre="Règles de sevrage" compte={reglesList.length} unite="seuil">
        {reglesList.length === 0 ? (
          <EmptyRow message="Aucun seuil de sevrage défini." />
        ) : (
          <ul className="divide-y divide-[var(--sf-line)]">
            {reglesList.map((r: any) => (
              <li
                key={r.id}
                className="index-row py-[var(--sf-space-sm)]"
              >
                <span className="block font-medium text-[var(--sf-ink)]">{r.nom}</span>
                <dl className="mt-[var(--sf-space-xs)] flex flex-wrap gap-x-[var(--sf-space-lg)] gap-y-[var(--sf-space-xs)] text-xs text-[var(--sf-muted)]">
                  <Seuil label="Âge min" valeur={r.age_min_jours} unite="j" />
                  <Seuil label="Âge max" valeur={r.age_max_jours} unite="j" />
                  <Seuil label="Poids min" valeur={r.poids_min_kg} unite="kg" />
                </dl>
              </li>
            ))}
          </ul>
        )}
      </IndexSection>

      {/* === 04 · Registre d'élevage — entrée terminale, action === */}
      <IndexSection num="04" titre="Registre d'élevage">
        <p className="max-w-[58ch] text-sm leading-[1.5] text-[var(--sf-muted)]">
          Document officiel récapitulant les mouvements de cheptel, la reproduction et les
          interventions sanitaires, du 1<sup>er</sup> du mois en cours à aujourd&apos;hui. Format A4
          prêt à imprimer ou à archiver.
        </p>
        {/* R7-P1 V1 : plus de token client-side ; route same-origin protégée par middleware en Phase 2 */}
        <a
          href="/api/registre"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[var(--sf-space-md)] inline-flex"
        >
          <Button variant="default">Télécharger le registre du mois</Button>
        </a>
      </IndexSection>

      <style>{`
        .parametres-index ul .index-row {
          margin-inline: calc(var(--sf-space-sm) * -1);
          padding-inline: var(--sf-space-sm);
          border-radius: var(--sf-radius-sm);
          transition: background-color 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (hover: hover) {
          .parametres-index ul .index-row:hover {
            background-color: var(--sf-surface-2);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .parametres-index ul .index-row { transition: none; }
        }
      `}</style>
    </div>
  )
}

/* — Une entrée d'index : numéro mono en gouttière, intitulé Big Shoulders, filet hairline, contenu en dessous — */
function IndexSection({
  num,
  titre,
  compte,
  unite,
  children,
}: {
  num: string
  titre: string
  compte?: number
  unite?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[var(--sf-line)] py-[var(--sf-space-lg)]">
      <div className="flex items-baseline gap-[var(--sf-space-md)]">
        {/* numéro = index ordinal volontaire (macrostructure Index-First), pas un eyebrow */}
        <span
          className="shrink-0 font-mono text-sm tabular-nums text-[var(--sf-subtle)]"
          aria-hidden="true"
        >
          {num}
        </span>
        <h2
          className="text-lg uppercase tracking-[0.04em] text-[var(--sf-ink)]"
          style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 600 }}
        >
          {titre}
        </h2>
        {typeof compte === 'number' && (
          <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-[var(--sf-subtle)]">
            {compte} {unite}
            {compte > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="mt-[var(--sf-space-md)] pl-[calc(2ch+var(--sf-space-md))]">{children}</div>
    </section>
  )
}

function Seuil({ label, valeur, unite }: { label: string; valeur: number; unite: string }) {
  return (
    <span className="inline-flex items-baseline gap-[var(--sf-space-xs)]">
      <span className="text-[var(--sf-subtle)]">{label}</span>
      <b className="font-semibold tabular-nums text-[var(--sf-ink)]">
        {valeur}&nbsp;{unite}
      </b>
    </span>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="py-[var(--sf-space-sm)] text-sm text-[var(--sf-muted)]">{message}</p>
  )
}
