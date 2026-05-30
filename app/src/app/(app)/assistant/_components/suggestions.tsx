'use client'

import { Sparkles, Stethoscope, Wheat, Calculator, Bell, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Smart Farm — Suggestions d'amorce (C7-B)
 *
 * Affichées uniquement quand la conversation est vide, pour aider l'éleveur
 * à comprendre ce que l'assistant sait faire. Chaque chip déclenche un
 * `onPick(text)` qui pré-remplit l'input ou envoie directement le message.
 */

type Suggestion = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  prompt: string
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: Wheat,
    label: 'Ration porcs en croissance',
    prompt: 'Quelle ration pour mes porcs en croissance (30-60 kg) ?',
  },
  {
    icon: Stethoscope,
    label: 'Diarrhée porcelets',
    prompt: 'Comment diagnostiquer une diarrhée chez les porcelets ?',
  },
  {
    icon: Calculator,
    label: 'Coût formule maïs-soja',
    prompt: 'Combien coûte une formule maïs-soja en ce moment ?',
  },
  {
    icon: Sparkles,
    label: 'Protocole portée née aujourd’hui',
    prompt: 'Quels protocoles vaccinaux pour une portée née aujourd’hui ?',
  },
  {
    icon: Bell,
    label: 'Alertes prioritaires',
    prompt: 'Quelles sont mes alertes prioritaires ?',
  },
  {
    icon: ShieldAlert,
    label: 'Prévenir la PPA',
    prompt: 'Comment prévenir la peste porcine africaine ?',
  },
]

export function Suggestions({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {SUGGESTIONS.map((s) => {
        const Icon = s.icon
        return (
          <button
            key={s.prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.prompt)}
            className={cn(
              'group flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              'border-[var(--sf-border,#E5E0D8)] bg-[var(--sf-surface-1)] hover:bg-[var(--sf-surface-2)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <div className="shrink-0 h-8 w-8 rounded-md bg-[var(--sf-primary,#2D4A1F)]/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-[var(--sf-primary,#2D4A1F)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[var(--sf-muted,#5C5346)]">
                {s.label}
              </div>
              <div className="text-sm text-[var(--sf-ink,#1a1a1a)] mt-0.5 leading-snug">
                {s.prompt}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
