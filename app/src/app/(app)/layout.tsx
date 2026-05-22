import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'

/**
 * Layout serveur du groupe (app).
 *
 * V2-G : on fetch ici (SSR) le count d'alertes actives depuis `v_alertes_actives`
 * pour alimenter le badge du slot Alertes de la bottom-nav mobile.
 * Sur erreur DB on fallback à 0 — on ne casse pas le rendu de la chrome.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let alertesCount = 0
  try {
    const sb = await createClient()
    const { count, error } = await sb
      .from('v_alertes_actives')
      .select('*', { count: 'exact', head: true })
    if (!error && typeof count === 'number') {
      alertesCount = count
    }
  } catch {
    // Silencieux : la chrome ne doit jamais casser le rendu de l'app.
    alertesCount = 0
  }

  return <AppShell alertesCount={alertesCount}>{children}</AppShell>
}
