import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireApiToken } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const guard = requireApiToken(req)
  if (guard) return guard

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: 'Configuration Supabase manquante' },
      { status: 500 },
    )
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await sb.rpc('refresh_kpi_views')
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, refreshed_at: new Date().toISOString() })
}
