'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { refreshKpiViews } from '@/lib/exports/server-actions'

/**
 * R7-P1 V1 — RefreshKpiButton via Server Action (plus de token client-side).
 */
export function RefreshKpiButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  async function handle() {
    setLoading(true)
    try {
      const res = await refreshKpiViews()
      if (!res.ok) {
        toast.error('Échec du rafraîchissement', { description: res.error })
        return
      }
      toast.success('KPIs rafraîchis', {
        description: new Date(res.refreshed_at).toLocaleString('fr-FR'),
      })
      startTransition(() => router.refresh())
    } catch (e) {
      toast.error('Erreur réseau', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Rafraîchissement…' : 'Rafraîchir les KPIs'}
    </Button>
  )
}
