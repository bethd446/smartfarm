/* Hallmark · macrostructure: 14 Narrative Workflow · screen: /actions-rapides · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P5 H5 E5 S5 R4 V4 · contrast: pass (46-50) · slop: pass (51-55) · honest: pass (56) · tokens: pass (58) · responsive: pass (59) · icons: pass (60) · mobile: pass (36,59,61-69) */
import Link from 'next/link'
import {
  Sprout,
  ScanLine,
  Baby,
  Activity,
  Scale,
  Syringe,
  Skull,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Actions rapides — le cycle d'élevage en gestes 1-tap, présenté comme une
 * SÉQUENCE numérotée (Narrative Workflow). Chaque phase route vers son
 * formulaire pré-rempli via le `?action=` réel lu par la page cible.
 * Aucune route inventée : chaque href cible un handler vérifié.
 */

type Stage = {
  no: string
  href: string
  label: string
  hint: string
  icon: typeof Sprout
  tone: string
  arc: string
}

const STAGES: Stage[] = [
  {
    no: '1.0',
    href: '/reproduction?action=new',
    label: 'Saillie',
    hint: 'Déclarer une saillie · truie × verrat',
    icon: Sprout,
    tone: 'var(--sf-primary)',
    arc: 'Reproduction',
  },
  {
    no: '2.0',
    href: '/reproduction?action=diag',
    label: 'Diagnostic gestation',
    hint: 'Échographie · positif ou vide',
    icon: ScanLine,
    tone: 'var(--sf-primary)',
    arc: 'Reproduction',
  },
  {
    no: '3.0',
    href: '/mises-bas?action=new',
    label: 'Mise bas',
    hint: 'Enregistrer une portée',
    icon: Baby,
    tone: 'var(--sf-primary)',
    arc: 'Reproduction',
  },
  {
    no: '4.0',
    href: '/cheptel?action=bcs',
    label: 'BCS truie',
    hint: 'Note d’état corporel du jour',
    icon: Activity,
    tone: 'var(--sf-accent)',
    arc: 'Suivi du troupeau',
  },
  {
    no: '5.0',
    href: '/pesees?action=new',
    label: 'Pesée',
    hint: 'Saisir un poids · GMQ',
    icon: Scale,
    tone: 'var(--sf-accent)',
    arc: 'Suivi du troupeau',
  },
  {
    no: '6.0',
    href: '/sanitaire/actes',
    label: 'Soin',
    hint: 'Vaccin · traitement · véto',
    icon: Syringe,
    tone: 'var(--sf-terre)',
    arc: 'Sanitaire & sortie',
  },
  {
    no: '7.0',
    href: '/mortalites?action=new',
    label: 'Mortalité',
    hint: 'Déclarer une perte · cause',
    icon: Skull,
    tone: 'var(--sf-danger)',
    arc: 'Sanitaire & sortie',
  },
]

export default function ActionsRapidesPage() {
  let lastArc = ''

  return (
    <div className="ar-root max-w-2xl">
      <style>{`
        .ar-stage {
          opacity: 0;
          transform: translateX(-12px);
          animation: ar-sweep 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: calc(var(--ar-i, 0) * 55ms);
        }
        @keyframes ar-sweep {
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ar-stage {
            animation: ar-fade 150ms linear forwards;
            transform: none;
          }
          @keyframes ar-fade { to { opacity: 1; } }
        }
      `}</style>

      <header className="mb-8 border-b-2 border-[var(--sf-ink)] pb-4">
        <h1 className="font-[family-name:var(--sf-font-display)] text-4xl font-black uppercase tracking-[0.02em] text-[var(--sf-ink)] leading-[1.05] [overflow-wrap:anywhere]">
          Le cycle, geste par geste
        </h1>
        <p className="mt-3 max-w-[52ch] text-sm text-[var(--sf-muted)]">
          Sept étapes du cycle d&apos;élevage, dans l&apos;ordre. Chaque étape ouvre
          son formulaire pré-rempli, pensée pour être actionnée avec des gants.
        </p>
      </header>

      <ol className="ar-flow">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const arcChanged = stage.arc !== lastArc
          lastArc = stage.arc

          return (
            <li key={stage.href}>
              {arcChanged && (
                <p
                  className={cn(
                    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] font-bold text-[var(--sf-subtle)]',
                    i === 0 ? 'mb-3' : 'mt-8 mb-3',
                  )}
                >
                  {stage.arc}
                </p>
              )}

              <Link
                href={stage.href}
                style={{ ['--ar-i' as string]: i }}
                className={cn(
                  'ar-stage group relative flex items-center gap-4 py-4 pl-1',
                  'min-h-[64px] border-t border-[var(--sf-line)]',
                  'transition-[background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  'hover:bg-[var(--sf-surface-1)] active:bg-[var(--sf-surface-2)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sf-surface-0)]',
                )}
              >
                <span
                  className="font-[family-name:var(--sf-font-mono)] text-sm tabular-nums w-9 shrink-0 self-start pt-1 text-[var(--sf-subtle)]"
                  aria-hidden
                >
                  {stage.no}
                </span>

                <Icon
                  className="h-7 w-7 shrink-0 self-start mt-0.5"
                  style={{ color: stage.tone }}
                  aria-hidden
                />

                <span className="min-w-0 flex-1">
                  <span className="block font-[family-name:var(--sf-font-display)] text-2xl font-bold uppercase tracking-[0.01em] leading-[1.05] text-[var(--sf-ink)] [overflow-wrap:anywhere]">
                    {stage.label}
                  </span>
                  <span className="mt-1.5 block text-sm text-[var(--sf-muted)]">
                    {stage.hint}
                  </span>
                </span>

                <ArrowRight
                  className="h-5 w-5 shrink-0 text-[var(--sf-subtle)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:text-[var(--sf-primary)]"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ol>

      <p className="mt-6 border-t-2 border-[var(--sf-ink)] pt-4 text-xs text-[var(--sf-subtle)]">
        Démarrer au début du cycle&nbsp;:{' '}
        <Link
          href="/reproduction?action=new"
          className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.1em] font-bold text-[var(--sf-primary)] underline decoration-[var(--sf-line)] underline-offset-4 hover:decoration-[var(--sf-primary)]"
        >
          1.0 Saillie
        </Link>
      </p>
    </div>
  )
}
