import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './_form'

export const dynamic = 'force-dynamic'

/**
 * F1 Sprint 1 — Page d'onboarding (wizard 3 étapes).
 *
 * Server Component qui :
 *   - check si l'user est déjà onboardé → redirect /dashboard
 *   - sinon affiche le wizard client
 *
 * Stratégie redirect (vs layout-level) : voir _form.tsx + (app)/layout.tsx.
 * On s'appuie sur la bannière sidebar L2 "Aucune ferme" pour guider les
 * users non-onboardés ; le redirect global est complémentaire (renforcé
 * dans (app)/layout.tsx via header x-pathname middleware).
 */
export default async function OnboardingPage() {
  const sb = await createClient()

  // 1. Vérifie l'auth
  const { data: { user: authUser } } = await sb.auth.getUser()
  if (!authUser) {
    redirect('/connexion?next=/onboarding')
  }

  // 2. Charge le profil + état onboarding
  const { data: profil } = await sb
    .from('utilisateurs')
    .select('id, prenom, email, onboarded_at')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  // Si déjà onboardé ET déjà rattaché à une ferme → on saute l'étape
  if (profil?.onboarded_at) {
    const { count } = await sb
      .from('utilisateur_fermes')
      .select('*', { count: 'exact', head: true })
      .eq('utilisateur_id', profil.id)
    if (count && count > 0) {
      redirect('/dashboard')
    }
  }

  const prenomAffiche = profil?.prenom?.trim() || authUser.email?.split('@')[0] || 'éleveur'

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--paper)] py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <p className="eyebrow mb-2 text-[var(--mut)]">
            Configuration initiale
          </p>
          <h1 className="font-[family-name:var(--disp)] text-3xl md:text-4xl font-bold tracking-tight text-[var(--ink)]">
            Bienvenue, {prenomAffiche}
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-soft)] max-w-md mx-auto">
            Configurons votre exploitation porcine en 3 étapes. Vous pourrez tout
            modifier plus tard depuis <span className="font-medium text-[var(--ink)]">Paramètres</span>.
          </p>
        </header>

        <OnboardingForm />
      </div>
    </main>
  )
}
