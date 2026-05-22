'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function RefreshKpiButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  async function handle() {
    setLoading(true)
    try {
      const token = process.env.NEXT_PUBLIC_DEMO_API_TOKEN ?? ''
      const res = await fetch('/api/kpi/refresh', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error('Échec du rafraîchissement', { description: json.error ?? '—' })
        return
      }
      toast.success('KPIs rafraîchis', {
        description: new Date(json.refreshed_at).toLocaleString('fr-FR'),
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
