'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { transfererTousVersCroissance } from './_server-actions'

/**
 * Phase 4.A — Banner affiché en haut de /cheptel?filter=pret_croissance
 * avec bouton CTA pour transfert en masse vers Croissance
 */
export function BannerTransfertCroissance({ count }: { count: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleTransferAll = () => {
    if (!confirm(`Transférer ${count} porcelet(s) vers le bâtiment Croissance ?`)) {
      return
    }

    startTransition(async () => {
      const res = await transfererTousVersCroissance()
      if (res.ok) {
        alert(`Transfert réussi : ${res.transfered} porcelet(s) transféré(s) vers Croissance`)
        router.push('/cheptel?tab=porcelets')
        router.refresh()
      } else {
        alert(`Erreur : ${res.error}`)
      }
    })
  }

  return (
    <div
      className="rounded-lg border px-5 py-4 flex items-start gap-4 flex-wrap"
      style={{
        background: 'var(--sf-info-bg, #D6E2EE)',
        borderColor: 'var(--sf-info-border, #8FA9C8)',
        color: 'var(--sf-info-ink, #1F3A55)',
      }}
    >
      <AlertCircle
        className="h-5 w-5 flex-shrink-0"
        style={{ color: 'var(--sf-info-ink, #1F3A55)' }}
      />
      <div className="flex-1 min-w-[200px]">
        <h3 className="font-semibold text-base mb-1">
          {count} porcelet{count > 1 ? 's' : ''} prêt{count > 1 ? 's' : ''} pour Croissance
        </h3>
        <p className="text-sm opacity-90">
          Ces porcelets ont atteint le poids de 24 kg. Règle métier : transférer vers le
          bâtiment Croissance.
        </p>
      </div>
      <button
        type="button"
        onClick={handleTransferAll}
        disabled={isPending}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--sf-accent, #A16207)',
          color: '#ffffff',
        }}
      >
        <ArrowRight className="h-4 w-4" />
        {isPending ? 'Transfert en cours...' : 'Transférer tous'}
      </button>
    </div>
  )
}
