'use server'

/**
 * R7-P1 V1 — Server Actions pour export CSV et registre PDF.
 *
 * Remplace les anciens appels client→API qui exposaient NEXT_PUBLIC_DEMO_API_TOKEN
 * dans le bundle browser. Désormais, le token reste 100% côté serveur.
 *
 * Conventions :
 * - Whitelist de tables identique à /api/export/[table]/route.ts
 * - CSV BOM UTF-8 + CRLF, séparateur point-virgule (Excel FR friendly)
 * - Retourne un Blob serialisé ({ filename, contentType, base64 }) au client
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'

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

export type ExportResult =
  | { ok: true; filename: string; contentType: string; base64: string }
  | { ok: false; error: string }

/**
 * exportTableCsv — Server Action qui retourne le CSV d'une table whitelistée.
 * Le client convertit base64→Blob et déclenche un download (cf. ExportButton).
 */
export async function exportTableCsv(table: string): Promise<ExportResult> {
  if (!ALLOWED_TABLES.has(table)) {
    return { ok: false, error: `Table non autorisée: ${table}` }
  }

  // SPRINT_2_FIX_RLS : export passe par RLS — un user n'exporte que sa ferme.
  const sb = await createClient()

  const { data, error } = await sb.from(table).select('*')
  if (error) return { ok: false, error: error.message }

  const rows = (data ?? []) as Record<string, unknown>[]
  const csv = '\ufeff' + toCSV(rows) + '\r\n'
  const today = new Date().toISOString().slice(0, 10)

  return {
    ok: true,
    filename: `${table}_${today}.csv`,
    contentType: 'text/csv; charset=utf-8',
    base64: Buffer.from(csv, 'utf-8').toString('base64'),
  }
}

/**
 * refreshKpiViews — Server Action qui appelle la RPC refresh_kpi_views.
 */
export async function refreshKpiViews(): Promise<
  { ok: true; refreshed_at: string } | { ok: false; error: string }
> {
  // SPRINT_2_FIX_RLS : refresh KPI MV = opération admin (cron) → service_role
  // explicite, justifiée (la RPC est SECURITY DEFINER côté Postgres et n'est
  // accessible que via service_role).
  let sb
  try {
    sb = await createServiceClient()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Service client KO' }
  }

  const { error } = await sb.rpc('refresh_kpi_views')
  if (error) return { ok: false, error: error.message }

  return { ok: true, refreshed_at: new Date().toISOString() }
}
