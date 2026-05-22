'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Smart Farm — Server Actions Authentification (R8)
 * -------------------------------------------------------------------------
 * Toutes les actions ci-dessous utilisent un client Supabase SSR EXPLICITE
 * (cookies-aware) — pas le wrapper `@/lib/supabase/server` qui peut basculer
 * en `service_role` en mode demo et n'écrit alors PAS les cookies de
 * session Auth nécessaires.
 *
 * Si SMARTFARM_DEMO_MODE=true, l'utilisateur arrive directement sur
 * /dashboard via le middleware (bypass). Ces pages restent accessibles
 * mais le middleware peut court-circuiter — comportement préservé.
 */

async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server component contexte — ignore (route handler set cookies)
          }
        },
      },
    },
  )
}

export type AuthResult =
  | { ok: true; message?: string; numero_client?: string | null }
  | { ok?: false; error: string }

// ---------------------------------------------------------------------------
// Login email/password OU numéro_client/password
// ---------------------------------------------------------------------------
export async function connexionAction(_prev: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const identifiant = String(formData.get('identifiant') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!identifiant || !password) {
    return { error: 'Identifiant et mot de passe requis' }
  }

  const sb = await createAuthClient()

  // Résolution numéro_client → email si format SF-XXXXXX
  let email = identifiant
  if (/^SF-\d{6}$/i.test(identifiant)) {
    const { data, error } = await sb.rpc('email_par_numero_client', {
      p_numero: identifiant.toUpperCase(),
    })
    if (error || !data) {
      return { error: 'Numéro client inconnu' }
    }
    email = data as string
  }

  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'Identifiant ou mot de passe incorrect' }
  }

  // Marquer la dernière connexion (best-effort, ne bloque pas le login)
  try { await sb.rpc('touch_derniere_connexion') } catch { /* ignore */ }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// Magic Link (passwordless) — utilisé pour le login alternatif ET la reset
// ---------------------------------------------------------------------------
export async function magicLinkAction(_prev: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email invalide' }
  }

  const sb = await createAuthClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  })
  if (error) {
    return { error: "Impossible d'envoyer le lien — réessaie dans un instant" }
  }
  return { ok: true, message: `Lien envoyé à ${email} — vérifie ta boîte mail (et les spams)` }
}

// ---------------------------------------------------------------------------
// Inscription — email + password + nom complet
// ---------------------------------------------------------------------------
export async function inscriptionAction(_prev: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const nom_complet = String(formData.get('nom_complet') ?? '').trim()

  if (!email || !password || !nom_complet) {
    return { error: 'Tous les champs sont requis' }
  }
  if (password.length < 8) {
    return { error: 'Le mot de passe doit faire au moins 8 caractères' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email invalide' }
  }

  const sb = await createAuthClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { nom_complet },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })
  if (error) {
    return { error: error.message }
  }

  // Le trigger SQL `on_auth_user_created` crée la ligne `utilisateurs` + numéro client.
  // On récupère le numéro pour l'afficher à l'éleveur.
  let numero_client: string | null = null
  if (data.user?.id) {
    const { data: row } = await sb
      .from('utilisateurs')
      .select('numero_client')
      .eq('auth_id', data.user.id)
      .maybeSingle()
    numero_client = (row?.numero_client as string | undefined) ?? null
  }

  return {
    ok: true,
    numero_client,
    message: numero_client
      ? `Compte créé. Ton numéro client : ${numero_client}. Garde-le précieusement — il permet de te connecter sans avoir à retenir ton email.`
      : 'Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.',
  }
}

// ---------------------------------------------------------------------------
// Déconnexion
// ---------------------------------------------------------------------------
export async function deconnexionAction(): Promise<void> {
  const sb = await createAuthClient()
  await sb.auth.signOut()
  redirect('/connexion')
}
