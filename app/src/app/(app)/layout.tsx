import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'

// LANE5 S5 — pose le template `<title>` pour toutes les routes (app).
// Sans ça, les pages internes héritaient du title racine ("Smart Farm —
// Gestion d'élevage · Côte d'Ivoire") même quand l'utilisateur naviguait
// sur /cheptel, /mises-bas, etc. Les routes qui définissent leur propre
// `metadata.title` (string) verront "%s — Smart Farm" appliqué automatiquement.
export const metadata: Metadata = {
  title: {
    template: '%s — Smart Farm',
    default: 'Smart Farm',
  },
}

// L2 Sprint 1 — bug cache sidebar :
// Après l'onboarding, le RSC du layout restait servi depuis le cache Next 16
// (et potentiellement LSCache côté Hostinger) → ferme=null persistait et la
// sidebar continuait d'afficher "Aucune ferme" malgré la création réussie.
// On force le rendu dynamique pour que chaque navigation refasse le fetch
// user/ferme depuis Supabase. Ceinture + bretelles avec revalidate=0.
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Layout serveur du groupe (app).
 *
 * V2-G : on fetch ici (SSR) le count d'alertes actives depuis `v_alertes_actives`
 * pour alimenter le badge du slot Alertes de la bottom-nav mobile.
 *
 * L2 Sprint 1 : on fetch également le user connecté + sa ferme principale pour
 * alimenter le bloc avatar/identité de la sidebar (fin du hardcode "Christophe
 * Liegeois / Yamoussoukro" qui s'affichait pour tous les comptes).
 *
 * Sur erreur DB on fallback proprement — on ne casse pas le rendu de la chrome.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let alertesCount = 0
  let user: {
    prenom: string | null
    nom: string | null
    role: string | null
    numero_client: string | null
    email: string | null
  } | null = null
  let ferme: { nom: string; localisation: string | null } | null = null

  try {
    const sb = await createClient()

    // 1. Count d'alertes actives (SSR badge bottom-nav)
    const { count, error: errAlertes } = await sb
      .from('v_alertes_actives')
      .select('*', { count: 'exact', head: true })
    if (!errAlertes && typeof count === 'number') {
      alertesCount = count
    }

    // 2. User connecté (auth) + profil
    const { data: { user: authUser } } = await sb.auth.getUser()
    if (authUser) {
      const { data: profil } = await sb
        .from('utilisateurs')
        .select('id, prenom, nom, role, numero_client, email')
        .eq('auth_id', authUser.id)
        .maybeSingle()

      if (profil) {
        user = {
          prenom: profil.prenom ?? null,
          nom: profil.nom ?? null,
          role: profil.role ?? null,
          numero_client: profil.numero_client ?? null,
          email: profil.email ?? authUser.email ?? null,
        }

        // 3. Ferme liée (première trouvée) — schéma GENESIS V2 = user_farms (vs ancien utilisateur_fermes)
        const { data: liaison } = await sb
          .from('user_farms')
          .select('fermes(nom, localisation)')
          .eq('user_id', authUser.id)
          .limit(1)
          .maybeSingle()

        const fermeData = (liaison as { fermes?: { nom: string; localisation: string | null } } | null)?.fermes
        if (fermeData?.nom) {
          ferme = { nom: fermeData.nom, localisation: fermeData.localisation ?? null }
        }
      } else {
        // Pas de profil utilisateurs : on dérive depuis auth.users uniquement
        user = {
          prenom: null,
          nom: null,
          role: null,
          numero_client: null,
          email: authUser.email ?? null,
        }
      }
    }
  } catch {
    // Silencieux : la chrome ne doit jamais casser le rendu de l'app.
  }

  return (
    <AppShell alertesCount={alertesCount} user={user} ferme={ferme}>
      {children}
    </AppShell>
  )
}
