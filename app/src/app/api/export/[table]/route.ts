import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireApiToken } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const ALLOWED_TABLES = new Set([
  'animaux',
  'bandes',
  'saillies',
  'mises_bas',
  'sevrages',
  'pesees',
  'vaccinations',
  'traitements',
  'mortalites',
  'matieres_premieres',
  'mouvements_stock',
  'departs',
])

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const str = JSON.stringify(value)
    return `"${str.replace(/"/g, '""')}"`
  }
  const str = String(value)
  if (/[";\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const head = headers.join(';')
  const lines = rows.map(r => headers.map(h => csvEscape(r[h])).join(';'))
  return [head, ...lines].join('\r\n')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  const guard = requireApiToken(req)
  if (guard) return guard

  const { table } = await params

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json(
      { error: `Table non autorisée: ${table}` },
      { status: 400 },
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Configuration Supabase manquante' },
      { status: 500 },
    )
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await sb.from(table).select('*')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as Record<string, unknown>[]
  const csv = '\ufeff' + toCSV(rows) + '\r\n'

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${table}_${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
