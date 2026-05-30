'use client'

import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Smart Farm — Questions fréquentes du carnet de conseil
 * (refonte macrostructure 06 · Conversational FAQ)
 *
 * Registre FAQ honnête : chaque entrée EST une question terrain qui finit par
 * « ? ». Repliée par défaut ; à l'ouverture (accordéon 200 ms sur
 * grid-template-rows) elle expose l'angle de la réponse, puis une action
 * typographique « Demander au conseiller → » qui envoie la vraie question
 * dans le fil de conseil.
 *
 * Pas d'icône Sparkles, pas de tuile colorée, pas de chip chatbot : la
 * hiérarchie est portée par la typo (question en Big Shoulders) et le filet.
 */

type FrequentQuestion = {
  // La question telle que l'éleveur la formule (titre + prompt envoyé).
  question: string
  // L'angle de réponse — ce que le conseiller couvrira (honnête, pas un teaser).
  angle: string
  // Domaine zootechnique, en eyebrow.
  domaine: string
}

const QUESTIONS: FrequentQuestion[] = [
  {
    domaine: 'Alimentation',
    question: 'Quelle ration pour mes porcs en croissance (30-60 kg) ?',
    angle: 'Apport énergie/protéine, base maïs-soja, ajustement chaleur (>24 °C) et accès à l’eau.',
  },
  {
    domaine: 'Sanitaire — Porcelets',
    question: 'Comment diagnostiquer une diarrhée chez les porcelets ?',
    angle: 'Âge d’apparition, aspect des selles, déshydratation, pistes étiologiques et conduite à tenir.',
  },
  {
    domaine: 'Économie',
    question: 'Combien coûte une formule maïs-soja en ce moment ?',
    angle: 'Structure de coût au kg, part maïs/soja, leviers de substitution locale (FCFA).',
  },
  {
    domaine: 'Reproduction',
    question: 'Quels protocoles vaccinaux pour une portée née aujourd’hui ?',
    angle: 'Calendrier J0 → sevrage, fer injectable, vaccinations selon pression sanitaire de la bande.',
  },
  {
    domaine: 'Alertes',
    question: 'Quelles sont mes alertes prioritaires ?',
    angle: 'Lecture des signaux à traiter en premier : sanitaire, mises bas imminentes, sevrages dus.',
  },
  {
    domaine: 'Biosécurité — PPA',
    question: 'Comment prévenir la peste porcine africaine ?',
    angle: 'Cloisonnement, quarantaine d’entrée, désinfection, contrôle des intrants et des visiteurs.',
  },
]

export function Suggestions({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void
  disabled?: boolean
}) {
  // Une seule entrée ouverte à la fois — lecture terrain, pas de mur déplié.
  const [open, setOpen] = React.useState<number | null>(0)

  return (
    <section aria-label="Questions fréquentes" className="min-w-0">
      <style>{FAQ_CSS}</style>
      <header className="mb-1">
        <div className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.12em] text-[11px] font-bold text-[var(--sf-accent)]">
          Carnet de conseil
        </div>
        <p className="text-[13px] text-[var(--sf-muted)] mt-1 font-[family-name:var(--sf-font-body)] max-w-[60ch]">
          Les questions qui reviennent le plus en élevage porcin tropical.
          Ouvre-en une, ou écris la tienne en bas.
        </p>
      </header>

      <ul className="border-t border-[var(--sf-line)]">
        {QUESTIONS.map((q, i) => {
          const isOpen = open === i
          return (
            <li
              key={q.question}
              className="border-b border-[var(--sf-line)]"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className={cn(
                  'w-full text-left relative block py-3 pr-9 min-h-12',
                  'group/q transition-colors duration-150',
                  'hover:bg-[var(--sf-surface-1)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sf-focus)]',
                )}
              >
                {/* Eyebrow : ordinal + domaine, stack vertical (pas de tag-gauche/titre-droite) */}
                <span className="block font-[family-name:var(--sf-font-display)] uppercase tracking-[0.1em] text-[10px] font-bold text-[var(--sf-subtle)]">
                  <span className="font-[family-name:var(--sf-font-mono)] tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {' · '}
                  {q.domaine}
                </span>
                <span className="block font-[family-name:var(--sf-font-display)] text-[17px] leading-tight font-semibold text-[var(--sf-ink)] mt-0.5 min-w-0">
                  {q.question}
                </span>
                {/* Contrôle d'ouverture, ancré à droite — c'est une commande, pas un titre */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute right-0 top-3 font-[family-name:var(--sf-font-mono)] text-[var(--sf-muted)] text-[16px] leading-none w-5 text-center',
                    'transition-transform duration-200 sf-faq-ease',
                    isOpen && 'rotate-45',
                  )}
                >
                  +
                </span>
              </button>

              <div
                className={cn(
                  'grid sf-faq-ease transition-[grid-template-rows] duration-200',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <div className="pr-1 pb-3">
                    <p className="text-[14px] leading-relaxed text-[var(--sf-ink-secondary)] font-[family-name:var(--sf-font-body)] max-w-[62ch]">
                      {q.angle}
                    </p>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onPick(q.question)}
                      className={cn(
                        'mt-2 inline-flex items-center gap-1.5 min-h-12 py-1',
                        'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-[13px] font-bold',
                        'text-[var(--sf-primary)] underline decoration-[var(--sf-line)] underline-offset-4',
                        'hover:decoration-[var(--sf-primary)] transition-colors duration-150',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-focus)]',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline',
                      )}
                    >
                      Demander au conseiller
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const FAQ_CSS = `
.sf-faq-ease { transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
@media (prefers-reduced-motion: reduce) {
  .sf-faq-ease { transition-duration: 0ms !important; }
}
`
