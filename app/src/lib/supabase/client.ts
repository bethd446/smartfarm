import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseClientEnv } from './env'

/**
 * Client Supabase pour le browser. Lit les NEXT_PUBLIC_* (qui DOIVENT être
 * inlinées au build pour que le bundle client puisse parler à Supabase).
 */
export function createClient() {
  const { url, anonKey } = getSupabaseClientEnv()
  return createBrowserClient(url, anonKey)
}
